import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  EstadoCuarentena,
  ReconciliacionDomainService,
  ResolverCuarentenaDto,
  AjustarStockManualDto,
  AccionAuditoria,
  IAuditContext,
} from '@poslyon/domain-core';
import { AlertaCuarentenaEntity } from '../entities/alerta-cuarentena.entity';
import { AuditoriaService } from '../../auditoria/services/auditoria.service';
import { CrearAlertaCuarentenaDto } from '../dtos/crear-alerta-cuarentena.dto';

@Injectable()
export class CuarentenaService {
  constructor(private readonly auditoriaService: AuditoriaService) {}

  async crearAlerta(
    dto: CrearAlertaCuarentenaDto,
    auditCtx: IAuditContext,
  ): Promise<AlertaCuarentenaEntity> {
    const idAlerta = randomUUID();

    return await this.auditoriaService.ejecutarTransaccionAuditada<AlertaCuarentenaEntity>({
      auditContext: {
        ...auditCtx,
        accion: AccionAuditoria.CREACION,
        motivo: auditCtx.motivo || `Reporte de alerta de cuarentena por faltante de ${dto.cantidad_faltante} unidades`,
      },
      tablaAfectada: 'ALERTA_CUARENTENA',
      idRegistroAfectado: idAlerta,
      obtenerSnapshotPrevio: async () => null,
      mutacion: async (manager) => {
        const rows = await manager.query(
          `INSERT INTO alerta_cuarentena (
            id, id_sucursal, id_producto, id_venta, id_usuario_reporta,
            cantidad_faltante, estado, observacion, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
          RETURNING *`,
          [
            idAlerta,
            dto.id_sucursal,
            dto.id_producto,
            dto.id_venta ?? null,
            auditCtx.userId,
            dto.cantidad_faltante,
            EstadoCuarentena.PENDIENTE,
            dto.observacion ?? null,
          ],
        );

        return { resultado: rows[0] };
      },
    });
  }

  async resolverCuarentena(
    dto: ResolverCuarentenaDto,
    auditCtx: IAuditContext,
  ): Promise<AlertaCuarentenaEntity> {
    return await this.auditoriaService.ejecutarTransaccionAuditada<AlertaCuarentenaEntity>({
      auditContext: {
        ...auditCtx,
        accion: AccionAuditoria.RESOLUCION_CUARENTENA,
        motivo: auditCtx.motivo || `Resolución de cuarentena: ${dto.estado_resolucion} - ${dto.observacion}`,
      },
      tablaAfectada: 'ALERTA_CUARENTENA',
      idRegistroAfectado: dto.id_alerta,
      obtenerSnapshotPrevio: async (manager) => {
        const rows = await manager.query(
          `SELECT * FROM alerta_cuarentena WHERE id = $1`,
          [dto.id_alerta],
        );
        return rows[0] || null;
      },
      mutacion: async (manager) => {
        const alertaRows = await manager.query(
          `SELECT * FROM alerta_cuarentena WHERE id = $1 FOR UPDATE`,
          [dto.id_alerta],
        );

        if (!alertaRows || alertaRows.length === 0) {
          throw new NotFoundException(
            `Alerta de cuarentena con id ${dto.id_alerta} no encontrada.`,
          );
        }

        const alerta = alertaRows[0];

        if (alerta.estado !== EstadoCuarentena.PENDIENTE) {
          throw new BadRequestException(
            `La alerta de cuarentena ya fue resuelta anteriormente con estado ${alerta.estado}.`,
          );
        }

        // Resolución C-23: Si se confirma merma, deducción no destructiva de la cantidad faltante
        if (dto.estado_resolucion === EstadoCuarentena.MERMA_CONFIRMADA) {
          const psRows = await manager.query(
            `SELECT * FROM producto_sucursal WHERE id_producto_global = $1 AND id_sucursal = $2 FOR UPDATE`,
            [alerta.id_producto, alerta.id_sucursal],
          );

          if (psRows && psRows.length > 0) {
            const ps = psRows[0];
            const stockActual = Number(ps.stock_fisico);
            const stockNuevo =
              ReconciliacionDomainService.calcularStockPostCuarentena(
                stockActual,
                Number(alerta.cantidad_faltante),
                EstadoCuarentena.MERMA_CONFIRMADA,
              );

            await manager.query(
              `UPDATE producto_sucursal SET stock_fisico = $1, version = version + 1 WHERE id = $2`,
              [stockNuevo, ps.id],
            );
          }
        }

        const updateRows = await manager.query(
          `UPDATE alerta_cuarentena
           SET estado = $1, observacion = $2, id_usuario_resuelve = $3, resolved_at = NOW()
           WHERE id = $4
           RETURNING *`,
          [
            dto.estado_resolucion,
            dto.observacion,
            auditCtx.userId,
            dto.id_alerta,
          ],
        );

        return { resultado: updateRows[0] };
      },
    });
  }

  async ajustarStockManual(
    dto: AjustarStockManualDto,
    auditCtx: IAuditContext,
  ): Promise<any> {
    return await this.auditoriaService.ejecutarTransaccionAuditada<any>({
      auditContext: {
        ...auditCtx,
        accion: AccionAuditoria.AJUSTE_STOCK,
        motivo: auditCtx.motivo || `Ajuste manual de stock [${dto.tipo_ajuste}]: ${dto.motivo}`,
      },
      tablaAfectada: 'PRODUCTO_SUCURSAL',
      idRegistroAfectado: dto.id_producto,
      obtenerSnapshotPrevio: async (manager) => {
        const rows = await manager.query(
          `SELECT * FROM producto_sucursal WHERE id_producto_global = $1 AND id_sucursal = $2`,
          [dto.id_producto, dto.id_sucursal],
        );
        return rows[0] || null;
      },
      mutacion: async (manager) => {
        const psRows = await manager.query(
          `SELECT * FROM producto_sucursal WHERE id_producto_global = $1 AND id_sucursal = $2 FOR UPDATE`,
          [dto.id_producto, dto.id_sucursal],
        );

        if (!psRows || psRows.length === 0) {
          throw new NotFoundException(
            `No se encontró el producto ${dto.id_producto} en la sucursal ${dto.id_sucursal}.`,
          );
        }

        const ps = psRows[0];

        if (Number(ps.version) !== dto.expected_version) {
          throw new ConflictException(
            `Conflicto OCC en PRODUCTO_SUCURSAL:${dto.id_producto}. La versión enviada (${dto.expected_version}) no coincide con la versión en BD (${ps.version}).`,
          );
        }

        const updateRows = await manager.query(
          `UPDATE producto_sucursal
           SET stock_fisico = $1, version = version + 1
           WHERE id = $2
           RETURNING *`,
          [dto.cantidad_nueva, ps.id],
        );

        return { resultado: updateRows[0] };
      },
    });
  }
}
