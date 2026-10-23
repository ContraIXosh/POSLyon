import { IsUUID, IsString, IsNotEmpty } from 'class-validator';

/**
 * DTO para iniciar una orden de Recepción de Mercadería (en estado inicial `BORRADOR`, RF-14 / RF-15).
 */
export class CrearRecepcionDto {
  @IsUUID('4', { message: 'id_sucursal debe ser un UUIDv4 válido' })
  id_sucursal!: string;

  @IsUUID('4', { message: 'id_proveedor debe ser un UUIDv4 válido' })
  id_proveedor!: string;

  @IsUUID('4', { message: 'id_usuario debe ser un UUIDv4 válido' })
  id_usuario!: string;

  @IsString()
  @IsNotEmpty({
    message: 'numero_remito (identificador del comprobante) es obligatorio',
  })
  numero_remito!: string;
}
