import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';
import {
  AccionAuditoria,
  calcularDescuentoStockPack,
  CrearVentaDto,
  EstadoFinanciero,
  EstadoGeneral,
  EstadoLogistico,
  EstadoTurnoCaja,
  IAuditContext,
  TipoMovimientoCaja,
  TipoMovimientoCC,
  TipoPrecio,
  validarMargenCredito,
} from '@poslyon/domain-core';
import { POSLYON_DATA_SOURCE } from '../../../database/database.module';
import { AuditoriaService } from '../../auditoria/services/auditoria.service';
import { VentaEntity } from '../entities/venta.entity';
import { VentaDetalleEntity } from '../entities/venta-detalle.entity';
import { PagoVentaEntity } from '../entities/pago-venta.entity';

@Injectable()
export class VentasService {
  constructor(
    @Inject(POSLYON_DATA_SOURCE)
    private readonly dataSource: DataSource,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  /**
   * Crea y confirma una venta en mostrador de forma atómica (ACID / RF-01 / RF-05 / RF-17 / C-12).
   */
  async crearVenta(
    dto: CrearVentaDto,
    auditCtx: IAuditContext,
  ): Promise<VentaEntity> {
    const ventaId = randomUUID();

    return await this.auditoriaService.ejecutarTransaccionAuditada<VentaEntity>({
      auditContext: {
        ...auditCtx,
        accion: AccionAuditoria.CREACION,
        motivo: auditCtx.motivo || `Emisión de venta POS por $${dto.total}`,
      },
      tablaAfectada: 'VENTA',
      idRegistroAfectado: ventaId,
      obtenerSnapshotPrevio: async () => null,
      mutacion: async (manager) => {
        // 1. Regla RF-17: El turno de caja debe estar estrictamente ABIERTO
        const turnoRows = await manager.query(
          `SELECT id, estado FROM turno_caja WHERE id = $1`,
          [dto.id_turno_caja],
        );

        if (!turnoRows || turnoRows.length === 0) {
          throw new BadRequestException(
            `El turno de caja ${dto.id_turno_caja} no existe. No se puede emitir la venta.`,
          );
        }

        if (turnoRows[0].estado !== EstadoTurnoCaja.ABIERTO) {
          throw new BadRequestException(
            `El turno de caja ${dto.id_turno_caja} se encuentra ${turnoRows[0].estado}. Solo se pueden procesar ventas en turnos en estado ABIERTO (RF-17).`,
          );
        }

        // 2. Validación de consistencia de pagos (RF-05 Pagos Mixtos)
        const sumaPagos = dto.pagos.reduce((acc, p) => acc + Number(p.monto), 0);
        if (Math.abs(sumaPagos - dto.total) > 0.05) {
          throw new BadRequestException(
            `La suma de los medios de pago ($${sumaPagos}) no coincide con el total de la venta ($${dto.total}).`,
          );
        }

        // 3. Inspeccionar medios de pago utilizados
        const ahora = new Date().toISOString();
        const metodosPagoRows = await manager.query(`SELECT id, codigo, afecta_caja_fisica FROM metodo_pago`);
        const metodosMap = new Map<string, any>();
        metodosPagoRows.forEach((m: any) => metodosMap.set(m.id, m));

        // Detectar si hay pago fiado a cuenta corriente
        const pagoCC = dto.pagos.find((p) => {
          const m = metodosMap.get(p.id_metodo_pago);
          return m && m.codigo === 'CUENTA_CORRIENTE';
        });

        if (pagoCC) {
          if (!dto.id_cliente) {
            throw new BadRequestException(
              `Se requiere identificar al cliente (id_cliente) para procesar una venta con saldo a Cuenta Corriente (RF-05 / RF-07).`,
            );
          }

          const clienteRows = await manager.query(
            `SELECT id, nombre, limite_credito, saldo_deudor, version FROM cliente WHERE id = $1 AND activo = true`,
            [dto.id_cliente],
          );

          if (!clienteRows || clienteRows.length === 0) {
            throw new NotFoundException(`Cliente ${dto.id_cliente} no encontrado.`);
          }

          const cliente = clienteRows[0];
          const evaluacion = validarMargenCredito(
            Number(cliente.saldo_deudor),
            Number(cliente.limite_credito),
            Number(pagoCC.monto),
          );

          if (!evaluacion.aprobado) {
            throw new BadRequestException(
              `Límite de crédito superado para el cliente ${cliente.nombre}. Margen disponible: $${evaluacion.disponible}, monto fiado solicitado: $${pagoCC.monto}, exceso: $${evaluacion.exceso}.`,
            );
          }

          // Asentar asiento en el Libro Mayor (Signed Ledger +VENTA_CREDITO)
          const ccId = randomUUID();
          await manager.query(
            `INSERT INTO cuenta_corriente (
              id, id_cliente, id_venta, id_metodo_pago, id_turno_caja,
              id_usuario, monto, tipo_movimiento, concepto, saldo_resultante,
              fecha, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
            [
              ccId,
              dto.id_cliente,
              ventaId,
              pagoCC.id_metodo_pago,
              dto.id_turno_caja,
              dto.id_usuario,
              Number(pagoCC.monto), // Positivo (+deuda)
              TipoMovimientoCC.VENTA_CREDITO,
              `Cargo por venta fiada en mostrador`,
              evaluacion.nuevo_saldo_proyectado,
              ahora,
              ahora,
              ahora,
            ],
          );

          // Actualizar saldo deudor del cliente
          await manager.query(
            `UPDATE cliente SET
              saldo_deudor = $1,
              version = version + 1,
              updated_at = $2
            WHERE id = $3`,
            [evaluacion.nuevo_saldo_proyectado, ahora, dto.id_cliente],
          );
        }

        // 4. Detectar si hay pagos en efectivo que afecten la gaveta física (RF-17 / O-21)
        for (const p of dto.pagos) {
          const m = metodosMap.get(p.id_metodo_pago);
          const afectaCaja = m ? m.afecta_caja_fisica : false;

          if (afectaCaja) {
            const movId = randomUUID();
            await manager.query(
              `INSERT INTO movimiento_caja (
                id, id_turno_caja, id_metodo_pago, id_usuario,
                tipo_movimiento, monto, concepto, created_at, updated_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
              [
                movId,
                dto.id_turno_caja,
                p.id_metodo_pago,
                dto.id_usuario,
                TipoMovimientoCaja.INGRESO,
                Number(p.monto),
                `Cobro en efectivo - Venta en mostrador`,
                ahora,
                ahora,
              ],
            );
          }
        }

        // 5. Deducción de inventario (considerando Packs / O-26 y Stock Permisivo C-12)
        const detallesInsertados: VentaDetalleEntity[] = [];

        if (dto.items && dto.items.length > 0) {
          for (const item of dto.items) {
            const detId = randomUUID();

            // Consultar si el producto es un pack
            const prodRows = await manager.query(
              `SELECT id, id_producto_base, multiplicador_stock FROM producto_global WHERE id = $1`,
              [item.id_producto],
            );

            const prod = prodRows.length > 0 ? prodRows[0] : null;
            const descuentoInfo = calcularDescuentoStockPack({
              id_producto: item.id_producto,
              cantidad_vendida: item.cantidad,
              id_producto_base: prod ? prod.id_producto_base : null,
              multiplicador_stock: prod ? prod.multiplicador_stock : 1,
            });

            // Actualizar stock físico en sucursal (permite negativos C-12)
            await manager.query(
              `UPDATE producto_sucursal SET
                stock_fisico = stock_fisico - $1,
                version = version + 1,
                updated_at = $2
              WHERE id_producto_global = $3 AND id_sucursal = $4`,
              [
                descuentoInfo.cantidad_total_a_descontar,
                ahora,
                descuentoInfo.id_producto_objetivo,
                dto.id_sucursal,
              ],
            );

            // Insertar renglón de detalle
            const detRes = await manager.query(
              `INSERT INTO venta_detalle (
                id, id_venta, id_producto, cantidad, precio_unitario,
                id_promocion_aplicada, monto_descuento, tipo_precio,
                codigo_comodin, nombre_comodin, created_at, updated_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
              RETURNING *`,
              [
                detId,
                ventaId,
                item.id_producto,
                item.cantidad,
                item.precio_unitario,
                item.id_promocion_aplicada || null,
                item.monto_descuento || 0,
                item.tipo_precio || TipoPrecio.MINORISTA,
                item.codigo_comodin || null,
                item.nombre_comodin || null,
                ahora,
                ahora,
              ],
            );

            detallesInsertados.push(detRes[0]);
          }
        }

        // 6. Insertar pagos de la venta
        const pagosInsertados: PagoVentaEntity[] = [];
        for (const p of dto.pagos) {
          const pagoId = randomUUID();
          const pagoRes = await manager.query(
            `INSERT INTO pago_venta (id, id_venta, id_metodo_pago, monto, created_at)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [pagoId, ventaId, p.id_metodo_pago, Number(p.monto), ahora],
          );
          pagosInsertados.push(pagoRes[0]);
        }

        // 7. Generar número de comprobante correlativo e insertar cabecera de VENTA
        const countRows = await manager.query(
          `SELECT COUNT(id) as total FROM venta WHERE id_sucursal = $1`,
          [dto.id_sucursal],
        );
        const seq = (Number(countRows[0]?.total || 0) + 1).toString().padStart(8, '0');
        const numeroComprobante = `VTA-0001-${seq}`;

        const ventaRes = await manager.query(
          `INSERT INTO venta (
            id, id_sucursal, numero_comprobante, id_turno_caja, id_usuario,
            id_cliente, total, fecha, estado_general, estado_logistico,
            estado_financiero, tiene_devolucion_parcial, es_compartido,
            version, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 1, $14, $15)
          RETURNING *`,
          [
            ventaId,
            dto.id_sucursal,
            numeroComprobante,
            dto.id_turno_caja,
            dto.id_usuario,
            dto.id_cliente || null,
            dto.total,
            ahora,
            EstadoGeneral.CONFIRMADA,
            EstadoLogistico.ENTREGADO,
            EstadoFinanciero.PAGADO,
            false,
            false,
            ahora,
            ahora,
          ],
        );

        return {
          resultado: {
            ...ventaRes[0],
            detalles: detallesInsertados,
            pagos: pagosInsertados,
          } as VentaEntity,
          versionNueva: 1,
        };
      },
    });
  }

  /**
   * Obtiene una venta completa por su ID.
   */
  async obtenerVentaPorId(id: string): Promise<VentaEntity> {
    const rows = await this.dataSource.query(
      `SELECT * FROM venta WHERE id = $1`,
      [id],
    );

    if (!rows || rows.length === 0) {
      throw new NotFoundException(`Venta con ID ${id} no encontrada.`);
    }

    const detalles = await this.dataSource.query(
      `SELECT * FROM venta_detalle WHERE id_venta = $1 ORDER BY created_at ASC`,
      [id],
    );

    const pagos = await this.dataSource.query(
      `SELECT * FROM pago_venta WHERE id_venta = $1 ORDER BY created_at ASC`,
      [id],
    );

    return {
      ...rows[0],
      detalles,
      pagos,
    } as VentaEntity;
  }

  /**
   * Lista ventas con filtros por sucursal, turno de caja o cliente.
   */
  async listarVentas(filtros: {
    id_sucursal?: string;
    id_turno_caja?: string;
    id_cliente?: string;
  }): Promise<VentaEntity[]> {
    let sql = `SELECT * FROM venta WHERE 1=1`;
    const params: any[] = [];

    if (filtros.id_sucursal) {
      params.push(filtros.id_sucursal);
      sql += ` AND id_sucursal = $${params.length}`;
    }

    if (filtros.id_turno_caja) {
      params.push(filtros.id_turno_caja);
      sql += ` AND id_turno_caja = $${params.length}`;
    }

    if (filtros.id_cliente) {
      params.push(filtros.id_cliente);
      sql += ` AND id_cliente = $${params.length}`;
    }

    sql += ` ORDER BY fecha DESC LIMIT 100`;

    return await this.dataSource.query(sql, params);
  }
}
