import {
  Injectable,
  NotFoundException,
  ConflictException,
  Inject,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';
import {
  SyncPushDto,
  SyncPullQueryDto,
  SyncCuentaCorrienteDeltaDto,
  ISyncPullResponse,
  UUID_SYSTEM_BOT,
  AccionAuditoria,
  IAuditContext,
  TipoMovimientoCC,
} from '@poslyon/domain-core';
import { AuditoriaService } from '../../auditoria/services/auditoria.service';
import { POSLYON_DATA_SOURCE } from '../../../database/database.module';

@Injectable()
export class SyncService {
  constructor(
    @Inject(POSLYON_DATA_SOURCE)
    private readonly dataSource: DataSource,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  /**
   * Procesa la subida masiva de deltas generados offline en la sucursal (RF-18 / O-25).
   * Aplica Merge Aditivo en Cuentas Corrientes (C-10) y política permisiva en stock (C-12).
   */
  async procesarPush(
    dto: SyncPushDto,
    auditCtx: IAuditContext,
  ): Promise<any> {
    const nodo = dto.nodo_destino || 'CLOUD_CENTRAL';

    return await this.auditoriaService.ejecutarTransaccionAuditada<any>({
      auditContext: {
        ...auditCtx,
        accion: AccionAuditoria.RESOLUCION_MERGE_OCC,
        motivo: auditCtx.motivo || `Sincronización Push desde sucursal ${dto.sucursal_id}`,
      },
      tablaAfectada: 'SYNC_CURSOR',
      idRegistroAfectado: dto.sucursal_id,
      obtenerSnapshotPrevio: async () => null,
      mutacion: async (manager) => {
        // 1. Actualizar o crear cursor temporal de sincronización (ISO-8601 UTC O-25)
        const cursorRows = await manager.query(
          `SELECT * FROM sync_cursor WHERE id_sucursal = $1 AND nodo_destino = $2`,
          [dto.sucursal_id, nodo],
        );

        if (cursorRows && cursorRows.length > 0) {
          await manager.query(
            `UPDATE sync_cursor
             SET last_pushed_at = NOW(), last_pulled_at = $1, updated_at = NOW()
             WHERE id = $2`,
            [dto.last_pulled_at, cursorRows[0].id],
          );
        } else {
          await manager.query(
            `INSERT INTO sync_cursor (
              id, id_sucursal, nodo_destino, last_pulled_at, last_pushed_at, schema_version, updated_at
            ) VALUES ($1, $2, $3, $4, NOW(), 1, NOW())`,
            [randomUUID(), dto.sucursal_id, nodo, dto.last_pulled_at],
          );
        }

        const changes = (dto.changes || {}) as Record<string, any>;
        let deltasProcesados = 0;

        // 2. Procesar deltas de Cuenta Corriente (Merge Aditivo C-10)
        if (changes.cuenta_corriente && Array.isArray(changes.cuenta_corriente.created)) {
          for (const delta of changes.cuenta_corriente.created) {
            const clienteRows = await manager.query(
              `SELECT * FROM cliente WHERE id = $1 FOR UPDATE`,
              [delta.id_cliente],
            );

            if (clienteRows && clienteRows.length > 0) {
              const cliente = clienteRows[0];
              const saldoAnterior = Number(cliente.saldo_deudor);
              const montoCredito = Number(delta.monto || delta.monto_credito || 0);
              const saldoNuevo = Number((saldoAnterior + montoCredito).toFixed(2));
              const limiteCredito = Number(cliente.limite_credito);

              const excesoLimite = saldoNuevo > limiteCredito;

              // Insertar asiento inmutable Signed Ledger (RF-08 / C-10)
              await manager.query(
                `INSERT INTO cuenta_corriente (
                  id, id_cliente, id_venta, tipo_movimiento, monto,
                  saldo_anterior, saldo_nuevo, id_usuario, requiere_revision, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
                [
                  delta.id || randomUUID(),
                  delta.id_cliente,
                  delta.id_venta ?? null,
                  TipoMovimientoCC.VENTA_CREDITO,
                  montoCredito,
                  saldoAnterior,
                  saldoNuevo,
                  delta.id_usuario || delta.id_usuario_sincronizador || UUID_SYSTEM_BOT,
                  excesoLimite,
                ],
              );

              // Actualizar saldo deudor del cliente
              await manager.query(
                `UPDATE cliente SET saldo_deudor = $1, version = version + 1 WHERE id = $2`,
                [saldoNuevo, cliente.id],
              );

              // Si excedió el límite en modo offline, registrar alerta forense (C-10)
              if (excesoLimite) {
                await manager.query(
                  `INSERT INTO auditoria (
                    id, id_usuario, tabla_afectada, id_registro_afectado, accion,
                    valor_anterior, valor_nuevo, motivo, fecha
                  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
                  [
                    randomUUID(),
                    UUID_SYSTEM_BOT,
                    'CLIENTE',
                    cliente.id,
                    AccionAuditoria.EXCESO_LIMITE_CREDITO_POST_SYNC,
                    JSON.stringify({ saldo_deudor: saldoAnterior, limite_credito: limiteCredito }),
                    JSON.stringify({ saldo_deudor: saldoNuevo, requiere_revision: true }),
                    `Sobregiro de crédito post-sync por venta offline: Saldo $${saldoNuevo} supera límite $${limiteCredito}`,
                  ],
                );
              }

              deltasProcesados++;
            }
          }
        }

        // 3. Procesar deltas de Ventas Offline (Idempotencia O-22 y Stock Permisivo C-12)
        if (changes.ventas && Array.isArray(changes.ventas.created)) {
          for (const venta of changes.ventas.created) {
            const existeVenta = await manager.query(
              `SELECT id FROM venta WHERE id = $1`,
              [venta.id],
            );

            if (!existeVenta || existeVenta.length === 0) {
              await manager.query(
                `INSERT INTO venta (
                  id, numero_comprobante, id_sucursal, id_turno_caja, id_cliente,
                  estado_general, estado_logistico, estado_financiero,
                  subtotal, descuento_total, total, created_at, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())`,
                [
                  venta.id,
                  venta.numero_comprobante,
                  dto.sucursal_id,
                  venta.id_turno_caja,
                  venta.id_cliente ?? null,
                  venta.estado_general,
                  venta.estado_logistico,
                  venta.estado_financiero,
                  venta.subtotal,
                  venta.descuento_total,
                  venta.total,
                  venta.created_at || new Date().toISOString(),
                ],
              );
              deltasProcesados++;
            }
          }
        }

        // 4. Procesar Renglones de Ventas y Actualizar Stock (C-12)
        if (changes.venta_detalles && Array.isArray(changes.venta_detalles.created)) {
          for (const det of changes.venta_detalles.created) {
            const existeDet = await manager.query(
              `SELECT id FROM venta_detalle WHERE id = $1`,
              [det.id],
            );

            if (!existeDet || existeDet.length === 0) {
              await manager.query(
                `INSERT INTO venta_detalle (
                  id, id_venta, id_producto, codigo_barra_leido, nombre_producto_comodin,
                  cantidad, precio_unitario, monto_descuento, subtotal, tipo_precio, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
                [
                  det.id,
                  det.id_venta,
                  det.id_producto,
                  det.codigo_barra_leido ?? null,
                  det.nombre_producto_comodin ?? null,
                  det.cantidad,
                  det.precio_unitario,
                  det.monto_descuento || 0,
                  det.subtotal,
                  det.tipo_precio || 'MINORISTA',
                ],
              );

              // Deducción en producto_sucursal
              const psRows = await manager.query(
                `SELECT * FROM producto_sucursal WHERE id_producto_global = $1 AND id_sucursal = $2 FOR UPDATE`,
                [det.id_producto, dto.sucursal_id],
              );

              if (psRows && psRows.length > 0) {
                const ps = psRows[0];
                const nuevoStock = Number((Number(ps.stock_fisico) - Number(det.cantidad)).toFixed(4));

                await manager.query(
                  `UPDATE producto_sucursal SET stock_fisico = $1, version = version + 1 WHERE id = $2`,
                  [nuevoStock, ps.id],
                );

                if (nuevoStock < 0) {
                  await manager.query(
                    `INSERT INTO auditoria (
                      id, id_usuario, tabla_afectada, id_registro_afectado, accion,
                      valor_anterior, valor_nuevo, motivo, fecha
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
                    [
                      randomUUID(),
                      UUID_SYSTEM_BOT,
                      'PRODUCTO_SUCURSAL',
                      ps.id,
                      AccionAuditoria.VENTA_OFFLINE_STOCK_NEGATIVO,
                      JSON.stringify({ stock_fisico: ps.stock_fisico }),
                      JSON.stringify({ stock_fisico: nuevoStock }),
                      `Venta offline generó stock negativo (${nuevoStock}) bajo política C-12`,
                    ],
                  );
                }
              }

              deltasProcesados++;
            }
          }
        }

        return {
          resultado: {
            status: 'SUCCESS',
            sucursal_id: dto.sucursal_id,
            deltas_procesados: deltasProcesados,
            cursor_actualizado: true,
            server_timestamp: new Date().toISOString(),
          },
        };
      },
    });
  }

  /**
   * Procesa la descarga de novedades desde el servidor autoritativo hacia la sucursal (Catch-Up RF-18).
   * Filtra registros modificados estrictamente después de `last_pulled_at` en formato ISO-8601 UTC.
   */
  async procesarPull(query: SyncPullQueryDto): Promise<ISyncPullResponse> {
    const fechaFiltro = new Date(query.last_pulled_at).toISOString();

    const productosGlobal = await this.dataSource.query(
      `SELECT * FROM producto_global WHERE updated_at > $1`,
      [fechaFiltro],
    );

    const productosSucursal = await this.dataSource.query(
      `SELECT * FROM producto_sucursal WHERE id_sucursal = $1 AND (updated_at > $2 OR created_at > $2)`,
      [query.sucursal_id, fechaFiltro],
    );

    const promociones = await this.dataSource.query(
      `SELECT * FROM promocion WHERE (id_sucursal = $1 OR id_sucursal IS NULL) AND (updated_at > $2 OR created_at > $2)`,
      [query.sucursal_id, fechaFiltro],
    );

    const configuracionSucursal = await this.dataSource.query(
      `SELECT * FROM configuracion_sucursal WHERE id_sucursal = $1 AND updated_at > $2`,
      [query.sucursal_id, fechaFiltro],
    );

    return {
      changes: {
        productos_global: {
          created: productosGlobal,
          updated: [],
          deleted: [],
        },
        productos_sucursal: {
          created: productosSucursal,
          updated: [],
          deleted: [],
        },
        promociones: {
          created: promociones,
          updated: [],
          deleted: [],
        },
        configuracion_sucursal: {
          created: configuracionSucursal,
          updated: [],
          deleted: [],
        },
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Endpoint granular para aplicar un único delta de Cuenta Corriente con validación OCC (C-10).
   */
  async aplicarDeltaCuentaCorriente(
    delta: SyncCuentaCorrienteDeltaDto,
    auditCtx: IAuditContext,
  ): Promise<any> {
    return await this.auditoriaService.ejecutarTransaccionAuditada<any>({
      auditContext: {
        ...auditCtx,
        accion: AccionAuditoria.RESOLUCION_MERGE_OCC,
        motivo: auditCtx.motivo || `Merge Aditivo Cuenta Corriente Cliente ${delta.id_cliente}`,
      },
      tablaAfectada: 'CUENTA_CORRIENTE',
      idRegistroAfectado: delta.id_cliente,
      obtenerSnapshotPrevio: async (manager) => {
        const rows = await manager.query(
          `SELECT * FROM cliente WHERE id = $1`,
          [delta.id_cliente],
        );
        return rows[0] || null;
      },
      mutacion: async (manager) => {
        const clienteRows = await manager.query(
          `SELECT * FROM cliente WHERE id = $1 FOR UPDATE`,
          [delta.id_cliente],
        );

        if (!clienteRows || clienteRows.length === 0) {
          throw new NotFoundException(
            `Cliente ${delta.id_cliente} no encontrado.`,
          );
        }

        const cliente = clienteRows[0];

        if (Number(cliente.version) !== delta.expected_version) {
          throw new ConflictException(
            `Conflicto OCC en CLIENTE:${delta.id_cliente}. Versión esperada ${delta.expected_version}, actual ${cliente.version}.`,
          );
        }

        const saldoAnterior = Number(cliente.saldo_deudor);
        const saldoNuevo = Number((saldoAnterior + delta.monto_credito).toFixed(2));
        const limiteCredito = Number(cliente.limite_credito);
        const excesoLimite = saldoNuevo > limiteCredito;

        const ccId = randomUUID();

        await manager.query(
          `INSERT INTO cuenta_corriente (
            id, id_cliente, id_venta, tipo_movimiento, monto,
            saldo_anterior, saldo_nuevo, id_usuario, requiere_revision, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
          [
            ccId,
            delta.id_cliente,
            delta.id_venta,
            TipoMovimientoCC.VENTA_CREDITO,
            delta.monto_credito,
            saldoAnterior,
            saldoNuevo,
            delta.id_usuario_sincronizador || UUID_SYSTEM_BOT,
            excesoLimite,
          ],
        );

        const updateRows = await manager.query(
          `UPDATE cliente SET saldo_deudor = $1, version = version + 1 WHERE id = $2 RETURNING *`,
          [saldoNuevo, delta.id_cliente],
        );

        return {
          resultado: {
            cuenta_corriente_id: ccId,
            id_cliente: delta.id_cliente,
            saldo_anterior: saldoAnterior,
            saldo_nuevo: saldoNuevo,
            requiere_revision: excesoLimite,
            cliente_actualizado: updateRows[0],
          },
        };
      },
    });
  }
}
