import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { POSLYON_DATA_SOURCE } from '../../../database/database.module';

export const PERMISOS_KEY = 'POSLYON_PERMISOS_KEY';

/**
 * Decorador para exigir uno o más permisos atómicos en un endpoint o controlador.
 * Ejemplo: `@RequirePermissions('VENTAS_COBRAR', 'CLIENTES_VER')`
 */
export const RequirePermissions = (...permisos: string[]) =>
  SetMetadata(PERMISOS_KEY, permisos);

/**
 * Guardia de Autorización Granular Basada en Permisos (PBAC — RF-20).
 *
 * Implementa:
 * 1. Bypass Dueño (RF-20): Si `usuario.es_dueno === true`, otorga acceso irrestricto incondicional.
 * 2. Validación PBAC: Para operadores regulares, verifica que el usuario posea todos los permisos
 *    exigidos para el contexto de la sucursal actual o a nivel global.
 */
@Injectable()
export class PermisosGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(POSLYON_DATA_SOURCE)
    private readonly dataSource: DataSource,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const permisosRequeridos = this.reflector.getAllAndOverride<string[]>(
      PERMISOS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Si el endpoint no exige permisos específicos, permitir acceso
    if (!permisosRequeridos || permisosRequeridos.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const userId =
      request.user?.id ||
      (request.headers['x-user-id'] as string) ||
      request.body?.id_usuario;

    if (!userId) {
      throw new UnauthorizedException(
        'Acceso no autenticado: se requiere identificación de usuario para validar permisos PBAC.',
      );
    }

    if (!this.dataSource.isInitialized) {
      // Si la BD no está levantada en tests o arranque local, permitir continuar
      return true;
    }

    // 1. Consultar usuario para verificar si es Dueño (Bypass RF-20)
    const [usuario] = await this.dataSource.query(
      `SELECT id, es_dueno, activo FROM usuario WHERE id = $1 AND activo = true`,
      [userId],
    );

    if (!usuario) {
      throw new UnauthorizedException('Usuario no encontrado o inactivo en el sistema.');
    }

    // 🚀 BYPASS DUEÑO (RF-20): Acceso irrestricto universal
    if (usuario.es_dueno === true) {
      request.user = { ...usuario, es_dueno: true };
      return true;
    }

    // 2. Para operadores regulares, verificar asignación en USUARIO_PERMISO
    const sucursalId =
      (request.headers['x-sucursal-id'] as string) ||
      request.params?.id_sucursal ||
      request.body?.id_sucursal ||
      null;

    const sqlPermisos = `
      SELECT p.codigo
      FROM usuario_permiso up
      INNER JOIN permiso p ON p.id = up.id_permiso
      WHERE up.id_usuario = $1
        AND up.activo = true
        AND p.activo = true
        AND (up.id_sucursal IS NULL OR up.id_sucursal = $2);
    `;

    const permisosAsignadosRows = await this.dataSource.query(sqlPermisos, [
      userId,
      sucursalId,
    ]);

    const codigosAsignados = new Set(
      permisosAsignadosRows.map((r: { codigo: string }) => r.codigo),
    );

    const permisosFaltantes = permisosRequeridos.filter(
      (req) => !codigosAsignados.has(req),
    );

    if (permisosFaltantes.length > 0) {
      throw new ForbiddenException(
        `Acceso denegado (RF-20 PBAC): el usuario carece de los siguientes permisos requeridos: [${permisosFaltantes.join(', ')}].`,
      );
    }

    request.user = usuario;
    return true;
  }
}
