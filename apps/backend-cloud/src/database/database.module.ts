import { Global, Logger, Module, OnApplicationShutdown } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { obtenerConfiguracionPostgres } from '../config/database.config';
import { seedSystemEntities } from './seeds/system-entities.seed';

export const POSLYON_DATA_SOURCE = 'POSLYON_DATA_SOURCE';

/**
 * Módulo Global de Persistencia PostgreSQL (`DatabaseModule`).
 *
 * Configura el `DataSource` de TypeORM forzando zona horaria UTC (`-c timezone=UTC`, Resolución O-25).
 * Implementa inicialización resiliente: si el motor PostgreSQL (Docker) está encendido, abre el pool
 * de conexiones y ejecuta `seedSystemEntities` (S-03); si el contenedor está apagado durante el desarrollo local,
 * permite que el servidor HTTP de NestJS levante igualmente e intenta reconectar bajo demanda en el Healthcheck.
 */
@Global()
@Module({
  providers: [
    {
      provide: POSLYON_DATA_SOURCE,
      useFactory: async (): Promise<DataSource> => {
        const logger = new Logger('DatabaseModule');
        const cfg = obtenerConfiguracionPostgres();

        const dataSource = new DataSource({
          type: 'postgres',
          host: cfg.host,
          port: cfg.port,
          username: cfg.username,
          password: cfg.password,
          database: cfg.database,
          synchronize: cfg.synchronize,
          logging: cfg.logging,
          entities: [],
          extra: {
            // Fuerza UTC estricto en la sesión de PostgreSQL para cursores ISO-8601 (O-25 / S-10)
            options: '-c timezone=UTC',
            connectionTimeoutMillis: 2500,
          },
        });

        if (process.env.SKIP_DB_INIT_ON_BOOT === 'true') {
          return dataSource;
        }

        try {
          await dataSource.initialize();
          logger.log(
            `Conectado exitosamente a PostgreSQL en ${cfg.host}:${cfg.port}/${cfg.database} (Timezone: UTC)`,
          );
          await seedSystemEntities(dataSource);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          logger.warn(
            `PostgreSQL no disponible al iniciar (${cfg.host}:${cfg.port} -> ${msg}). El servidor HTTP iniciará en modo degradado y reconectará automáticamente al levantar Docker (npm run db:up).`,
          );
        }

        return dataSource;
      },
    },
  ],
  exports: [POSLYON_DATA_SOURCE],
})
export class DatabaseModule implements OnApplicationShutdown {
  async onApplicationShutdown(): Promise<void> {
    // El cierre limpio se delega al ciclo de vida del contenedor IoC
  }
}
