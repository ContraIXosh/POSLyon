import { IsUUID, IsNotEmpty, IsISO8601 } from 'class-validator';

/**
 * DTO para validar parámetros de consulta en `GET /api/sync/pull` (RF-18 / Catch-Up por Cursor ISO-8601 UTC).
 */
export class SyncPullQueryDto {
  @IsUUID('4', { message: 'sucursal_id debe ser un UUIDv4 válido' })
  @IsNotEmpty()
  sucursal_id!: string;

  @IsISO8601(
    { strict: true },
    {
      message:
        'last_pulled_at debe ser un timestamp válido en formato ISO-8601 UTC (ej. 1970-01-01T00:00:00.000Z para bootstrap inicial)',
    },
  )
  @IsNotEmpty()
  last_pulled_at!: string;
}
