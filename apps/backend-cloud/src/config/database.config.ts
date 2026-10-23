export interface PostgresConnectionConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  synchronize: boolean;
  logging: boolean;
}

/**
 * Construye la configuración tipada de conexión a PostgreSQL leyendo las variables de entorno
 * con valores por defecto alineados con `docker-compose.yml` y `.env.example`.
 */
export function obtenerConfiguracionPostgres(
  env: NodeJS.ProcessEnv = process.env,
): PostgresConnectionConfig {
  return {
    host: env.DB_HOST || 'localhost',
    port: Number(env.DB_PORT || 5432),
    username: env.DB_USER || 'poslyon_admin',
    password: env.DB_PASSWORD || 'poslyon_secret_2026',
    database: env.DB_NAME || 'poslyon_cloud',
    synchronize: env.DB_SYNC === 'true',
    logging: env.DB_LOGGING === 'true',
  };
}
