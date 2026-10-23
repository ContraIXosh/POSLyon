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
  ArqueoCiegoDomainService,
  EstadoTurnoCaja,
  IAuditContext,
  TipoMovimientoCaja,
} from '@poslyon/domain-core';
import { POSLYON_DATA_SOURCE } from '../../../database/database.module';
import { AuditoriaService } from '../../auditoria/services/auditoria.service';
import { AbrirTurnoDto } from '../dtos/abrir-turno.dto';
import { CerrarTurnoCiegoDto } from '../dtos/cerrar-turno-ciego.dto';
import { RectificarTurnoDto } from '../dtos/rectificar-turno.dto';
import { CrearMovimientoCajaDto } from '../dtos/crear-movimiento-caja.dto';
import { TurnoCajaEntity } from '../entities/turno-caja.entity';
import { MovimientoCajaEntity } from '../entities/movimiento-caja.entity';

@Injectable()
export class CajaService {
  constructor(
    @Inject(POSLYON_DATA_SOURCE)
    private readonly dataSource: DataSource,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  /**
   * Abre un nuevo turno de caja física para un cajero en una sucursal (RF-17 / O-16).
   */
  async abrirTurno(
    dto: AbrirTurnoDto,
    auditCtx: IAuditContext,
  ): Promise<TurnoCajaEntity> {
    const turnoId = randomUUID();

    return await this.auditoriaService.ejecutarTransaccionAuditada({
      auditContext: {
        ...auditCtx,
        accion: AccionAuditoria.CREACION,
        motivo: auditCtx.motivo || 'Apertura de turno de caja y fondo inicial',
      },
      tablaAfectada: 'TURNO_CAJA',
      idRegistroAfectado: turnoId,
      obtenerSnapshotPrevio: async () => null,
      mutacion: async (manager) => {
        // Regla O-16: Solo un turno ABIERTO por cajero en la sucursal
        const abiertos = await manager.query(
          `SELECT id FROM turno_caja
           WHERE id_usuario = $1 AND id_sucursal = $2 AND estado = $3`,
          [dto.id_usuario, dto.id_sucursal, EstadoTurnoCaja.ABIERTO],
        );

        if (abiertos.length > 0) {
          throw new ConflictException(
            `El usuario ${dto.id_usuario} ya posee el turno abierto ${abiertos[0].id} en esta sucursal (Resolución O-16). Debe cerrarlo antes de iniciar uno nuevo.`,
          );
        }

        const [nuevoTurno] = await manager.query(
          `INSERT INTO turno_caja (
            id, id_sucursal, id_usuario, fecha_apertura, monto_inicial_efectivo,
            estado, version, created_at, updated_at
          ) VALUES ($1, $2, $3, NOW(), $4, $5, 1, NOW(), NOW())
          RETURNING *;`,
          [
            turnoId,
            dto.id_sucursal,
            dto.id_usuario,
            dto.monto_inicial_efectivo,
            EstadoTurnoCaja.ABIERTO,
          ],
        );

        return {
          resultado: nuevoTurno as TurnoCajaEntity,
        };
      },
    });
  }

  /**
   * Registra un movimiento directo de gaveta (ingreso o egreso) en un turno abierto.
   */
  async registrarMovimiento(
    dto: CrearMovimientoCajaDto,
    auditCtx: IAuditContext,
  ): Promise<MovimientoCajaEntity> {
    const movId = randomUUID();
    const afectaFisica = dto.afecta_caja_fisica !== undefined ? dto.afecta_caja_fisica : true;

    return await this.auditoriaService.ejecutarTransaccionAuditada({
      auditContext: {
        ...auditCtx,
        accion: AccionAuditoria.CREACION,
        motivo: dto.motivo,
      },
      tablaAfectada: 'MOVIMIENTO_CAJA',
      idRegistroAfectado: movId,
      obtenerSnapshotPrevio: async () => null,
      mutacion: async (manager) => {
        // Verificar que el turno exista y esté ABIERTO
        const [turno] = await manager.query(
          `SELECT id, estado FROM turno_caja WHERE id = $1`,
          [dto.id_turno_caja],
        );

        if (!turno) {
          throw new NotFoundException(`Turno de caja ${dto.id_turno_caja} no encontrado`);
        }

        if (turno.estado !== EstadoTurnoCaja.ABIERTO) {
          throw new BadRequestException(
            `No se pueden registrar movimientos en un turno en estado '${turno.estado}'. El turno debe estar ABIERTO.`,
          );
        }

        const [nuevoMov] = await manager.query(
          `INSERT INTO movimiento_caja (
            id, id_turno_caja, id_metodo_pago, id_usuario, tipo_movimiento,
            monto, concepto, afecta_caja_fisica, motivo, fecha, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
          RETURNING *;`,
          [
            movId,
            dto.id_turno_caja,
            dto.id_metodo_pago || null,
            dto.id_usuario,
            dto.tipo_movimiento,
            dto.monto,
            dto.concepto.trim(),
            afectaFisica,
            dto.motivo.trim(),
          ],
        );

        return {
          resultado: nuevoMov as MovimientoCajaEntity,
        };
      },
    });
  }

  /**
   * Cierre Ciego de Turno y Arqueo Contable Inmutable (RF-17 / Resolución O-23).
   *
   * El cajero declara a ciegas el efectivo físico contado en la gaveta.
   * El sistema calcula matemáticamente el esperado a través de `ArqueoCiegoDomainService`,
   * congela la declaración y asienta el descuadre sin permitir reintentos manipulados.
   */
  async cerrarTurnoCiego(
    idTurno: string,
    dto: CerrarTurnoCiegoDto,
    auditCtx: IAuditContext,
  ) {
    return await this.auditoriaService.ejecutarTransaccionAuditada({
      auditContext: {
        ...auditCtx,
        accion: AccionAuditoria.MODIFICACION,
        motivo: dto.motivo,
      },
      tablaAfectada: 'TURNO_CAJA',
      idRegistroAfectado: idTurno,
      obtenerSnapshotPrevio: async (manager) => {
        const rows = await manager.query(
          `SELECT * FROM turno_caja WHERE id = $1 FOR UPDATE`,
          [idTurno],
        );
        if (!rows.length) throw new NotFoundException(`Turno ${idTurno} no encontrado`);
        return rows[0];
      },
      mutacion: async (manager) => {
        const [actual] = await manager.query(
          `SELECT * FROM turno_caja WHERE id = $1`,
          [idTurno],
        );

        if (actual.estado !== EstadoTurnoCaja.ABIERTO) {
          throw new BadRequestException(
            `El turno ${idTurno} ya se encuentra cerrado o rectificado (Estado: ${actual.estado}).`,
          );
        }

        if (actual.version !== dto.version) {
          throw new ConflictException(
            `Conflicto OCC en TURNO_CAJA:${idTurno}. Versión esperada: ${dto.version}, actual: ${actual.version}`,
          );
        }

        // 1. Totalizar movimientos directos de caja que afectan efectivo físico
        const movimientosRows = await manager.query(
          `SELECT tipo_movimiento, concepto, SUM(monto) AS total
           FROM movimiento_caja
           WHERE id_turno_caja = $1 AND afecta_caja_fisica = true
           GROUP BY tipo_movimiento, concepto`,
          [idTurno],
        );

        let ingresosManuales = 0;
        let sangriasRetiros = 0;
        let abonosEfectivo = 0;
        let devolucionesEfectivo = 0;
        let pagosProveedores = 0;

        for (const m of movimientosRows) {
          const montoNum = Number(m.total || 0);
          if (m.tipo_movimiento === TipoMovimientoCaja.INGRESO) {
            if (m.concepto.includes('ABONO')) abonosEfectivo += montoNum;
            else ingresosManuales += montoNum;
          } else if (m.tipo_movimiento === TipoMovimientoCaja.EGRESO) {
            if (m.concepto.includes('DEVOLUCION')) devolucionesEfectivo += montoNum;
            else if (m.concepto.includes('PROVEEDOR')) pagosProveedores += montoNum;
            else sangriasRetiros += montoNum;
          }
        }

        // 2. Ejecutar Arqueo Ciego Puro de Dominio (Resolución O-23)
        const resultadoArqueo = ArqueoCiegoDomainService.calcularArqueoTurno({
          monto_inicial_efectivo: Number(actual.monto_inicial_efectivo || 0),
          ventas_efectivo: 0, // Se integrará dinámicamente con pagos en Nivel 4
          abonos_efectivo: abonosEfectivo,
          ingresos_manuales_efectivo: ingresosManuales,
          devoluciones_efectivo: devolucionesEfectivo,
          sangrias_retiros_efectivo: sangriasRetiros,
          pagos_proveedores_efectivo: pagosProveedores,
          efectivo_declarado_ciego: dto.efectivo_declarado_ciego,
        });

        // 3. Persistir cierre inmutable
        const [turnoActualizado] = await manager.query(
          `UPDATE turno_caja
           SET fecha_cierre = NOW(),
               efectivo_declarado = $1,
               diferencia_caja = $2,
               estado = $3,
               version = version + 1,
               updated_at = NOW()
           WHERE id = $4 AND version = $5
           RETURNING *;`,
          [
            dto.efectivo_declarado_ciego,
            resultadoArqueo.diferencia_caja,
            EstadoTurnoCaja.CERRADO,
            idTurno,
            dto.version,
          ],
        );

        return {
          resultado: {
            ...turnoActualizado,
            desglose_arqueo_ciego: resultadoArqueo,
          },
        };
      },
    });
  }

  /**
   * Rectificación Forense de Turno por Supervisor (Resolución O-16 / S-04).
   *
   * Permite que un supervisor audite un arqueo cerrado discrepante asentando
   * el importe rectificado definitivo sin alterar la declaración histórica del cajero.
   */
  async rectificarTurno(
    idTurno: string,
    dto: RectificarTurnoDto,
    auditCtx: IAuditContext,
  ) {
    return await this.auditoriaService.ejecutarTransaccionAuditada({
      auditContext: {
        ...auditCtx,
        accion: AccionAuditoria.RECTIFICACION_TURNO_CAJA,
        motivo: dto.motivo,
      },
      tablaAfectada: 'TURNO_CAJA',
      idRegistroAfectado: idTurno,
      obtenerSnapshotPrevio: async (manager) => {
        const rows = await manager.query(
          `SELECT * FROM turno_caja WHERE id = $1 FOR UPDATE`,
          [idTurno],
        );
        if (!rows.length) throw new NotFoundException(`Turno ${idTurno} no encontrado`);
        return rows[0];
      },
      mutacion: async (manager) => {
        const [actual] = await manager.query(
          `SELECT * FROM turno_caja WHERE id = $1`,
          [idTurno],
        );

        if (
          actual.estado !== EstadoTurnoCaja.CERRADO &&
          actual.estado !== EstadoTurnoCaja.RECTIFICADO
        ) {
          throw new BadRequestException(
            `Solo se pueden rectificar turnos en estado CERRADO o previamente RECTIFICADO (Estado actual: ${actual.estado}).`,
          );
        }

        if (actual.version !== dto.version) {
          throw new ConflictException(
            `Conflicto OCC en rectificación de TURNO_CAJA:${idTurno}. Versión esperada: ${dto.version}, actual: ${actual.version}`,
          );
        }

        const [rectificado] = await manager.query(
          `UPDATE turno_caja
           SET efectivo_rectificado = $1,
               fecha_rectificacion = NOW(),
               id_usuario_rectifica = $2,
               motivo_rectificacion = $3,
               estado = $4,
               version = version + 1,
               updated_at = NOW()
           WHERE id = $5 AND version = $6
           RETURNING *;`,
          [
            dto.efectivo_rectificado,
            dto.id_supervisor,
            dto.motivo.trim(),
            EstadoTurnoCaja.RECTIFICADO,
            idTurno,
            dto.version,
          ],
        );

        return {
          resultado: rectificado,
        };
      },
    });
  }

  /**
   * Consulta el turno actualmente ABIERTO para un usuario en una sucursal.
   */
  async obtenerTurnoActivo(
    idUsuario: string,
    idSucursal: string,
  ): Promise<TurnoCajaEntity | null> {
    if (!this.dataSource.isInitialized) return null;

    const rows = await this.dataSource.query(
      `SELECT * FROM turno_caja
       WHERE id_usuario = $1 AND id_sucursal = $2 AND estado = $3
       LIMIT 1`,
      [idUsuario, idSucursal, EstadoTurnoCaja.ABIERTO],
    );

    return rows.length ? rows[0] : null;
  }

  /**
   * Consulta un turno por ID con sus movimientos asociados.
   */
  async obtenerTurnoPorId(id: string): Promise<TurnoCajaEntity> {
    if (!this.dataSource.isInitialized) {
      throw new NotFoundException(`Turno ${id} no encontrado`);
    }

    const rows = await this.dataSource.query(
      `SELECT
        t.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', m.id,
              'tipo_movimiento', m.tipo_movimiento,
              'monto', m.monto,
              'concepto', m.concepto,
              'afecta_caja_fisica', m.afecta_caja_fisica,
              'fecha', m.fecha
            )
          ) FILTER (WHERE m.id IS NOT NULL),
          '[]'
        ) AS movimientos
      FROM turno_caja t
      LEFT JOIN movimiento_caja m ON m.id_turno_caja = t.id
      WHERE t.id = $1
      GROUP BY t.id;`,
      [id],
    );

    if (!rows.length) {
      throw new NotFoundException(`Turno de caja ${id} no encontrado`);
    }

    return rows[0];
  }
}
