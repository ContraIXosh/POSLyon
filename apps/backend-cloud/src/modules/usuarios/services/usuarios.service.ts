import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { randomBytes, randomUUID, scryptSync } from 'crypto';
import { AccionAuditoria, IAuditContext } from '@poslyon/domain-core';
import { POSLYON_DATA_SOURCE } from '../../../database/database.module';
import { AuditoriaService } from '../../auditoria/services/auditoria.service';
import { CrearUsuarioDto } from '../dtos/crear-usuario.dto';
import { ActualizarUsuarioDto } from '../dtos/actualizar-usuario.dto';
import { AsignarSucursalDto } from '../dtos/asignar-sucursal.dto';
import { UsuarioEntity } from '../entities/usuario.entity';

@Injectable()
export class UsuariosService {
  constructor(
    @Inject(POSLYON_DATA_SOURCE)
    private readonly dataSource: DataSource,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  /**
   * Genera un hash criptográfico robusto (scrypt KDF) con salt aleatorio.
   */
  private hashPassword(password: string): string {
    const salt = randomBytes(16).toString('hex');
    const hash = scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${hash}`;
  }

  /**
   * Verifica una contraseña en texto plano contra el hash scrypt almacenado.
   */
  verificarPassword(password: string, passwordHash: string): boolean {
    const [salt, key] = passwordHash.split(':');
    if (!salt || !key) return false;
    const keyBuffer = Buffer.from(key, 'hex');
    const derivedKey = scryptSync(password, salt, 64);
    return (
      keyBuffer.length === derivedKey.length &&
      keyBuffer.every((b, i) => b === derivedKey[i])
    );
  }

  /**
   * Da de alta un nuevo usuario dentro de una transacción auditada (RF-20).
   */
  async crearUsuario(
    dto: CrearUsuarioDto,
    auditCtx: IAuditContext,
  ): Promise<UsuarioEntity> {
    const usuarioId = randomUUID();
    const hash = this.hashPassword(dto.password);
    const esDueno = Boolean(dto.es_dueno);

    return await this.auditoriaService.ejecutarTransaccionAuditada({
      auditContext: {
        ...auditCtx,
        accion: AccionAuditoria.CREACION,
        motivo: auditCtx.motivo || 'Alta de usuario en el sistema',
      },
      tablaAfectada: 'USUARIO',
      idRegistroAfectado: usuarioId,
      obtenerSnapshotPrevio: async () => null,
      mutacion: async (manager) => {
        // Verificar unicidad de email
        const existentes = await manager.query(
          `SELECT id FROM usuario WHERE email = $1`,
          [dto.email.trim().toLowerCase()],
        );
        if (existentes.length > 0) {
          throw new ConflictException(
            `El correo '${dto.email}' ya se encuentra registrado en el sistema.`,
          );
        }

        const [nuevoUsuario] = await manager.query(
          `INSERT INTO usuario (
            id, nombre, email, password_hash, es_dueno, activo, version, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, true, 1, NOW(), NOW())
          RETURNING id, nombre, email, es_dueno, activo, version, created_at, updated_at;`,
          [usuarioId, dto.nombre.trim(), dto.email.trim().toLowerCase(), hash, esDueno],
        );

        const { password_hash: _omit, ...usuarioSeguro } = nuevoUsuario;

        return {
          resultado: usuarioSeguro as UsuarioEntity,
        };
      },
      obtenerSnapshotNuevo: async (_manager, res) => {
        const { password_hash, ...seguro } = res as any;
        return seguro;
      },
    });
  }

  /**
   * Actualiza los datos de un usuario bajo control de concurrencia optimista (OCC).
   */
  async actualizarUsuario(
    id: string,
    dto: ActualizarUsuarioDto,
    auditCtx: IAuditContext,
  ): Promise<UsuarioEntity> {
    return await this.auditoriaService.ejecutarTransaccionAuditada({
      auditContext: {
        ...auditCtx,
        accion: AccionAuditoria.MODIFICACION,
        motivo: dto.motivo,
      },
      tablaAfectada: 'USUARIO',
      idRegistroAfectado: id,
      obtenerSnapshotPrevio: async (manager) => {
        const rows = await manager.query(
          `SELECT id, nombre, email, es_dueno, activo, version FROM usuario WHERE id = $1 FOR UPDATE`,
          [id],
        );
        if (!rows.length) throw new NotFoundException(`Usuario ${id} no encontrado`);
        return rows[0];
      },
      mutacion: async (manager) => {
        const rows = await manager.query(
          `SELECT id, nombre, email, es_dueno, password_hash, activo, version FROM usuario WHERE id = $1`,
          [id],
        );
        const actual = rows[0];

        if (actual.version !== dto.version) {
          throw new ConflictException(
            `Conflicto OCC en USUARIO:${id}. Versión esperada ${dto.version}, versión actual ${actual.version}.`,
          );
        }

        const nombreNuevo = dto.nombre ? dto.nombre.trim() : actual.nombre;
        const emailNuevo = dto.email ? dto.email.trim().toLowerCase() : actual.email;
        const hashNuevo = dto.password
          ? this.hashPassword(dto.password)
          : actual.password_hash;
        const esDuenoNuevo =
          dto.es_dueno !== undefined ? dto.es_dueno : actual.es_dueno;

        const updateResult = await manager.query(
          `UPDATE usuario
           SET nombre = $1, email = $2, password_hash = $3, es_dueno = $4,
               version = version + 1, updated_at = NOW()
           WHERE id = $5 AND version = $6
           RETURNING id, nombre, email, es_dueno, activo, version, created_at, updated_at;`,
          [nombreNuevo, emailNuevo, hashNuevo, esDuenoNuevo, id, dto.version],
        );

        return {
          resultado: updateResult[0] as UsuarioEntity,
        };
      },
    });
  }

  /**
   * Asocia operativamente un usuario a una sucursal en `USUARIO_SUCURSAL`.
   */
  async asignarSucursal(
    idUsuario: string,
    dto: AsignarSucursalDto,
    auditCtx: IAuditContext,
  ) {
    return await this.auditoriaService.ejecutarTransaccionAuditada({
      auditContext: {
        ...auditCtx,
        accion: AccionAuditoria.MODIFICACION,
        motivo: dto.motivo,
      },
      tablaAfectada: 'USUARIO_SUCURSAL',
      idRegistroAfectado: idUsuario,
      obtenerSnapshotPrevio: async (manager) => {
        const rows = await manager.query(
          `SELECT * FROM usuario_sucursal WHERE id_usuario = $1 AND id_sucursal = $2`,
          [idUsuario, dto.id_sucursal],
        );
        return rows[0] || null;
      },
      mutacion: async (manager) => {
        const rol = dto.rol || 'OPERADOR';
        const [row] = await manager.query(
          `INSERT INTO usuario_sucursal (id, id_usuario, id_sucursal, rol, activo, version, created_at, updated_at)
           VALUES ($1, $2, $3, $4, true, 1, NOW(), NOW())
           ON CONFLICT (id_usuario, id_sucursal) DO UPDATE
           SET rol = EXCLUDED.rol, activo = true, version = usuario_sucursal.version + 1, updated_at = NOW()
           RETURNING *;`,
          [randomUUID(), idUsuario, dto.id_sucursal, rol],
        );

        return {
          resultado: row,
        };
      },
    });
  }

  /**
   * Borrado lógico de usuario (`activo = false`, `deleted_at = NOW()`) auditado como SOFT_DELETE.
   */
  async eliminarUsuarioLogico(
    id: string,
    versionEsperada: number,
    motivo: string,
    auditCtx: IAuditContext,
  ) {
    return await this.auditoriaService.ejecutarTransaccionAuditada({
      auditContext: {
        ...auditCtx,
        accion: AccionAuditoria.SOFT_DELETE,
        motivo,
      },
      tablaAfectada: 'USUARIO',
      idRegistroAfectado: id,
      obtenerSnapshotPrevio: async (manager) => {
        const rows = await manager.query(
          `SELECT id, nombre, email, activo, version FROM usuario WHERE id = $1 FOR UPDATE`,
          [id],
        );
        if (!rows.length) throw new NotFoundException(`Usuario ${id} no encontrado`);
        return rows[0];
      },
      mutacion: async (manager) => {
        const rows = await manager.query(
          `SELECT id, activo, version FROM usuario WHERE id = $1`,
          [id],
        );
        if (!rows.length) throw new NotFoundException(`Usuario ${id} no encontrado`);

        if (rows[0].version !== versionEsperada) {
          throw new ConflictException(
            `Conflicto OCC al eliminar USUARIO:${id}. Versión esperada: ${versionEsperada}, actual: ${rows[0].version}`,
          );
        }

        const res = await manager.query(
          `UPDATE usuario
           SET activo = false, deleted_at = NOW(), version = version + 1, updated_at = NOW()
           WHERE id = $1 AND version = $2
           RETURNING id, nombre, email, activo, version;`,
          [id, versionEsperada],
        );

        return {
          resultado: res[0],
        };
      },
    });
  }

  /**
   * Consulta listado de usuarios con sus sucursales asignadas.
   */
  async listarUsuarios(incluirInactivos = false): Promise<UsuarioEntity[]> {
    if (!this.dataSource.isInitialized) return [];

    const where = incluirInactivos ? '' : 'WHERE u.activo = true';
    const sql = `
      SELECT
        u.id, u.nombre, u.email, u.es_dueno, u.activo, u.version, u.created_at, u.updated_at,
        COALESCE(
          json_agg(
            json_build_object(
              'id_sucursal', us.id_sucursal,
              'rol', us.rol,
              'activo', us.activo
            )
          ) FILTER (WHERE us.id IS NOT NULL),
          '[]'
        ) AS sucursales
      FROM usuario u
      LEFT JOIN usuario_sucursal us ON us.id_usuario = u.id AND us.activo = true
      ${where}
      GROUP BY u.id
      ORDER BY u.created_at ASC;
    `;

    return await this.dataSource.query(sql);
  }

  /**
   * Consulta un usuario por ID.
   */
  async obtenerPorId(id: string): Promise<UsuarioEntity> {
    if (!this.dataSource.isInitialized) {
      throw new NotFoundException(`Usuario ${id} no encontrado`);
    }

    const rows = await this.dataSource.query(
      `SELECT id, nombre, email, es_dueno, activo, version, created_at, updated_at
       FROM usuario WHERE id = $1`,
      [id],
    );

    if (!rows.length) {
      throw new NotFoundException(`Usuario ${id} no encontrado`);
    }

    return rows[0];
  }
}
