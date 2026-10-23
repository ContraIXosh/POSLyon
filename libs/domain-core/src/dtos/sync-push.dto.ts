import {
  IsUUID,
  IsObject,
  IsNotEmpty,
  IsISO8601,
  IsOptional,
  IsIn,
} from 'class-validator';

/**
 * DTO de entrada para `POST /api/sync/push` y `POST /api/lan-sync/push` (RF-18 / Resolución O-25).
 * Transporta el lote de deltas locales (`changes`) junto con el cursor temporal `last_pulled_at` en formato ISO-8601 UTC.
 */
export class SyncPushDto {
  @IsUUID('4', { message: 'sucursal_id debe ser un UUIDv4 válido' })
  @IsNotEmpty()
  sucursal_id!: string;

  @IsISO8601(
    { strict: true },
    {
      message:
        'last_pulled_at debe ser un timestamp válido en formato ISO-8601 UTC (Resolución O-25)',
    },
  )
  @IsNotEmpty()
  last_pulled_at!: string;

  @IsOptional()
  @IsIn(['LAN_MASTER', 'CLOUD_CENTRAL'], {
    message: 'nodo_destino debe ser LAN_MASTER o CLOUD_CENTRAL',
  })
  nodo_destino?: 'LAN_MASTER' | 'CLOUD_CENTRAL';

  @IsObject({
    message: 'changes debe ser un objeto estructurado con los deltas por tabla',
  })
  changes!: Record<string, unknown>;
}
