import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';
import {
  AccionAuditoria,
  IAuditContext,
  IReglasNegocioSucursal,
  ModoNodoLan,
  PlanComercial,
} from '@poslyon/domain-core';
import { POSLYON_DATA_SOURCE } from '../../../database/database.module';
import { AuditoriaService } from '../../auditoria/services/auditoria.service';
import { CrearSucursalDto } from '../dtos/crear-sucursal.dto';
import { ActualizarSucursalDto } from '../dtos/actualizar-sucursal.dto';
import { ActualizarConfiguracionDto } from '../dtos/actualizar-configuracion.dto';
import { SucursalEntity } from '../entities/sucursal.entity';
import { ConfiguracionSucursalEntity } from '../entities/configuracion-sucursal.entity';

@Injectable()
export class SucursalesService {
  constructor(
    @Inject(POSLYON_DATA_SOURCE)
    private readonly dataSource: DataSource,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  /**
   * Genera las reglas de negocio por defecto para una nueva sucursal según el plan comercial.
   */
  private generarReglasPorDefecto(
    plan: PlanComercial,
    personalizadas?: Partial<IReglasNegocioSucursal>,
  ): IReglasNegocioSucursal {
    const esCloud = plan === PlanComercial.SUPERIOR_CLOUD;

    const base: IReglasNegocioSucursal = {
      comportamiento_precios: 'inmediato',
      descuento_stock: 'inmediato',
      ttl_carrito_minutos: 15,
      politica_stock: 'UNIVERSAL_PERMISIVO', // Resolución C-12
      feature_toggles: {
        sincronizacion_cloud: esCloud,
        sincronizacion_lan_multicaja: true,
        catalogo_multisucursal: esCloud,
        transferencias_inter_sucursal: esCloud,
        clientes_inter_sucursal: esCloud,
        reconciliacion_local: true,
        permitir_venta_sin_turno: false,
        requerir_control_ciego_arqueo: true,
      },
    };

    if (!personalizadas) return base;

    return {
      ...base,
      ...personalizadas,
      feature_toggles: {
        ...base.feature_toggles,
        ...(personalizadas.feature_toggles || {}),
      },
    };
  }

  /**
   * Crea una nueva sucursal y su configuración asociada en una transacción auditada (RF-21).
   */
  async crearSucursal(
    dto: CrearSucursalDto,
    auditCtx: IAuditContext,
  ): Promise<SucursalEntity> {
    const sucursalId = randomUUID();
    const configId = randomUUID();
    const plan = dto.plan_activo || PlanComercial.BASICO_LOCAL;
    const modoLan = dto.modo_nodo_lan || ModoNodoLan.MAESTRO_LAN;
    const reglasNegocio = this.generarReglasPorDefecto(plan, dto.reglas_negocio);

    return await this.auditoriaService.ejecutarTransaccionAuditada({
      auditContext: {
        ...auditCtx,
        accion: AccionAuditoria.CREACION,
        motivo: auditCtx.motivo || 'Alta inicial de sucursal y configuración',
      },
      tablaAfectada: 'SUCURSAL',
      idRegistroAfectado: sucursalId,
      obtenerSnapshotPrevio: async () => null,
      mutacion: async (manager) => {
        // 1. Insertar SUCURSAL
        const [sucursalCreada] = await manager.query(
          `INSERT INTO sucursal (
            id, nombre, direccion, telefono, en_linea, activo, version, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, false, true, 1, NOW(), NOW())
          RETURNING *;`,
          [sucursalId, dto.nombre.trim(), dto.direccion.trim(), dto.telefono || null],
        );

        // 2. Insertar CONFIGURACION_SUCURSAL One-to-One
        const [configCreada] = await manager.query(
          `INSERT INTO configuracion_sucursal (
            id, id_sucursal, plan_activo, modo_nodo_lan, reglas_negocio,
            ultima_modificacion, version, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, NOW(), 1, NOW(), NOW())
          RETURNING *;`,
          [
            configId,
            sucursalId,
            plan,
            modoLan,
            JSON.stringify(reglasNegocio),
          ],
        );

        return {
          resultado: {
            ...sucursalCreada,
            configuracion: configCreada,
          } as SucursalEntity,
        };
      },
    });
  }

  /**
   * Actualiza los datos de la sucursal bajo control OCC sobre `version`.
   */
  async actualizarSucursal(
    id: string,
    dto: ActualizarSucursalDto,
    auditCtx: IAuditContext,
  ): Promise<SucursalEntity> {
    return await this.auditoriaService.ejecutarTransaccionAuditada({
      auditContext: {
        ...auditCtx,
        accion: AccionAuditoria.MODIFICACION,
        motivo: dto.motivo,
      },
      tablaAfectada: 'SUCURSAL',
      idRegistroAfectado: id,
      obtenerSnapshotPrevio: async (manager) => {
        const rows = await manager.query(
          `SELECT id, nombre, direccion, telefono, activo, version FROM sucursal WHERE id = $1 FOR UPDATE`,
          [id],
        );
        if (!rows.length) {
          throw new NotFoundException(`Sucursal ${id} no encontrada`);
        }
        return rows[0];
      },
      mutacion: async (manager) => {
        const rows = await manager.query(
          `SELECT id, nombre, direccion, telefono, activo, version FROM sucursal WHERE id = $1`,
          [id],
        );

        const actual = rows[0];
        if (actual.version !== dto.version) {
          throw new ConflictException(
            `Conflicto OCC en SUCURSAL:${id}. La versión enviada (${dto.version}) no coincide con la versión en base de datos (${actual.version}).`,
          );
        }

        const nombreNuevo = dto.nombre !== undefined ? dto.nombre.trim() : actual.nombre;
        const direccionNueva =
          dto.direccion !== undefined ? dto.direccion.trim() : actual.direccion;
        const telefonoNuevo =
          dto.telefono !== undefined ? dto.telefono : actual.telefono;

        const updateResult = await manager.query(
          `UPDATE sucursal
           SET nombre = $1, direccion = $2, telefono = $3, version = version + 1, updated_at = NOW()
           WHERE id = $4 AND version = $5
           RETURNING *;`,
          [nombreNuevo, direccionNueva, telefonoNuevo, id, dto.version],
        );

        if (!updateResult.length) {
          throw new ConflictException(
            `Conflicto OCC en SUCURSAL:${id}. No se pudo actualizar el registro.`,
          );
        }

        return {
          resultado: updateResult[0] as SucursalEntity,
        };
      },
    });
  }

  /**
   * Actualiza el plan o las reglas JSONB de la sucursal bajo control OCC.
   */
  async actualizarConfiguracion(
    idSucursal: string,
    dto: ActualizarConfiguracionDto,
    auditCtx: IAuditContext,
  ): Promise<ConfiguracionSucursalEntity> {
    return await this.auditoriaService.ejecutarTransaccionAuditada({
      auditContext: {
        ...auditCtx,
        accion: AccionAuditoria.MODIFICACION,
        motivo: dto.motivo,
      },
      tablaAfectada: 'CONFIGURACION_SUCURSAL',
      idRegistroAfectado: idSucursal,
      obtenerSnapshotPrevio: async (manager) => {
        const rows = await manager.query(
          `SELECT * FROM configuracion_sucursal WHERE id_sucursal = $1 FOR UPDATE`,
          [idSucursal],
        );
        if (!rows.length) {
          throw new NotFoundException(
            `Configuración para sucursal ${idSucursal} no encontrada`,
          );
        }
        return rows[0];
      },
      mutacion: async (manager) => {
        const rows = await manager.query(
          `SELECT * FROM configuracion_sucursal WHERE id_sucursal = $1`,
          [idSucursal],
        );
        const actual = rows[0];

        if (actual.version !== dto.version) {
          throw new ConflictException(
            `Conflicto OCC en CONFIGURACION_SUCURSAL:${idSucursal}. Versión esperada ${dto.version}, versión actual ${actual.version}.`,
          );
        }

        const planNuevo = dto.plan_activo || actual.plan_activo;
        const modoLanNuevo = dto.modo_nodo_lan || actual.modo_nodo_lan;
        const reglasActuales: IReglasNegocioSucursal =
          typeof actual.reglas_negocio === 'string'
            ? JSON.parse(actual.reglas_negocio)
            : actual.reglas_negocio;

        const reglasFusionadas: IReglasNegocioSucursal = {
          ...reglasActuales,
          ...(dto.reglas_negocio || {}),
          feature_toggles: {
            ...reglasActuales.feature_toggles,
            ...(dto.reglas_negocio?.feature_toggles || {}),
          },
        };

        const updateResult = await manager.query(
          `UPDATE configuracion_sucursal
           SET plan_activo = $1, modo_nodo_lan = $2, reglas_negocio = $3,
               ultima_modificacion = NOW(), version = version + 1, updated_at = NOW()
           WHERE id_sucursal = $4 AND version = $5
           RETURNING *;`,
          [
            planNuevo,
            modoLanNuevo,
            JSON.stringify(reglasFusionadas),
            idSucursal,
            dto.version,
          ],
        );

        if (!updateResult.length) {
          throw new ConflictException(
            `Conflicto OCC en CONFIGURACION_SUCURSAL:${idSucursal}`,
          );
        }

        return {
          resultado: updateResult[0] as ConfiguracionSucursalEntity,
        };
      },
    });
  }

  /**
   * Borrado lógico de sucursal (`activo = false`, `deleted_at = NOW()`) auditado como SOFT_DELETE.
   */
  async eliminarSucursalLogico(
    id: string,
    versionEsperada: number,
    motivo: string,
    auditCtx: IAuditContext,
  ): Promise<{ id: string; activo: boolean; version: number }> {
    return await this.auditoriaService.ejecutarTransaccionAuditada({
      auditContext: {
        ...auditCtx,
        accion: AccionAuditoria.SOFT_DELETE,
        motivo,
      },
      tablaAfectada: 'SUCURSAL',
      idRegistroAfectado: id,
      obtenerSnapshotPrevio: async (manager) => {
        const rows = await manager.query(
          `SELECT id, nombre, activo, version FROM sucursal WHERE id = $1 FOR UPDATE`,
          [id],
        );
        if (!rows.length) {
          throw new NotFoundException(`Sucursal ${id} no encontrada`);
        }
        return rows[0];
      },
      mutacion: async (manager) => {
        const rows = await manager.query(
          `SELECT id, activo, version FROM sucursal WHERE id = $1`,
          [id],
        );
        if (!rows.length) throw new NotFoundException(`Sucursal ${id} no encontrada`);

        if (rows[0].version !== versionEsperada) {
          throw new ConflictException(
            `Conflicto OCC en borrado de SUCURSAL:${id}. Versión esperada: ${versionEsperada}, actual: ${rows[0].version}`,
          );
        }

        const res = await manager.query(
          `UPDATE sucursal
           SET activo = false, deleted_at = NOW(), version = version + 1, updated_at = NOW()
           WHERE id = $1 AND version = $2
           RETURNING id, activo, version;`,
          [id, versionEsperada],
        );

        return {
          resultado: res[0],
        };
      },
    });
  }

  /**
   * Lista las sucursales con su configuración asociada.
   */
  async listarSucursales(incluirInactivas = false): Promise<SucursalEntity[]> {
    if (!this.dataSource.isInitialized) return [];

    const whereClause = incluirInactivas ? '' : 'WHERE s.activo = true';
    const sql = `
      SELECT
        s.id, s.nombre, s.direccion, s.telefono, s.en_linea, s.activo, s.version,
        s.created_at, s.updated_at, s.deleted_at,
        json_build_object(
          'id', c.id,
          'id_sucursal', c.id_sucursal,
          'plan_activo', c.plan_activo,
          'modo_nodo_lan', c.modo_nodo_lan,
          'reglas_negocio', c.reglas_negocio,
          'ultima_modificacion', c.ultima_modificacion,
          'version', c.version
        ) AS configuracion
      FROM sucursal s
      LEFT JOIN configuracion_sucursal c ON c.id_sucursal = s.id
      ${whereClause}
      ORDER BY s.created_at ASC;
    `;

    return await this.dataSource.query(sql);
  }

  /**
   * Obtiene una sucursal por su ID junto a su configuración.
   */
  async obtenerPorId(id: string): Promise<SucursalEntity> {
    if (!this.dataSource.isInitialized) {
      throw new NotFoundException(`Sucursal ${id} no encontrada`);
    }

    const rows = await this.dataSource.query(
      `SELECT
        s.id, s.nombre, s.direccion, s.telefono, s.en_linea, s.activo, s.version,
        s.created_at, s.updated_at, s.deleted_at,
        json_build_object(
          'id', c.id,
          'id_sucursal', c.id_sucursal,
          'plan_activo', c.plan_activo,
          'modo_nodo_lan', c.modo_nodo_lan,
          'reglas_negocio', c.reglas_negocio,
          'ultima_modificacion', c.ultima_modificacion,
          'version', c.version
        ) AS configuracion
      FROM sucursal s
      LEFT JOIN configuracion_sucursal c ON c.id_sucursal = s.id
      WHERE s.id = $1;`,
      [id],
    );

    if (!rows.length) {
      throw new NotFoundException(`Sucursal con id ${id} no encontrada`);
    }

    return rows[0];
  }
}
