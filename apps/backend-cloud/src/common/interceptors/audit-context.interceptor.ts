import {
  CallHandler,
  createParamDecorator,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import {
  AccionAuditoria,
  IAuditContext,
  UUID_SYSTEM_BOT,
} from '@poslyon/domain-core';

/**
 * Decorador para extraer el `IAuditContext` del request en parámetros de controladores NestJS.
 * Ejemplo: `@Post() crear(@Body() dto: ..., @AuditContext() ctx: IAuditContext)`
 */
export const AuditContext = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): IAuditContext => {
    const request = ctx.switchToHttp().getRequest();
    return (
      request.auditContext || {
        userId: UUID_SYSTEM_BOT,
        motivo: 'Operación transaccional por defecto',
        ip: request.ip || '127.0.0.1',
        path: request.originalUrl || request.url || '/api',
        accion: AccionAuditoria.MODIFICACION,
      }
    );
  },
);

/**
 * Interceptor Global de Auditoría Forense (`AuditContextInterceptor` — RF-19).
 *
 * Captura metadatos contextuales HTTP (identidad del operador, justificación/motivo forense,
 * IP de origen y ruta) e inyecta un objeto `IAuditContext` inmutable en el objeto `request`.
 * Este contexto es consumido posteriormente por `AuditoriaService.ejecutarTransaccionAuditada`
 * para asentar el registro en la tabla `AUDITORIA` dentro de la misma transacción ACID de negocio.
 */
@Injectable()
export class AuditContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;

    // Solo capturar contexto forense para mutaciones de estado
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return next.handle();
    }

    const userId =
      request.user?.id ||
      (request.headers['x-user-id'] as string) ||
      request.body?.id_usuario ||
      UUID_SYSTEM_BOT;

    const motivoHeader = request.headers['x-audit-reason'] as string | undefined;
    const motivo =
      motivoHeader ||
      request.body?.motivo ||
      'Operación transaccional estándar del sistema';

    const clientIp =
      (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      request.ip ||
      request.socket?.remoteAddress ||
      '127.0.0.1';

    const auditContext: IAuditContext = {
      userId,
      motivo,
      ip: clientIp,
      path: request.originalUrl || request.url,
      accion: this.mapearMetodoAAccionAuditoria(method),
    };

    request.auditContext = auditContext;

    return next.handle();
  }

  /**
   * Mapea el verbo HTTP de la petición al catálogo canónico `AccionAuditoria` (Resolución S-04).
   */
  private mapearMetodoAAccionAuditoria(method: string): AccionAuditoria {
    switch (method.toUpperCase()) {
      case 'POST':
        return AccionAuditoria.CREACION;
      case 'PUT':
      case 'PATCH':
        return AccionAuditoria.MODIFICACION;
      case 'DELETE':
        return AccionAuditoria.SOFT_DELETE;
      default:
        return AccionAuditoria.MODIFICACION;
    }
  }
}
