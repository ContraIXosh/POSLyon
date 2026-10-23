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
  CrearDevolucionDto,
  DevolucionesDomainService,
  EstadoFinanciero,
  EstadoGeneral,
  EstadoTurnoCaja,
  IAuditContext,
  TipoDevolucion,
  TipoMovimientoCaja,
  TipoMovimientoCC,
} from '@poslyon/domain-core';
import { POSLYON_DATA_SOURCE } from '../../../database/database.module';
import { AuditoriaService } from '../../auditoria/services/auditoria.service';
import { NotaCreditoEntity } from '../entities/nota-credito.entity';
import { NotaCreditoDetalleEntity } from '../entities/nota-credito-detalle.entity';

@Injectable()
export class DevolucionesService {
  constructor(
    @Inject(POSLYON_DATA_SOURCE)
    private readonly dataSource: DataSource,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  /**
   * Emite una Nota de Crédito procesando una devolución desacoplada en el tiempo (RF-09 / RF-10 / RF-11).
   */
  async procesarDevolucion(
    dto: CrearDevolucionDto,
    auditCtx: IAuditContext,
  ): Promise<NotaCreditoEntity> {
    const ncId = randomUUID();

    return await this.auditoriaService.ejecutarTransaccionAuditada<NotaCreditoEntity>({
      auditContext: {
        ...auditCtx,
        accion: AccionAuditoria.DEVOLUCION_MERCADERIA,
        motivo: auditCtx.motivo || `Devolución s/ Venta ${dto.id_venta}: ${dto.motivo}`,
      },
      tablaAfectada: 'NOTA_CREDITO',
      idRegistroAfectado: ncId,
      obtenerSnapshotPrevio: async () => null,
      mutacion: async (manager) => {
        // 1. Validar que el turno de caja receptor esté ABIERTO (RF-17)
        const turnoRows = await manager.query(
          `SELECT id, estado FROM turno_caja WHERE id = $1`,
          [dto.id_turno_caja],
        );

        if (!turnoRows || turnoRows.length === 0) {
          throw new BadRequestException(`El turno de caja ${dto.id_turno_caja} no existe.`);
        }

        if (turnoRows[0].estado !== EstadoTurnoCaja.ABIERTO) {
          throw new BadRequestException(
            `El turno de caja ${dto.id_turno_caja} no está ABIERTO. Solo se pueden procesar devoluciones en turnos activos.`,
          );
        }

        // 2. Consultar venta original
        const ventaRows = await manager.query(
          `SELECT * FROM venta WHERE id = $1`,
          [dto.id_venta],
        );

        if (!ventaRows || ventaRows.length === 0) {
          throw new NotFoundException(`Venta original ${dto.id_venta} no encontrada.`);
        }

        const venta = ventaRows[0];
        if (venta.estado_general !== EstadoGeneral.CONFIRMADA) {
          throw new BadRequestException(
            `No se puede procesar devolución sobre una venta en estado ${venta.estado_general}.`,
          );
        }

        // Consultar renglones originales de la venta
        const detallesVentaRows = await manager.query(
          `SELECT * FROM venta_detalle WHERE id_venta = $1`,
          [dto.id_venta],
        );

        const mapaDetallesVenta = new Map<string, any>();
        detallesVentaRows.forEach((d: any) => mapaDetallesVenta.set(d.id_producto, d));

        // Consultar devoluciones previas registradas sobre esta venta (Control anti-doble devolución O-19)
        const prevDevRows = await manager.query(
          `SELECT ncd.id_producto, SUM(ncd.cantidad) as total_devuelto
           FROM nota_credito_detalle ncd
           JOIN nota_credito nc ON nc.id = ncd.id_nota_credito
           WHERE nc.id_venta = $1
           GROUP BY ncd.id_producto`,
          [dto.id_venta],
        );

        const mapaDevPrevias = new Map<string, number>();
        prevDevRows.forEach((r: any) => mapaDevPrevias.set(r.id_producto, Number(r.total_devuelto)));

        // 3. Procesar cada ítem devuelto calculando deducción proporcional de promociones (RF-09)
        const renglonesCalculados: any[] = [];
        let montoTotalDevolucion = 0;

        for (const item of dto.items) {
          const detVenta = mapaDetallesVenta.get(item.id_producto);
          if (!detVenta) {
            throw new BadRequestException(
              `El producto ${item.id_producto} no pertenece a los renglones de la venta original ${dto.id_venta}.`,
            );
          }

          const devueltaPrevia = mapaDevPrevias.get(item.id_producto) || 0;

          let calculoReembolso;
          try {
            // Servicio Puro de Dominio (RF-09 / C-04 / O-19)
            calculoReembolso = DevolucionesDomainService.calcularReembolsoNetoItem({
              cantidad_original: Number(detVenta.cantidad),
              precio_unitario_momento: Number(detVenta.precio_unitario),
              monto_descuento_total_original: Number(detVenta.monto_descuento || 0),
              cantidad_a_devolver: item.cantidad,
              cantidad_previa_devuelta: devueltaPrevia,
            });
          } catch (err: any) {
            throw new BadRequestException(err.message);
          }

          montoTotalDevolucion += calculoReembolso.subtotal_reembolso_neto;
          renglonesCalculados.push({
            id_producto: item.id_producto,
            cantidad: calculoReembolso.cantidad_devuelta,
            precio_unitario_momento: calculoReembolso.precio_unitario_momento,
            monto_descuento: calculoReembolso.monto_descuento_devuelto,
            subtotal: calculoReembolso.subtotal_reembolso_neto,
          });
        }

        montoTotalDevolucion = Number(montoTotalDevolucion.toFixed(2));

        // 4. Consultar datos de cliente si aplica para compensación financiera (RF-10)
        let saldoDeudorCliente = 0;
        let clienteNombre = '';

        if (venta.id_cliente) {
          const cliRows = await manager.query(
            `SELECT nombre, saldo_deudor FROM cliente WHERE id = $1`,
            [venta.id_cliente],
          );
          if (cliRows.length > 0) {
            saldoDeudorCliente = Number(cliRows[0].saldo_deudor);
            clienteNombre = cliRows[0].nombre;
          }
        }

        // 5. Motor de Compensación Financiera Pura (RF-10)
        let compensacion;
        try {
          compensacion = DevolucionesDomainService.calcularCompensacionFinanciera({
            tipo_devolucion_solicitado: dto.tipo_devolucion,
            monto_total_devolucion: montoTotalDevolucion,
            estado_financiero_venta: venta.estado_financiero,
            id_cliente: venta.id_cliente,
            saldo_deudor_cliente: saldoDeudorCliente,
            confirmar_sin_dinero: dto.confirmar_sin_dinero,
          });
        } catch (err: any) {
          throw new BadRequestException(err.message);
        }

        const ahora = new Date().toISOString();

        // 6. Impactar amortización de deuda en Cuenta Corriente si corresponde (Signed Ledger -AJUSTE_DEVOLUCION)
        if (compensacion.monto_compensado_deuda > 0 && venta.id_cliente) {
          const ccId = randomUUID();
          await manager.query(
            `INSERT INTO cuenta_corriente (
              id, id_cliente, id_nota_credito, id_turno_caja, id_usuario,
              monto, tipo_movimiento, concepto, saldo_resultante, fecha,
              created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
            [
              ccId,
              venta.id_cliente,
              ncId,
              dto.id_turno_caja,
              auditCtx.userId || null,
              -Math.abs(compensacion.monto_compensado_deuda), // Negativo reduce deuda
              TipoMovimientoCC.AJUSTE_DEVOLUCION,
              `Amortización por Nota de Crédito`,
              compensacion.nuevo_saldo_deudor_cliente,
              ahora,
              ahora,
              ahora,
            ],
          );

          await manager.query(
            `UPDATE cliente SET
              saldo_deudor = $1,
              version = version + 1,
              updated_at = $2
            WHERE id = $3`,
            [compensacion.nuevo_saldo_deudor_cliente, ahora, venta.id_cliente],
          );
        }

        // 7. Impactar egreso de dinero físico en gaveta de caja si corresponde (RF-17 / O-21)
        if (compensacion.monto_egreso_efectivo_caja > 0) {
          const movId = randomUUID();
          await manager.query(
            `INSERT INTO movimiento_caja (
              id, id_turno_caja, id_usuario, tipo_movimiento,
              monto, concepto, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              movId,
              dto.id_turno_caja,
              auditCtx.userId || null,
              TipoMovimientoCaja.EGRESO,
              compensacion.monto_egreso_efectivo_caja,
              `Reembolso en efectivo por Devolución`,
              ahora,
              ahora,
            ],
          );
        }

        // 8. Reingreso de mercadería física al stock de la sucursal (RF-11)
        for (const r of renglonesCalculados) {
          await manager.query(
            `UPDATE producto_sucursal SET
              stock_fisico = stock_fisico + $1,
              version = version + 1,
              updated_at = $2
            WHERE id_producto_global = $3 AND id_sucursal = $4`,
            [r.cantidad, ahora, r.id_producto, venta.id_sucursal],
          );
        }

        // 9. Generar correlativo fiscal e insertar cabecera de NOTA_CREDITO
        const countRows = await manager.query(`SELECT COUNT(id) as total FROM nota_credito`);
        const seq = (Number(countRows[0]?.total || 0) + 1).toString().padStart(8, '0');
        const numeroComprobante = `NC-0001-${seq}`;

        const ncRes = await manager.query(
          `INSERT INTO nota_credito (
            id, numero_comprobante, id_venta, id_cliente, id_usuario,
            id_turno_caja, monto_total, tipo_devolucion, motivo, fecha,
            created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          RETURNING *`,
          [
            ncId,
            numeroComprobante,
            dto.id_venta,
            venta.id_cliente || null,
            auditCtx.userId || null,
            dto.id_turno_caja,
            compensacion.monto_total_nota_credito,
            compensacion.tipo_devolucion_efectivo,
            dto.motivo.trim(),
            ahora,
            ahora,
            ahora,
          ],
        );

        // 10. Insertar renglones en NOTA_CREDITO_DETALLE
        const detallesInsertados: NotaCreditoDetalleEntity[] = [];
        for (const r of renglonesCalculados) {
          const detId = randomUUID();
          const detRes = await manager.query(
            `INSERT INTO nota_credito_detalle (
              id, id_nota_credito, id_producto, cantidad, precio_unitario_momento,
              monto_descuento, subtotal, devuelto_a_inventario, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8)
            RETURNING *`,
            [
              detId,
              ncId,
              r.id_producto,
              r.cantidad,
              r.precio_unitario_momento,
              r.monto_descuento,
              r.subtotal,
              ahora,
            ],
          );
          detallesInsertados.push(detRes[0]);
        }

        // 11. Marcar venta original con flag inmutable tiene_devolucion_parcial = true (RF-11)
        await manager.query(
          `UPDATE venta SET tiene_devolucion_parcial = true, updated_at = $1 WHERE id = $2`,
          [ahora, dto.id_venta],
        );

        return {
          resultado: {
            ...ncRes[0],
            detalles: detallesInsertados,
          } as NotaCreditoEntity,
        };
      },
    });
  }

  /**
   * Obtiene una Nota de Crédito por su UUID.
   */
  async obtenerNotaCreditoPorId(id: string): Promise<NotaCreditoEntity> {
    const rows = await this.dataSource.query(
      `SELECT * FROM nota_credito WHERE id = $1`,
      [id],
    );

    if (!rows || rows.length === 0) {
      throw new NotFoundException(`Nota de Crédito con ID ${id} no encontrada.`);
    }

    const detalles = await this.dataSource.query(
      `SELECT * FROM nota_credito_detalle WHERE id_nota_credito = $1 ORDER BY created_at ASC`,
      [id],
    );

    return {
      ...rows[0],
      detalles,
    } as NotaCreditoEntity;
  }

  /**
   * Lista notas de crédito emitidas.
   */
  async listarNotasCredito(idVenta?: string, idTurnoCaja?: string): Promise<NotaCreditoEntity[]> {
    let sql = `SELECT * FROM nota_credito WHERE 1=1`;
    const params: any[] = [];

    if (idVenta) {
      params.push(idVenta);
      sql += ` AND id_venta = $${params.length}`;
    }

    if (idTurnoCaja) {
      params.push(idTurnoCaja);
      sql += ` AND id_turno_caja = $${params.length}`;
    }

    sql += ` ORDER BY fecha DESC LIMIT 100`;
    return await this.dataSource.query(sql, params);
  }
}
