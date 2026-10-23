import {
  IsUUID,
  IsPositive,
  IsInt,
  Min,
  IsIn,
  IsNumber,
} from 'class-validator';

/**
 * DTO para registrar un abono global a la Cuenta Corriente de un cliente (RF-08).
 *
 * - `id`: UUIDv4 generado en el cliente para garantizar Idempotencia Unificada (`ON CONFLICT (id) DO NOTHING`, Resolución O-22)
 *   cuando el abono viaja tanto por REST directo como por Push Delta.
 * - `id_metodo_pago` y `metodo_pago`: Permiten discriminar si el abono afecta el efectivo físico de la gaveta (Resolución O-21).
 * - `expected_version`: Versión OCC esperada de la entidad `CLIENTE` para control de concurrencia optimista (RNF-04).
 */
export class RegistrarAbonoDto {
  @IsUUID('4', {
    message:
      'id del abono debe ser un UUIDv4 válido para garantizar idempotencia (O-22)',
  })
  id!: string;

  @IsUUID('4', { message: 'id_cliente debe ser un UUIDv4 válido' })
  id_cliente!: string;

  @IsUUID('4', { message: 'id_turno_caja debe ser un UUIDv4 válido' })
  id_turno_caja!: string;

  @IsNumber({}, { message: 'monto debe ser un valor numérico' })
  @IsPositive({ message: 'El monto del abono debe ser estrictamente mayor a 0' })
  monto!: number;

  @IsUUID('4', {
    message: 'id_metodo_pago debe ser un UUIDv4 válido (Resolución O-21)',
  })
  id_metodo_pago!: string;

  @IsIn(['EFECTIVO', 'TRANSFERENCIA'], {
    message: 'metodo_pago debe ser EFECTIVO o TRANSFERENCIA',
  })
  metodo_pago!: 'EFECTIVO' | 'TRANSFERENCIA';

  @IsInt({ message: 'expected_version debe ser un número entero' })
  @Min(0, { message: 'expected_version no puede ser negativo' })
  expected_version!: number;
}
