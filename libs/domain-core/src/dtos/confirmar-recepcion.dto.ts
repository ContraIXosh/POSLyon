import { Type } from 'class-transformer';
import {
  IsUUID,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  IsBoolean,
  IsNumber,
  Min,
} from 'class-validator';

/**
 * Sub-DTO que representa la confirmación física de cada renglón del remito en depósito (RF-15).
 */
export class RenglonConfirmacionDto {
  @IsUUID('4', { message: 'id_detalle debe ser un UUIDv4 válido' })
  id_detalle!: string;

  @IsNumber()
  @Min(0, { message: 'cantidad_recibida no puede ser negativa' })
  cantidad_recibida!: number;

  @IsBoolean({ message: 'aplicar_precio_sugerido debe ser un valor booleano' })
  aplicar_precio_sugerido!: boolean;
}

/**
 * DTO para confirmar y cerrar de forma inmutable una Recepción de Mercadería (`CONFIRMADA`, RF-15).
 * Suma `cantidad_recibida` al `stock_fisico`, actualiza `precio_costo` y, si corresponde, `precio_minorista`.
 */
export class ConfirmarRecepcionDto {
  @IsUUID('4', { message: 'id_recepcion debe ser un UUIDv4 válido' })
  id_recepcion!: string;

  @IsArray()
  @ArrayMinSize(1, {
    message:
      'Se debe confirmar al menos 1 renglón en la recepción de mercadería',
  })
  @ValidateNested({ each: true })
  @Type(() => RenglonConfirmacionDto)
  renglones!: RenglonConfirmacionDto[];
}
