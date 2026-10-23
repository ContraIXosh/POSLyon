import {
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { randomUUID } from 'crypto';
import {
  IAuditContext,
  RegistrarAuditoriaDto,
} from '@poslyon/domain-core';
import { POSLYON_DATA_SOURCE } from '../../../database/database.module';
import { AuditoriaEntity } from '../entities/auditoria.entity';

export interface ITransaccionAuditadaParams<T> {
  auditContext: IAuditContext;
  tablaAfectada: string;
  idRegistroAfectado: string;
  obtenerSnapshotPrevio?: (manager: EntityManager) => Promise<Record<string, any> | null>;
  mutacion: (manager: EntityManager) => Promise<{ resultado: T; versionNueva?: number }>;
  obtenerSnapshotNuevo?: (
    manager: EntityManager,
    resultado: T,
  ) => Promise<Record<string, any> | null>;
}

/**
 * Servicio Central de Auditoría Forense y Transaccionalidad Atómica (RF-19 / RNF-03).
 *
 * Implementa el patrón transaccional indivisible (Resoluciones C-25 y C-26):
 * Toda mutación de negocio y su registro de auditoría ocurren en un bloque `BEGIN ... COMMIT` unificado.
 * Si la mutación falla, no se asienta auditoría. Si la inserción en `auditoria` falla (por ejemplo por caída
 * o error de integridad), la mutación de negocio se REVOCA INCONDICIONALMENTE (`ROLLBACK`).
 */
@Injectable()
export class AuditoriaService {
  private readonly logger = new Logger(AuditoriaService.name);

  constructor(
    @Inject(POSLYON_DATA_SOURCE)
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Ejecuta una mutación de negocio y su registro de auditoría en una transacción ACID atómica.
   */
  async ejecutarTransaccionAuditada<T>(
    params: ITransaccionAuditadaParams<T>,
  ): Promise<T> {
    if (!this.dataSource.isInitialized) {
      throw new InternalServerErrorException(
        'Base de datos no inicializada: la transacción auditada requiere conexión activa a PostgreSQL.',
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Captura fidedigna del snapshot anterior (con bloqueo si la lambda lo requiere)
      const valorAnterior = params.obtenerSnapshotPrevio
        ? await params.obtenerSnapshotPrevio(queryRunner.manager)
        : null;

      // 2. Ejecución de la mutación de negocio (incluyendo validación OCC)
      const { resultado } = await params.mutacion(queryRunner.manager);

      // 3. Captura del snapshot posterior a la mutación
      const valorNuevo = params.obtenerSnapshotNuevo
        ? await params.obtenerSnapshotNuevo(queryRunner.manager, resultado)
        : (resultado as Record<string, any>);

      // 4. Inserción atómica en la tabla AUDITORIA dentro de la misma transacción de BD
      const auditoriaId = randomUUID();
      await queryRunner.manager.query(
        `INSERT INTO auditoria (
          id, id_usuario, tabla_afectada, id_registro_afectado, accion,
          valor_anterior, valor_nuevo, motivo, fecha
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
        [
          auditoriaId,
          params.auditContext.userId,
          params.tablaAfectada,
          params.idRegistroAfectado,
          params.auditContext.accion,
          valorAnterior ? JSON.stringify(valorAnterior) : null,
          valorNuevo ? JSON.stringify(valorNuevo) : null,
          params.auditContext.motivo,
        ],
      );

      // 5. Confirmación atómica de ambas operaciones
      await queryRunner.commitTransaction();
      return resultado;
    } catch (error: any) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Transacción auditada abortada (${params.tablaAfectada}:${params.idRegistroAfectado}): ${error.message}`,
        error.stack,
      );

      if (error instanceof ConflictException) {
        throw error;
      }

      throw new InternalServerErrorException(
        `Fallo transaccional atómico: ${error.message || 'Error de persistencia forense'}`,
      );
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Inserta un evento de auditoría directo validado mediante `RegistrarAuditoriaDto`.
   */
  async registrarEventoDirecto(dto: RegistrarAuditoriaDto): Promise<AuditoriaEntity> {
    if (!this.dataSource.isInitialized) {
      throw new InternalServerErrorException('PostgreSQL no disponible');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const nuevoId = randomUUID();
      const insertSql = `
        INSERT INTO auditoria (
          id, id_usuario, tabla_afectada, id_registro_afectado, accion,
          valor_anterior, valor_nuevo, motivo, fecha
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        RETURNING *;
      `;

      const rows = await queryRunner.manager.query(insertSql, [
        nuevoId,
        dto.id_usuario,
        dto.tabla_afectada,
        dto.id_registro_afectado,
        dto.accion,
        dto.valor_anterior ? JSON.stringify(dto.valor_anterior) : null,
        dto.valor_nuevo ? JSON.stringify(dto.valor_nuevo) : null,
        dto.motivo,
      ]);

      await queryRunner.commitTransaction();
      return rows[0] as AuditoriaEntity;
    } catch (err: any) {
      await queryRunner.rollbackTransaction();
      throw new InternalServerErrorException(
        `No se pudo registrar la auditoría directa: ${err.message}`,
      );
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Consulta el historial forense inmutable de un registro o tabla afectada.
   */
  async consultarHistorial(filtros: {
    idRegistro?: string;
    tabla?: string;
    limite?: number;
  }): Promise<AuditoriaEntity[]> {
    if (!this.dataSource.isInitialized) {
      return [];
    }

    const limite = Math.min(filtros.limite || 50, 200);
    const conditions: string[] = [];
    const params: any[] = [];

    if (filtros.idRegistro) {
      params.push(filtros.idRegistro);
      conditions.push(`id_registro_afectado = $${params.length}`);
    }

    if (filtros.tabla) {
      params.push(filtros.tabla);
      conditions.push(`tabla_afectada = $${params.length}`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(limite);
    const limitClause = `LIMIT $${params.length}`;

    const sql = `
      SELECT id, id_usuario, tabla_afectada, id_registro_afectado, accion,
             valor_anterior, valor_nuevo, motivo, fecha
      FROM auditoria
      ${whereClause}
      ORDER BY fecha DESC
      ${limitClause};
    `;

    return await this.dataSource.query(sql, params);
  }
}
