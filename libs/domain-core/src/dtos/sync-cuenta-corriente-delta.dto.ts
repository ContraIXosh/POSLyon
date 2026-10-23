import { IsUUID, IsNumber, IsPositive, IsInt, Min } from 'class-validator';
import { IsUUIDOrNil } from '../validators/is-uuid-or-nil.decorator';

/**
 * DTO para la sincronización de deltas de cargos a Cuenta Corriente originados offline (RF-07 / C-10).
 * Permite aplicar el Merge Aditivo en el nodo autoritativo y evaluar si detona `EXCESO_LIMITE_CREDITO_POST_SYNC`.
 */
export class SyncCuentaCorrienteDeltaDto {
  @IsUUID('4', { message: 'id_cliente debe ser un UUIDv4 válido' })
  id_cliente!: string;

  @IsUUID('4', { message: 'id_venta debe ser un UUIDv4 válido' })
  id_venta!: string;

  @IsNumber({}, { message: 'monto_credito debe ser un número válido' })
  @IsPositive({ message: 'monto_credito debe ser mayor a 0' })
  monto_credito!: number;

  @IsInt({ message: 'expected_version debe ser un entero para validación OCC' })
  @Min(0)
  expected_version!: number;

  @IsUUIDOrNil({
    message:
      'id_usuario_sincronizador debe ser un UUIDv4 válido o UUID_SYSTEM_BOT',
  })
  id_usuario_sincronizador!: string;
}
