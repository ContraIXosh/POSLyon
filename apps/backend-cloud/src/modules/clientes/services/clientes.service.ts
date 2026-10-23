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
  calcularMergeAditivoOCC,
  IAuditContext,
  RegistrarAbonoDto,
  ResultadoValidacionCredito,
  SyncCuentaCorrienteDeltaDto,
  TipoMovimientoCaja,
  TipoMovimientoCC,
  validarMargenCredito,
} from '@poslyon/domain-core';
import { POSLYON_DATA_SOURCE } from '../../../database/database.module';
import { AuditoriaService } from '../../auditoria/services/auditoria.service';
import { CrearClienteDto } from '../dtos/crear-cliente.dto';
import { ActualizarClienteDto } from '../dtos/actualizar-cliente.dto';
import { ClienteEntity } from '../entities/cliente.entity';
import { CuentaCorrienteEntity } from '../entities/cuenta-corriente.entity';

@Injectable()
export class ClientesService {
  constructor(
    @Inject(POSLYON_DATA_SOURCE)
    private readonly dataSource: DataSource,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  /**
   * Crea un nuevo cliente con límite de crédito y radicación en sucursal (RF-07).
   */
  async crearCliente(
    dto: CrearClienteDto,
    auditCtx: IAuditContext,
  ): Promise<ClienteEntity> {
    const clienteId = randomUUID();

    return await this.auditoriaService.ejecutarTransaccionAuditada<ClienteEntity>({
      auditContext: {
        ...auditCtx,
        accion: AccionAuditoria.CREACION,
        motivo: auditCtx.motivo || 'Alta de nuevo cliente con límite de crédito',
      },
      tablaAfectada: 'CLIENTE',
      idRegistroAfectado: clienteId,
      obtenerSnapshotPrevio: async () => null,
      mutacion: async (manager) => {
        // Verificar unicidad de DNI/CUIT si fue informado
        if (dto.dni_cuit) {
          const existentes = await manager.query(
            `SELECT id FROM cliente WHERE dni_cuit = $1 AND deleted_at IS NULL`,
            [dto.dni_cuit],
          );
          if (existentes.length > 0) {
            throw new ConflictException(
              `Ya existe un cliente activo registrado con el DNI/CUIT ${dto.dni_cuit}.`,
            );
          }
        }

        const ahora = new Date().toISOString();
        const res = await manager.query(
          `INSERT INTO cliente (
            id, id_sucursal, nombre, dni_cuit, telefono, email,
            limite_credito, saldo_deudor, requiere_revision, version,
            activo, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          RETURNING *`,
          [
            clienteId,
            dto.id_sucursal,
            dto.nombre.trim(),
            dto.dni_cuit ? dto.dni_cuit.trim() : null,
            dto.telefono ? dto.telefono.trim() : null,
            dto.email ? dto.email.trim() : null,
            dto.limite_credito ?? 0,
            0.0, // Saldo inicial deudor incondicionalmente en 0.00
            false,
            1,
            true,
            ahora,
            ahora,
          ],
        );

        return {
          resultado: res[0] as ClienteEntity,
          versionNueva: 1,
        };
      },
    });
  }

  /**
   * Obtiene un cliente por su identificador UUID.
   */
  async obtenerClientePorId(id: string): Promise<ClienteEntity> {
    const res = await this.dataSource.query(
      `SELECT * FROM cliente WHERE id = $1 AND activo = true`,
      [id],
    );

    if (!res || res.length === 0) {
      throw new NotFoundException(`Cliente con ID ${id} no encontrado o inactivo.`);
    }

    return res[0];
  }

  /**
   * Lista todos los clientes activos, opcionalmente filtrados por sucursal de radicación.
   */
  async listarClientes(idSucursal?: string): Promise<ClienteEntity[]> {
    if (idSucursal) {
      return await this.dataSource.query(
        `SELECT * FROM cliente WHERE id_sucursal = $1 AND activo = true ORDER BY nombre ASC`,
        [idSucursal],
      );
    }

    return await this.dataSource.query(
      `SELECT * FROM cliente WHERE activo = true ORDER BY nombre ASC`,
    );
  }

  /**
   * Actualiza datos de un cliente o su cupo de crédito bajo Control de Concurrencia Optimista (OCC).
   */
  async actualizarCliente(
    id: string,
    dto: ActualizarClienteDto,
    auditCtx: IAuditContext,
  ): Promise<ClienteEntity> {
    return await this.auditoriaService.ejecutarTransaccionAuditada<ClienteEntity>({
      auditContext: {
        ...auditCtx,
        accion: AccionAuditoria.MODIFICACION,
        motivo: auditCtx.motivo || 'Actualización de cliente / límite de crédito',
      },
      tablaAfectada: 'CLIENTE',
      idRegistroAfectado: id,
      obtenerSnapshotPrevio: async (manager) => {
        const rows = await manager.query(
          `SELECT * FROM cliente WHERE id = $1 AND activo = true`,
          [id],
        );
        return rows[0] || null;
      },
      mutacion: async (manager) => {
        const rows = await manager.query(
          `SELECT * FROM cliente WHERE id = $1 AND activo = true`,
          [id],
        );
        const snapshotPrevio = rows[0];

        if (!snapshotPrevio) {
          throw new NotFoundException(`Cliente ${id} no encontrado para actualizar.`);
        }

        // Control de Concurrencia Optimista (OCC)
        if (Number(snapshotPrevio.version) !== Number(dto.expected_version)) {
          throw new ConflictException(
            `Conflicto OCC en CLIENTE:${id}. La versión esperada era ${dto.expected_version}, pero en base de datos ya avanzó a la versión ${snapshotPrevio.version}.`,
          );
        }

        const nuevoNombre = dto.nombre ? dto.nombre.trim() : snapshotPrevio.nombre;
        const nuevoDniCuit = dto.dni_cuit !== undefined ? dto.dni_cuit : snapshotPrevio.dni_cuit;
        const nuevoTelefono = dto.telefono !== undefined ? dto.telefono : snapshotPrevio.telefono;
        const nuevoEmail = dto.email !== undefined ? dto.email : snapshotPrevio.email;
        const nuevoLimite = dto.limite_credito !== undefined ? dto.limite_credito : snapshotPrevio.limite_credito;
        const nuevaVersion = Number(snapshotPrevio.version) + 1;
        const ahora = new Date().toISOString();

        const res = await manager.query(
          `UPDATE cliente SET
            nombre = $1,
            dni_cuit = $2,
            telefono = $3,
            email = $4,
            limite_credito = $5,
            version = $6,
            updated_at = $7
          WHERE id = $8 AND version = $9
          RETURNING *`,
          [
            nuevoNombre,
            nuevoDniCuit,
            nuevoTelefono,
            nuevoEmail,
            nuevoLimite,
            nuevaVersion,
            ahora,
            id,
            snapshotPrevio.version,
          ],
        );

        return {
          resultado: res[0] as ClienteEntity,
          versionNueva: nuevaVersion,
        };
      },
    });
  }

  /**
   * Realiza el borrado lógico de un cliente (Soft Delete).
   * Invariante de Negocio: No se puede eliminar un cliente con saldo deudor pendiente (RF-07).
   */
  async eliminarCliente(
    id: string,
    auditCtx: IAuditContext,
  ): Promise<{ success: boolean; message: string }> {
    return await this.auditoriaService.ejecutarTransaccionAuditada<{ success: boolean; message: string }>({
      auditContext: {
        ...auditCtx,
        accion: AccionAuditoria.SOFT_DELETE,
        motivo: auditCtx.motivo || 'Baja lógica de cliente',
      },
      tablaAfectada: 'CLIENTE',
      idRegistroAfectado: id,
      obtenerSnapshotPrevio: async (manager) => {
        const rows = await manager.query(
          `SELECT * FROM cliente WHERE id = $1 AND activo = true`,
          [id],
        );
        return rows[0] || null;
      },
      mutacion: async (manager) => {
        const rows = await manager.query(
          `SELECT * FROM cliente WHERE id = $1 AND activo = true`,
          [id],
        );
        const snapshotPrevio = rows[0];

        if (!snapshotPrevio) {
          throw new NotFoundException(`Cliente ${id} no encontrado para eliminar.`);
        }

        if (Number(snapshotPrevio.saldo_deudor) > 0) {
          throw new BadRequestException(
            `No es posible dar de baja al cliente ${snapshotPrevio.nombre} porque posee un saldo deudor pendiente de $${snapshotPrevio.saldo_deudor}. Debe saldar su cuenta antes de proceder.`,
          );
        }

        const ahora = new Date().toISOString();
        await manager.query(
          `UPDATE cliente SET
            activo = false,
            deleted_at = $1,
            updated_at = $1
          WHERE id = $2`,
          [ahora, id],
        );

        return {
          resultado: {
            success: true,
            message: `Cliente ${snapshotPrevio.nombre} dado de baja lógicamente con éxito.`,
          },
        };
      },
    });
  }

  /**
   * Evalúa preventivamente el cupo de crédito disponible para una venta en mostrador (RF-05, RF-07).
   */
  async evaluarMargenCredito(
    idCliente: string,
    montoFiadoSolicitado: number,
  ): Promise<ResultadoValidacionCredito> {
    const cliente = await this.obtenerClientePorId(idCliente);
    return validarMargenCredito(
      Number(cliente.saldo_deudor),
      Number(cliente.limite_credito),
      montoFiadoSolicitado,
    );
  }

  /**
   * Registra un abono a la cuenta corriente del cliente (RF-08, O-21, O-22).
   * - Aplica Idempotencia Unificada (ON CONFLICT (id) DO NOTHING / O-22).
   * - Reduce el saldo deudor del cliente de forma atómica en el Libro Mayor.
   * - Si el pago fue en EFECTIVO, asienta un INGRESO en la caja física del turno.
   */
  async registrarAbono(
    dto: RegistrarAbonoDto,
    auditCtx: IAuditContext,
  ): Promise<CuentaCorrienteEntity> {
    return await this.auditoriaService.ejecutarTransaccionAuditada<CuentaCorrienteEntity>({
      auditContext: {
        ...auditCtx,
        accion: AccionAuditoria.MODIFICACION,
        motivo: auditCtx.motivo || `Abono de $${dto.monto} a cuenta corriente (${dto.metodo_pago})`,
      },
      tablaAfectada: 'CUENTA_CORRIENTE',
      idRegistroAfectado: dto.id,
      obtenerSnapshotPrevio: async (manager) => {
        const rows = await manager.query(
          `SELECT * FROM cuenta_corriente WHERE id = $1`,
          [dto.id],
        );
        return rows[0] || null;
      },
      mutacion: async (manager) => {
        // Idempotencia O-22: si ya fue procesado el asiento id, retornarlo sin duplicar impacto
        const previo = await manager.query(
          `SELECT * FROM cuenta_corriente WHERE id = $1`,
          [dto.id],
        );
        if (previo && previo.length > 0) {
          return {
            resultado: previo[0] as CuentaCorrienteEntity,
          };
        }

        const clienteRows = await manager.query(
          `SELECT * FROM cliente WHERE id = $1 AND activo = true`,
          [dto.id_cliente],
        );

        if (!clienteRows || clienteRows.length === 0) {
          throw new NotFoundException(`Cliente ${dto.id_cliente} no encontrado.`);
        }

        const cliente = clienteRows[0];

        // Control OCC sobre el cliente
        if (Number(cliente.version) !== Number(dto.expected_version)) {
          throw new ConflictException(
            `Conflicto OCC en CLIENTE:${dto.id_cliente}. Versión esperada ${dto.expected_version}, versión actual ${cliente.version}.`,
          );
        }

        const saldoActual = Number(cliente.saldo_deudor);
        if (dto.monto > saldoActual) {
          throw new BadRequestException(
            `El monto del abono ($${dto.monto}) supera el saldo deudor pendiente actual ($${saldoActual}). No se admiten saldos a favor o negativos en cuenta corriente.`,
          );
        }

        const nuevoSaldo = Number((saldoActual - dto.monto).toFixed(2));
        const ahora = new Date().toISOString();

        // 1. Asentar movimiento en Libro Mayor Signed Ledger (Monto negativo reduce deuda)
        const concepto = `Abono presencial en mostrador - Medio: ${dto.metodo_pago}`;
        const ccRes = await manager.query(
          `INSERT INTO cuenta_corriente (
            id, id_cliente, id_venta, id_nota_credito, id_metodo_pago,
            id_turno_caja, id_usuario, monto, tipo_movimiento, concepto,
            saldo_resultante, fecha, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          RETURNING *`,
          [
            dto.id,
            dto.id_cliente,
            null, // id_venta
            null, // id_nota_credito
            dto.id_metodo_pago || null,
            dto.id_turno_caja || null,
            auditCtx.userId || null,
            -Math.abs(dto.monto), // Convención Signed Ledger: negativo
            TipoMovimientoCC.ABONO,
            concepto,
            nuevoSaldo,
            ahora,
            ahora,
            ahora,
          ],
        );

        // 2. Si el abono fue en efectivo en caja física, impactar en la gaveta del turno (O-21)
        if (dto.metodo_pago === 'EFECTIVO' && dto.id_turno_caja) {
          const movId = randomUUID();
          await manager.query(
            `INSERT INTO movimiento_caja (
              id, id_turno_caja, id_metodo_pago, id_usuario,
              tipo_movimiento, monto, concepto, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
              movId,
              dto.id_turno_caja,
              dto.id_metodo_pago || null,
              auditCtx.userId || null,
              TipoMovimientoCaja.INGRESO,
              dto.monto,
              `Cobro de Abono CC - Cliente: ${cliente.nombre}`,
              ahora,
              ahora,
            ],
          );
        }

        // 3. Actualizar saldo del cliente e incrementar versión OCC
        await manager.query(
          `UPDATE cliente SET
            saldo_deudor = $1,
            version = version + 1,
            updated_at = $2
          WHERE id = $3 AND version = $4`,
          [nuevoSaldo, ahora, dto.id_cliente, cliente.version],
        );

        return {
          resultado: ccRes[0] as CuentaCorrienteEntity,
          versionNueva: Number(cliente.version) + 1,
        };
      },
    });
  }

  /**
   * Sincroniza un cargo de cuenta corriente originado offline aplicando Merge Aditivo (Resolución C-10 / RF-07).
   */
  async sincronizarDeltaOffline(
    dto: SyncCuentaCorrienteDeltaDto,
    auditCtx: IAuditContext,
  ): Promise<CuentaCorrienteEntity> {
    const asientoId = randomUUID();

    return await this.auditoriaService.ejecutarTransaccionAuditada<CuentaCorrienteEntity>({
      auditContext: {
        ...auditCtx,
        accion: AccionAuditoria.RESOLUCION_MERGE_OCC,
        motivo: auditCtx.motivo || `Merge aditivo de venta a crédito offline (${dto.id_venta})`,
      },
      tablaAfectada: 'CUENTA_CORRIENTE',
      idRegistroAfectado: asientoId,
      obtenerSnapshotPrevio: async () => null,
      mutacion: async (manager) => {
        const clienteRows = await manager.query(
          `SELECT * FROM cliente WHERE id = $1 AND activo = true`,
          [dto.id_cliente],
        );

        if (!clienteRows || clienteRows.length === 0) {
          throw new NotFoundException(`Cliente ${dto.id_cliente} no encontrado.`);
        }

        const cliente = clienteRows[0];
        const mergeResult = calcularMergeAditivoOCC(
          Number(cliente.saldo_deudor),
          Number(cliente.limite_credito),
          dto.monto_credito,
        );

        const ahora = new Date().toISOString();
        const concepto = `Cargo a crédito sincronizado offline - Venta ${dto.id_venta}`;

        // Asentar en Libro Mayor (Monto positivo incrementa deuda)
        const ccRes = await manager.query(
          `INSERT INTO cuenta_corriente (
            id, id_cliente, id_venta, id_nota_credito, id_metodo_pago,
            id_turno_caja, id_usuario, monto, tipo_movimiento, concepto,
            saldo_resultante, fecha, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          RETURNING *`,
          [
            asientoId,
            dto.id_cliente,
            dto.id_venta,
            null, // id_nota_credito
            null, // id_metodo_pago
            null, // id_turno_caja
            dto.id_usuario_sincronizador,
            Math.abs(dto.monto_credito),
            TipoMovimientoCC.VENTA_CREDITO,
            concepto,
            mergeResult.nuevo_saldo_consolidado,
            ahora,
            ahora,
            ahora,
          ],
        );

        // Actualizar saldo consolidado del cliente. Si excedió límite por merge offline, activar flag
        await manager.query(
          `UPDATE cliente SET
            saldo_deudor = $1,
            requiere_revision = CASE WHEN $2 = true THEN true ELSE requiere_revision END,
            version = version + 1,
            updated_at = $3
          WHERE id = $4`,
          [
            mergeResult.nuevo_saldo_consolidado,
            mergeResult.requiere_auditoria_exceso,
            ahora,
            dto.id_cliente,
          ],
        );

        return {
          resultado: ccRes[0] as CuentaCorrienteEntity,
          versionNueva: Number(cliente.version) + 1,
        };
      },
    });
  }

  /**
   * Consulta el Libro Mayor histórico de una Cuenta Corriente (Signed Ledger inmutable).
   */
  async obtenerLibroMayor(idCliente: string): Promise<CuentaCorrienteEntity[]> {
    await this.obtenerClientePorId(idCliente); // Valida existencia

    return await this.dataSource.query(
      `SELECT * FROM cuenta_corriente
       WHERE id_cliente = $1
       ORDER BY fecha DESC, created_at DESC`,
      [idCliente],
    );
  }
}
