import { INestApplication, ValidationPipe } from '@nestjs/common';

/**
 * Aplica la configuración transversal de la aplicación NestJS (Prefijo Global `/api`, CORS y `ValidationPipe`).
 * Se extrae en una función pura reutilizable para que tanto el servidor en producción (`main.ts`)
 * como las pruebas de integración HTTP (`supertest`) ejecuten exactamente el mismo pipeline.
 */
export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix('api');
  app.enableCors();

  /**
   * Aduana Perimetral Declarativa:
   * - `whitelist: true`: Remueve silenciosamente cualquier propiedad no declarada en el DTO.
   * - `forbidNonWhitelisted: true`: Rechaza con HTTP 400 si el cliente envía campos intrusos (Previene Mass Assignment).
   * - `transform: true`: Hidrata automáticamente el JSON plano a instancias reales de nuestras clases DTO de `@poslyon/domain-core`.
   */
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
