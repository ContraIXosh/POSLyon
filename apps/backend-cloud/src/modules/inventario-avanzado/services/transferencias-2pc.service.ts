import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  EstadoTransferenciaStock,
  AccionAuditoria,
  IAuditContext,
} from '@poslyon/domain-core';
import { AuditoriaService } from '../../auditoria/services/auditoria.service';
import { CrearTransferenciaDto } from '../dtos/crear-transferencia.dto';
import { DespacharTransferenciaDto } from '../dtos/despachar-transferencia.dto';
import { RecibirTransferenciaDto } from '../dtos/recibir-transferencia.dto';
import { CancelarTransferenciaDto } from '../dtos/cancelar-transferencia.dto';

@Injectable()
export class Transferencias2pcService {
  constructor(private readonly auditoriaService: AuditoriaService) {}

  async crear(
    dto: CrearTransferenciaDto,
    auditCtx: IAuditContext,
  ): Promise<any> {
    if (dto.id_sucursal_origen === dto.id_sucursal_destino) {
      throw new BadRequestException(
        'La sucursal de origen no puede ser idéntica a la sucursal de destino.',
      );
    }

    const idTransferencia = randomUUID();

    return await this.auditoriaService.ejecutarTransaccionAuditada<any>({
      auditContext: {
        ...auditCtx,
        accion: AccionAuditoria.CREACION,
        motivo: auditCtx.motivo || `Creación de orden de transferencia inter-sucursal`,
      },
      tablaAfectada: 'TRANSFERENCIA_STOCK',
      idRegistroAfectado: idTransferencia,
      obtenerSnapshotPrevio: async () => null,
      mutacion: async (manager) => {
        const rows = await manager.query(
          `INSERT INTO transferencia_stock (
            id, id_sucursal_origen, id_sucursal_destino, id_usuario_envia,
            estado, version, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, 1, NOW(), NOW())
          RETURNING *`,
          [
            idTransferencia,
            dto.id_sucursal_origen,
            dto.id_sucursal_destino,
            auditCtx.userId,
            EstadoTransferenciaStock.PENDIENTE_DESPACHO,
          ],
        );

        const detallesGuardados: any[] = [];
        for (const d of dto.detalles) {
          const detRows = await manager.query(
            `INSERT INTO transferencia_detalle (
              id, id_transferencia, id_producto, cantidad_enviada, created_at
            ) VALUES ($1, $2, $3, $4, NOW())
            RETURNING *`,
            [randomUUID(), idTransferencia, d.id_producto, d.cantidad_enviada],
          );
          detallesGuardados.push(detRows[0]);
        }

        const transferencia = {
          ...rows[0],
          detalles: detallesGuardados,
        };

        return { resultado: transferencia };
      },
    });
  }

  /**
   * Fase 1 del Protocolo 2PC (Prepare / Commit en Origen - RF-16):
   * Descuenta físicamente el stock de la sucursal de origen y pone la orden EN_TRANSITO.
   */
  async despachar(
    idTransferencia: string,
    dto: DespacharTransferenciaDto,
    auditCtx: IAuditContext,
  ): Promise<any> {
    return await this.auditoriaService.ejecutarTransaccionAuditada<any>({
      auditContext: {
        ...auditCtx,
        accion: AccionAuditoria.MODIFICACION,
        motivo: auditCtx.motivo || 'Fase 1 2PC: Despacho de mercadería y deducción en origen',
      },
      tablaAfectada: 'TRANSFERENCIA_STOCK',
      idRegistroAfectado: idTransferencia,
      obtenerSnapshotPrevio: async (manager) => {
        const rows = await manager.query(
          `SELECT * FROM transferencia_stock WHERE id = $1`,
          [idTransferencia],
        );
        return rows[0] || null;
      },
      mutacion: async (manager) => {
        const tRows = await manager.query(
          `SELECT * FROM transferencia_stock WHERE id = $1 FOR UPDATE`,
          [idTransferencia],
        );

        if (!tRows || tRows.length === 0) {
          throw new NotFoundException(
            `Transferencia ${idTransferencia} no encontrada.`,
          );
        }

        const transferencia = tRows[0];

        if (Number(transferencia.version) !== dto.expected_version) {
          throw new ConflictException(
            `Conflicto OCC en TRANSFERENCIA_STOCK:${idTransferencia}. Versión esperada ${dto.expected_version}, actual ${transferencia.version}.`,
          );
        }

        if (
          transferencia.estado !== EstadoTransferenciaStock.PENDIENTE_DESPACHO
        ) {
          throw new BadRequestException(
            `La transferencia debe estar en estado PENDIENTE_DESPACHO para ser despachada. Estado actual: ${transferencia.estado}.`,
          );
        }

        const detalles = await manager.query(
          `SELECT * FROM transferencia_detalle WHERE id_transferencia = $1`,
          [idTransferencia],
        );

        // Deducción en sucursal de origen
        for (const detalle of detalles) {
          const psRows = await manager.query(
            `SELECT * FROM producto_sucursal WHERE id_producto_global = $1 AND id_sucursal = $2 FOR UPDATE`,
            [detalle.id_producto, transferencia.id_sucursal_origen],
          );

          if (psRows && psRows.length > 0) {
            const ps = psRows[0];
            const stockNuevo = Number(
              (Number(ps.stock_fisico) - Number(detalle.cantidad_enviada)).toFixed(4),
            );
            await manager.query(
              `UPDATE producto_sucursal SET stock_fisico = $1, version = version + 1 WHERE id = $2`,
              [stockNuevo, ps.id],
            );
          } else {
            await manager.query(
              `INSERT INTO producto_sucursal (
                id, id_producto_global, id_sucursal, precio_costo, precio_minorista,
                precio_mayorista, stock_fisico, stock_minimo, version
              ) VALUES ($1, $2, $3, 0, 0, 0, $4, 0, 1)`,
              [
                randomUUID(),
                detalle.id_producto,
                transferencia.id_sucursal_origen,
                -Number(detalle.cantidad_enviada),
              ],
            );
          }
        }

        const updateRows = await manager.query(
          `UPDATE transferencia_stock
           SET estado = $1, fecha_envio = NOW(), version = version + 1, updated_at = NOW()
           WHERE id = $2
           RETURNING *`,
          [EstadoTransferenciaStock.EN_TRANSITO, idTransferencia],
        );

        return {
          resultado: {
            ...updateRows[0],
            detalles,
          },
        };
      },
    });
  }

  /**
   * Fase 2 del Protocolo 2PC (Commit en Destino - RF-16):
   * Concreta la recepción en destino sumando solo lo efectivamente recibido.
   * Si hay diferencia con lo enviado, marca DISCREPANCIA (Incondicionalidad Física O-18).
   */
  async recibir(
    idTransferencia: string,
    dto: RecibirTransferenciaDto,
    auditCtx: IAuditContext,
  ): Promise<any> {
    return await this.auditoriaService.ejecutarTransaccionAuditada<any>({
      auditContext: {
        ...auditCtx,
        accion: AccionAuditoria.MODIFICACION,
        motivo: auditCtx.motivo || 'Fase 2 2PC: Recepción de mercadería e incremento en destino',
      },
      tablaAfectada: 'TRANSFERENCIA_STOCK',
      idRegistroAfectado: idTransferencia,
      obtenerSnapshotPrevio: async (manager) => {
        const rows = await manager.query(
          `SELECT * FROM transferencia_stock WHERE id = $1`,
          [idTransferencia],
        );
        return rows[0] || null;
      },
      mutacion: async (manager) => {
        const tRows = await manager.query(
          `SELECT * FROM transferencia_stock WHERE id = $1 FOR UPDATE`,
          [idTransferencia],
        );

        if (!tRows || tRows.length === 0) {
          throw new NotFoundException(
            `Transferencia ${idTransferencia} no encontrada.`,
          );
        }

        const transferencia = tRows[0];

        if (Number(transferencia.version) !== dto.expected_version) {
          throw new ConflictException(
            `Conflicto OCC en TRANSFERENCIA_STOCK:${idTransferencia}. Versión esperada ${dto.expected_version}, actual ${transferencia.version}.`,
          );
        }

        if (transferencia.estado !== EstadoTransferenciaStock.EN_TRANSITO) {
          throw new BadRequestException(
            `La transferencia debe estar en estado EN_TRANSITO para ser recibida. Estado actual: ${transferencia.estado}.`,
          );
        }

        const detalles = await manager.query(
          `SELECT * FROM transferencia_detalle WHERE id_transferencia = $1`,
          [idTransferencia],
        );

        let hayDiscrepancia = false;
        const detallesActualizados: any[] = [];

        for (const detalle of detalles) {
          const recepcionItem = dto.detalles_recibidos.find(
            (r) => r.id_producto === detalle.id_producto,
          );

          const cantidadRecibida =
            recepcionItem !== undefined
              ? Number(recepcionItem.cantidad_recibida)
              : Number(detalle.cantidad_enviada);

          const estadoItem =
            recepcionItem?.estado_item ||
            (cantidadRecibida === Number(detalle.cantidad_enviada)
              ? 'CONFORME'
              : 'DISCREPANCIA');

          if (cantidadRecibida !== Number(detalle.cantidad_enviada)) {
            hayDiscrepancia = true;
          }

          const detUpdate = await manager.query(
            `UPDATE transferencia_detalle
             SET cantidad_recibida = $1, estado_item = $2
             WHERE id = $3
             RETURNING *`,
            [cantidadRecibida, estadoItem, detalle.id],
          );
          detallesActualizados.push(detUpdate[0]);

          // Sumar en destino SOLO lo físicamente recibido (Incondicionalidad Física O-18)
          const psRows = await manager.query(
            `SELECT * FROM producto_sucursal WHERE id_producto_global = $1 AND id_sucursal = $2 FOR UPDATE`,
            [detalle.id_producto, transferencia.id_sucursal_destino],
          );

          if (psRows && psRows.length > 0) {
            const ps = psRows[0];
            const stockNuevo = Number(
              (Number(ps.stock_fisico) + cantidadRecibida).toFixed(4),
            );
            await manager.query(
              `UPDATE producto_sucursal SET stock_fisico = $1, version = version + 1 WHERE id = $2`,
              [stockNuevo, ps.id],
            );
          } else {
            await manager.query(
              `INSERT INTO producto_sucursal (
                id, id_producto_global, id_sucursal, precio_costo, precio_minorista,
                precio_mayorista, stock_fisico, stock_minimo, version
              ) VALUES ($1, $2, $3, 0, 0, 0, $4, 0, 1)`,
              [
                randomUUID(),
                detalle.id_producto,
                transferencia.id_sucursal_destino,
                cantidadRecibida,
              ],
            );
          }
        }

        const estadoFinal = hayDiscrepancia
          ? EstadoTransferenciaStock.DISCREPANCIA
          : EstadoTransferenciaStock.COMPLETADA;

        const updateRows = await manager.query(
          `UPDATE transferencia_stock
           SET estado = $1, fecha_recepcion = NOW(), id_usuario_recibe = $2,
               motivo_discrepancia = $3, version = version + 1, updated_at = NOW()
           WHERE id = $4
           RETURNING *`,
          [
            estadoFinal,
            auditCtx.userId,
            hayDiscrepancia ? (dto.motivo_discrepancia || 'Diferencia en conteo físico') : null,
            idTransferencia,
          ],
        );

        return {
          resultado: {
            ...updateRows[0],
            detalles: detallesActualizados,
          },
        };
      },
    });
  }

  /**
   * Rollback / Cancelación de Transferencia (2PC Rollback):
   * Si la orden ya estaba despachada (EN_TRANSITO), devuelve el stock a la sucursal de origen.
   */
  async cancelar(
    idTransferencia: string,
    dto: CancelarTransferenciaDto,
    auditCtx: IAuditContext,
  ): Promise<any> {
    return await this.auditoriaService.ejecutarTransaccionAuditada<any>({
      auditContext: {
        ...auditCtx,
        accion: AccionAuditoria.MODIFICACION,
        motivo: auditCtx.motivo || `Cancelación de transferencia 2PC: ${dto.motivo}`,
      },
      tablaAfectada: 'TRANSFERENCIA_STOCK',
      idRegistroAfectado: idTransferencia,
      obtenerSnapshotPrevio: async (manager) => {
        const rows = await manager.query(
          `SELECT * FROM transferencia_stock WHERE id = $1`,
          [idTransferencia],
        );
        return rows[0] || null;
      },
      mutacion: async (manager) => {
        const tRows = await manager.query(
          `SELECT * FROM transferencia_stock WHERE id = $1 FOR UPDATE`,
          [idTransferencia],
        );

        if (!tRows || tRows.length === 0) {
          throw new NotFoundException(
            `Transferencia ${idTransferencia} no encontrada.`,
          );
        }

        const transferencia = tRows[0];

        if (Number(transferencia.version) !== dto.expected_version) {
          throw new ConflictException(
            `Conflicto OCC en TRANSFERENCIA_STOCK:${idTransferencia}. Versión esperada ${dto.expected_version}, actual ${transferencia.version}.`,
          );
        }

        if (
          transferencia.estado === EstadoTransferenciaStock.COMPLETADA ||
          transferencia.estado === EstadoTransferenciaStock.CANCELADA
        ) {
          throw new BadRequestException(
            `No se puede cancelar una transferencia que ya está ${transferencia.estado}.`,
          );
        }

        const detalles = await manager.query(
          `SELECT * FROM transferencia_detalle WHERE id_transferencia = $1`,
          [idTransferencia],
        );

        // Si estaba EN_TRANSITO, revertir stock a origen
        if (transferencia.estado === EstadoTransferenciaStock.EN_TRANSITO) {
          for (const detalle of detalles) {
            const psRows = await manager.query(
              `SELECT * FROM producto_sucursal WHERE id_producto_global = $1 AND id_sucursal = $2 FOR UPDATE`,
              [detalle.id_producto, transferencia.id_sucursal_origen],
            );

            if (psRows && psRows.length > 0) {
              const ps = psRows[0];
              const stockRestituido = Number(
                (Number(ps.stock_fisico) + Number(detalle.cantidad_enviada)).toFixed(4),
              );
              await manager.query(
                `UPDATE producto_sucursal SET stock_fisico = $1, version = version + 1 WHERE id = $2`,
                [stockRestituido, ps.id],
              );
            }
          }
        }

        const updateRows = await manager.query(
          `UPDATE transferencia_stock
           SET estado = $1, motivo_discrepancia = $2, version = version + 1, updated_at = NOW()
           WHERE id = $3
           RETURNING *`,
          [
            EstadoTransferenciaStock.CANCELADA,
            `CANCELADA: ${dto.motivo}`,
            idTransferencia,
          ],
        );

        return {
          resultado: {
            ...updateRows[0],
            detalles,
          },
        };
      },
    });
  }
}
