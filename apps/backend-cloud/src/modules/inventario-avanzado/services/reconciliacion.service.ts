import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';
import {
  UUID_ARTICULO_COMODIN,
  AccionReconciliacion,
  ReconciliacionDomainService,
  ReconciliarCodigoHuerfanoDto,
  IResultadoReconciliacion,
  ICodigoHuerfanoResumen,
  IDiscrepanciaRenglonReconciliacion,
  AccionAuditoria,
  IAuditContext,
} from '@poslyon/domain-core';
import { AuditoriaService } from '../../auditoria/services/auditoria.service';
import { POSLYON_DATA_SOURCE } from '../../../database/database.module';

@Injectable()
export class ReconciliacionService {
  constructor(
    @Inject(POSLYON_DATA_SOURCE)
    private readonly dataSource: DataSource,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  async obtenerCodigosHuerfanos(
    idSucursal: string,
  ): Promise<ICodigoHuerfanoResumen[]> {
    const renglones = await this.dataSource.query(
      `SELECT
        vd.id, vd.id_venta, vd.codigo_barra_leido, vd.nombre_producto_comodin,
        vd.cantidad, vd.precio_unitario, vd.subtotal, v.created_at
       FROM venta_detalle vd
       INNER JOIN venta v ON vd.id_venta = v.id
       WHERE vd.id_producto = $1 AND v.id_sucursal = $2`,
      [UUID_ARTICULO_COMODIN, idSucursal],
    );

    const agrupados = new Map<string, ICodigoHuerfanoResumen>();

    for (const r of renglones) {
      const clave = ReconciliacionDomainService.generarClaveAgrupamientoHuerfano(
        r.codigo_barra_leido,
        r.nombre_producto_comodin,
      );

      const cant = Number(r.cantidad);
      const sub = Number(r.subtotal);
      const fecha = r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString();

      if (!agrupados.has(clave)) {
        agrupados.set(clave, {
          clave_agrupamiento: clave,
          codigo_comodin: r.codigo_barra_leido || null,
          id_sucursal: idSucursal,
          nombre_comodin_frecuente:
            r.nombre_producto_comodin || r.codigo_barra_leido || 'SIN_NOMBRE',
          unidades_vendidas_historicas: cant,
          precio_promedio_cobrado: Number(r.precio_unitario),
          primera_venta: fecha,
          ultima_venta: fecha,
          total_facturado: sub,
        });
      } else {
        const item = agrupados.get(clave)!;
        item.unidades_vendidas_historicas = Number(
          (item.unidades_vendidas_historicas + cant).toFixed(4),
        );
        item.total_facturado = Number((item.total_facturado + sub).toFixed(2));
        item.precio_promedio_cobrado = Number(
          (item.total_facturado / item.unidades_vendidas_historicas).toFixed(2),
        );
        if (new Date(fecha) < new Date(item.primera_venta)) {
          item.primera_venta = fecha;
        }
        if (new Date(fecha) > new Date(item.ultima_venta)) {
          item.ultima_venta = fecha;
        }
      }
    }

    return Array.from(agrupados.values());
  }

  async reconciliarCodigoHuerfano(
    dto: ReconciliarCodigoHuerfanoDto,
    auditCtx: IAuditContext,
  ): Promise<IResultadoReconciliacion> {
    const registroKey = dto.codigo_comodin || dto.nombre_comodin || 'DESCONOCIDO';

    return await this.auditoriaService.ejecutarTransaccionAuditada<IResultadoReconciliacion>({
      auditContext: {
        ...auditCtx,
        accion: AccionAuditoria.RECONCILIACION_DISCREPANCIA,
        motivo: auditCtx.motivo || `Reconciliación de código huérfano (${dto.accion}): ${dto.nombre_oficial || dto.id_producto_existente}`,
      },
      tablaAfectada: 'RECONCILIACION_HUERFANO',
      idRegistroAfectado: registroKey,
      obtenerSnapshotPrevio: async () => null,
      mutacion: async (manager) => {
        // 1. Obtener renglones huérfanos a reconciliar en la sucursal
        let renglonesHuerfanos: any[];
        if (dto.codigo_comodin) {
          renglonesHuerfanos = await manager.query(
            `SELECT vd.* FROM venta_detalle vd
             INNER JOIN venta v ON vd.id_venta = v.id
             WHERE vd.id_producto = $1 AND v.id_sucursal = $2 AND vd.codigo_barra_leido = $3`,
            [UUID_ARTICULO_COMODIN, dto.id_sucursal, dto.codigo_comodin],
          );
        } else {
          renglonesHuerfanos = await manager.query(
            `SELECT vd.* FROM venta_detalle vd
             INNER JOIN venta v ON vd.id_venta = v.id
             WHERE vd.id_producto = $1 AND v.id_sucursal = $2 AND LOWER(TRIM(vd.nombre_producto_comodin)) = $3`,
            [UUID_ARTICULO_COMODIN, dto.id_sucursal, (dto.nombre_comodin || '').trim().toLowerCase()],
          );
        }

        const unidadesVendidasHistoricas = renglonesHuerfanos.reduce(
          (acc, r) => acc + Number(r.cantidad),
          0,
        );

        let idProductoOficial: string;
        let nombreOficial: string;
        let precioOficial: number;
        let stockInicialCalculado = 0;
        let stockFisicoResultante = 0;

        if (dto.accion === AccionReconciliacion.CREAR_NUEVO) {
          if (
            !dto.nombre_oficial ||
            !dto.id_categoria ||
            dto.precio_minorista === undefined ||
            dto.stock_fisico_actual === undefined
          ) {
            throw new BadRequestException(
              'Para CREAR_NUEVO se requiere nombre_oficial, id_categoria, precio_minorista y stock_fisico_actual.',
            );
          }

          idProductoOficial = randomUUID();
          nombreOficial = dto.nombre_oficial;
          precioOficial = dto.precio_minorista;

          // Insertar en producto_global
          await manager.query(
            `INSERT INTO producto_global (
              id, id_categoria, nombre, es_pesable, activo, version, created_at, updated_at
            ) VALUES ($1, $2, $3, false, true, 1, NOW(), NOW())`,
            [idProductoOficial, dto.id_categoria, nombreOficial],
          );

          // Si vino con código de barras, insertar en codigo_barra
          if (dto.codigo_comodin) {
            await manager.query(
              `INSERT INTO codigo_barra (id, id_producto_global, codigo_barra, es_principal)
               VALUES ($1, $2, $3, true)`,
              [randomUUID(), idProductoOficial, dto.codigo_comodin],
            );
          }

          // Cálculo matemático de Reconciliación (RF-13 / C-18)
          const calcStock =
            ReconciliacionDomainService.calcularStockInicialReconciliacion(
              dto.stock_fisico_actual,
              unidadesVendidasHistoricas,
            );
          stockInicialCalculado = calcStock.stock_inicial_calculado;
          stockFisicoResultante = calcStock.stock_final_post_deduccion;

          // Insertar en producto_sucursal
          await manager.query(
            `INSERT INTO producto_sucursal (
              id, id_producto_global, id_sucursal, precio_costo, precio_minorista,
              precio_mayorista, stock_fisico, stock_minimo, version
            ) VALUES ($1, $2, $3, 0, $4, $4, $5, 0, 1)`,
            [
              randomUUID(),
              idProductoOficial,
              dto.id_sucursal,
              precioOficial,
              stockFisicoResultante,
            ],
          );
        } else {
          // VINCULAR_EXISTENTE
          if (!dto.id_producto_existente) {
            throw new BadRequestException(
              'Para VINCULAR_EXISTENTE se requiere id_producto_existente.',
            );
          }

          const pgRows = await manager.query(
            `SELECT id, nombre FROM producto_global WHERE id = $1`,
            [dto.id_producto_existente],
          );
          if (!pgRows || pgRows.length === 0) {
            throw new NotFoundException(
              `Producto oficial ${dto.id_producto_existente} no encontrado.`,
            );
          }

          idProductoOficial = pgRows[0].id;
          nombreOficial = pgRows[0].nombre;

          const psRows = await manager.query(
            `SELECT * FROM producto_sucursal WHERE id_producto_global = $1 AND id_sucursal = $2 FOR UPDATE`,
            [idProductoOficial, dto.id_sucursal],
          );

          let psId = randomUUID();
          let stockActual = 0;
          let precioMinorista = 0;
          let versionActual = 1;

          if (psRows && psRows.length > 0) {
            psId = psRows[0].id;
            stockActual = Number(psRows[0].stock_fisico);
            precioMinorista = Number(psRows[0].precio_minorista);
            versionActual = Number(psRows[0].version);
          }

          precioOficial = precioMinorista;

          if (dto.stock_fisico_actual !== undefined) {
            const calcStock =
              ReconciliacionDomainService.calcularStockInicialReconciliacion(
                dto.stock_fisico_actual,
                unidadesVendidasHistoricas,
              );
            stockInicialCalculado = calcStock.stock_inicial_calculado;
            stockFisicoResultante = calcStock.stock_final_post_deduccion;
          } else {
            stockInicialCalculado = stockActual;
            stockFisicoResultante = Number(
              (stockActual - unidadesVendidasHistoricas).toFixed(4),
            );
          }

          if (psRows && psRows.length > 0) {
            await manager.query(
              `UPDATE producto_sucursal SET stock_fisico = $1, version = version + 1 WHERE id = $2`,
              [stockFisicoResultante, psId],
            );
          } else {
            await manager.query(
              `INSERT INTO producto_sucursal (
                id, id_producto_global, id_sucursal, precio_costo, precio_minorista,
                precio_mayorista, stock_fisico, stock_minimo, version
              ) VALUES ($1, $2, $3, 0, 0, 0, $4, 0, 1)`,
              [psId, idProductoOficial, dto.id_sucursal, stockFisicoResultante],
            );
          }
        }

        // 2. Reasignar renglones históricos de VENTA_DETALLE y calcular discrepancias financieras (C-21)
        const renglonesAuditados: IDiscrepanciaRenglonReconciliacion[] = [];
        let discrepanciaFinancieraNeta = 0;

        for (const renglon of renglonesHuerfanos) {
          await manager.query(
            `UPDATE venta_detalle SET id_producto = $1 WHERE id = $2`,
            [idProductoOficial, renglon.id],
          );

          const evaluacion =
            ReconciliacionDomainService.evaluarDiscrepanciaPrecioRenglon(
              Number(renglon.precio_unitario),
              precioOficial,
              Number(renglon.cantidad),
            );

          discrepanciaFinancieraNeta = Number(
            (discrepanciaFinancieraNeta + evaluacion.diferencia_total).toFixed(2),
          );

          renglonesAuditados.push({
            id_venta_detalle: renglon.id,
            cantidad: Number(renglon.cantidad),
            precio_cobrado: Number(renglon.precio_unitario),
            precio_oficial: precioOficial,
            diferencia_unitaria: evaluacion.diferencia_unitaria,
            diferencia_total: evaluacion.diferencia_total,
            tipo_discrepancia: evaluacion.tipo_discrepancia,
          });
        }

        return {
          resultado: {
            id_producto_oficial: idProductoOficial,
            nombre_oficial: nombreOficial,
            id_sucursal: dto.id_sucursal,
            unidades_historicas_vinculadas: unidadesVendidasHistoricas,
            stock_inicial_calculado: stockInicialCalculado,
            stock_fisico_resultante: stockFisicoResultante,
            discrepancia_financiera_neta: discrepanciaFinancieraNeta,
            renglones_auditados: renglonesAuditados,
          },
        };
      },
    });
  }
}
