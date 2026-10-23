import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';
import { AccionAuditoria, IAuditContext } from '@poslyon/domain-core';
import { POSLYON_DATA_SOURCE } from '../../../database/database.module';
import { AuditoriaService } from '../../auditoria/services/auditoria.service';
import { PermisoEntity } from '../entities/permiso.entity';
import { AsignarPermisosDto } from '../dtos/asignar-permisos.dto';

export interface PermisoSeedDefinition {
  codigo: string;
  modulo: string;
  nombre: string;
  descripcion: string;
  dependencias: string[];
}

export const PERMISOS_CANONICOS: PermisoSeedDefinition[] = [
  {
    codigo: 'CLIENTES_VER',
    modulo: 'CLIENTES',
    nombre: 'Visualizar Directorio de Clientes',
    descripcion: 'Permite consultar el padrón de clientes y saldos.',
    dependencias: [],
  },
  {
    codigo: 'CLIENTES_REGISTRAR_ABONO',
    modulo: 'CLIENTES',
    nombre: 'Registrar Cobros de Cuentas Corrientes',
    descripcion: 'Permite registrar abonos y asentar pagos de deuda (RF-08).',
    dependencias: ['CLIENTES_VER'],
  },
  {
    codigo: 'VENTAS_COBRAR_DIRECTO',
    modulo: 'VENTAS',
    nombre: 'Cobrar Ventas de Contado / Efectivo',
    descripcion: 'Emisión de tickets de venta con pagos inmediatos.',
    dependencias: [],
  },
  {
    codigo: 'VENTAS_COBRAR_FIADO',
    modulo: 'VENTAS',
    nombre: 'Cobrar Ventas Fiadas / Cuenta Corriente',
    descripcion: 'Genera comprobantes imputados a saldo deudor (RF-07).',
    dependencias: ['CLIENTES_VER', 'CLIENTES_REGISTRAR_ABONO'],
  },
  {
    codigo: 'NOTAS_CREDITO_EMITIR',
    modulo: 'DEVOLUCIONES',
    nombre: 'Emitir Devoluciones y Notas de Crédito',
    descripcion: 'Permite aprobar devoluciones y compensaciones (RF-09 / RF-10).',
    dependencias: ['VENTAS_COBRAR_DIRECTO', 'CLIENTES_VER'],
  },
  {
    codigo: 'INVENTARIO_VER_STOCK',
    modulo: 'INVENTARIO',
    nombre: 'Visualizar Existencias en Góndola',
    descripcion: 'Consulta de stock físico y mínimo por sucursal.',
    dependencias: [],
  },
  {
    codigo: 'INVENTARIO_AJUSTAR_STOCK',
    modulo: 'INVENTARIO',
    nombre: 'Ajuste Manual de Existencias',
    descripcion: 'Modificación manual auditada de stock físico (RF-02 / UC12).',
    dependencias: ['INVENTARIO_VER_STOCK'],
  },
  {
    codigo: 'INVENTARIO_VER_VALORIZACION',
    modulo: 'INVENTARIO',
    nombre: 'Ver Valorización Total en Dinero',
    descripcion: 'Acceso a costo y valuación patrimonial (Desacoplado de stock).',
    dependencias: [],
  },
  {
    codigo: 'SUCURSALES_CONFIGURAR',
    modulo: 'SUCURSALES',
    nombre: 'Configurar Parámetros de Tienda',
    descripcion: 'Modificación de planes comerciales y feature toggles (RF-21).',
    dependencias: [],
  },
];

@Injectable()
export class PermisosService implements OnModuleInit {
  private readonly logger = new Logger(PermisosService.name);

  constructor(
    @Inject(POSLYON_DATA_SOURCE)
    private readonly dataSource: DataSource,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.sembrarPermisosCanonicos();
  }

  /**
   * Sembrado idempotente del catálogo canónico de permisos PBAC (RF-20).
   */
  async sembrarPermisosCanonicos(): Promise<void> {
    if (!this.dataSource.isInitialized) return;

    try {
      // Verificar si la tabla permiso existe en PostgreSQL
      const check = await this.dataSource.query(
        `SELECT to_regclass('public.permiso') AS existe`,
      );
      if (!check?.[0]?.existe) return;

      for (const p of PERMISOS_CANONICOS) {
        await this.dataSource.query(
          `INSERT INTO permiso (id, codigo, modulo, nombre, descripcion, dependencias, activo)
           VALUES ($1, $2, $3, $4, $5, $6, true)
           ON CONFLICT (codigo) DO UPDATE
           SET nombre = EXCLUDED.nombre,
               descripcion = EXCLUDED.descripcion,
               dependencias = EXCLUDED.dependencias`,
          [
            randomUUID(),
            p.codigo,
            p.modulo,
            p.nombre,
            p.descripcion,
            JSON.stringify(p.dependencias),
          ],
        );
      }
      this.logger.log('Catálogo canónico de permisos PBAC sembrado exitosamente.');
    } catch (err: any) {
      this.logger.warn(`No se pudo sembrar permisos canónicos: ${err.message}`);
    }
  }

  /**
   * Valida algorítmicamente el Grafo Acíclico Dirigido (DAG) de dependencias (RF-20).
   */
  validarGrafoDependencias(
    codigosSeleccionados: string[],
    catalogoPermisos: PermisoEntity[],
  ): void {
    const mapaPermisos = new Map(catalogoPermisos.map((p) => [p.codigo, p]));
    const setSeleccionados = new Set(codigosSeleccionados);

    for (const codigo of codigosSeleccionados) {
      const permiso = mapaPermisos.get(codigo);
      if (!permiso) {
        throw new BadRequestException(
          `El permiso '${codigo}' no existe en el catálogo universal del sistema.`,
        );
      }

      const dependencias = Array.isArray(permiso.dependencias)
        ? permiso.dependencias
        : typeof permiso.dependencias === 'string'
          ? JSON.parse(permiso.dependencias)
          : [];

      for (const dep of dependencias) {
        if (!setSeleccionados.has(dep)) {
          throw new BadRequestException(
            `Inconsistencia en Grafo de Dependencias (RF-20): El permiso '${codigo}' exige que también se asigne el permiso pre-requisito '${dep}'.`,
          );
        }
      }
    }
  }

  /**
   * Asigna un conjunto coherente de permisos a un usuario dentro de una transacción auditada.
   */
  async asignarPermisosAUsuario(
    idUsuario: string,
    dto: AsignarPermisosDto,
    auditCtx: IAuditContext,
  ) {
    if (!this.dataSource.isInitialized) {
      throw new InternalServerErrorException('PostgreSQL no disponible');
    }

    const catalogo = await this.dataSource.query(
      `SELECT id, codigo, dependencias FROM permiso WHERE activo = true`,
    );

    // 1. Validar grafo DAG de dependencias
    this.validarGrafoDependencias(dto.codigos_permisos, catalogo);

    const mapaCatalogo = new Map(catalogo.map((c: any) => [c.codigo, c.id]));

    return await this.auditoriaService.ejecutarTransaccionAuditada({
      auditContext: {
        ...auditCtx,
        accion: AccionAuditoria.MODIFICACION,
        motivo: dto.motivo,
      },
      tablaAfectada: 'USUARIO_PERMISO',
      idRegistroAfectado: idUsuario,
      obtenerSnapshotPrevio: async (manager) => {
        const rows = await manager.query(
          `SELECT p.codigo FROM usuario_permiso up
           INNER JOIN permiso p ON p.id = up.id_permiso
           WHERE up.id_usuario = $1 AND (up.id_sucursal IS NOT DISTINCT FROM $2)`,
          [idUsuario, dto.id_sucursal || null],
        );
        return { permisos_actuales: rows.map((r: any) => r.codigo) };
      },
      mutacion: async (manager) => {
        // Eliminar asignaciones previas en el scope
        await manager.query(
          `DELETE FROM usuario_permiso WHERE id_usuario = $1 AND (id_sucursal IS NOT DISTINCT FROM $2)`,
          [idUsuario, dto.id_sucursal || null],
        );

        // Insertar nuevas asignaciones
        const asignados: any[] = [];
        for (const codigo of dto.codigos_permisos) {
          const idPermiso = mapaCatalogo.get(codigo);
          const [row] = await manager.query(
            `INSERT INTO usuario_permiso (id, id_usuario, id_permiso, id_sucursal, activo, created_at, updated_at)
             VALUES ($1, $2, $3, $4, true, NOW(), NOW())
             RETURNING *;`,
            [randomUUID(), idUsuario, idPermiso, dto.id_sucursal || null],
          );
          asignados.push(row);
        }

        return {
          resultado: {
            id_usuario: idUsuario,
            id_sucursal: dto.id_sucursal || null,
            permisos_asignados: dto.codigos_permisos,
            total_asignados: asignados.length,
          },
        };
      },
    });
  }

  /**
   * Lista todos los permisos canónicos disponibles.
   */
  async listarPermisos(): Promise<PermisoEntity[]> {
    if (!this.dataSource.isInitialized) return [];
    return await this.dataSource.query(
      `SELECT id, codigo, modulo, nombre, descripcion, dependencias, activo
       FROM permiso WHERE activo = true ORDER BY modulo, codigo ASC`,
    );
  }
}
