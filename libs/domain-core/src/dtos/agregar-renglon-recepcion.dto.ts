import {
  IsUUID,
  IsNumber,
  IsPositive,
  Min,
  IsOptional,
  IsString,
} from 'class-validator';

/**
 * DTO para incorporar un renglón (manual o importado desde factura) a una Recepción de Mercadería (RF-14 / RF-15).
 */
export class AgregarRenglonRecepcionDto {
  @IsUUID('4', { message: 'id_recepcion_mercaderia debe ser un UUIDv4 válido' })
  id_recepcion_mercaderia!: string;

  @IsUUID('4', { message: 'id_producto debe ser un UUIDv4 válido' })
  id_producto!: string;

  @IsNumber()
  @Min(0, { message: 'cantidad_declarada no puede ser negativa' })
  cantidad_declarada!: number;

  @IsNumber()
  @IsPositive({
    message: 'costo_unitario facturado debe ser estrictamente mayor a 0',
  })
  costo_unitario!: number;

  @IsOptional()
  @IsString()
  nombre_en_factura?: string;
}
