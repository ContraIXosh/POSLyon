import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AuditContextInterceptor } from './common/interceptors/audit-context.interceptor';
import { OccExceptionFilter } from './common/filters/occ-exception.filter';

/**
 * Aplica la configuración transversal de la aplicación NestJS:
 * - Prefijo Global `/api`
 * - Habilitación de CORS
 * - Filtro Global de Concurrencia Optimista (`OccExceptionFilter` - HTTP 409)
 * - Interceptor Global de Auditoría Forense (`AuditContextInterceptor` - RF-19)
 * - Aduana Perimetral Declarativa (`ValidationPipe` estricto contra Mass Assignment)
 *
 * Se extrae en una función pura reutilizable para que tanto el servidor en producción (`main.ts`)
 * como las pruebas de integración HTTP (`supertest`) ejecuten exactamente el mismo pipeline.
 */
export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix('api');
  app.enableCors();

  // 1. Filtro global para transformar colisiones OCC en respuestas HTTP 409 Conflict estándar
  app.useGlobalFilters(new OccExceptionFilter());

  // 2. Interceptor global para capturar metadatos forenses e inyectar `auditContext`
  app.useGlobalInterceptors(new AuditContextInterceptor());

  // 3. Aduana perimetral declarativa (Previene Mass Assignment con whitelist y forbidNonWhitelisted)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: false,
      },
    }),
  );
}
