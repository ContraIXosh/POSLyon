import { Type } from 'class-transformer';
import {
  IsUUID,
  IsArray,
  ValidateNested,
  IsPositive,
  IsNumber,
  IsEnum,
  IsOptional,
  ArrayMinSize,
} from 'class-validator';
import { TipoPrecio } from '../enums/tipo-efecto-promocion.enum';
import { IsUUIDOrNil } from '../validators/is-uuid-or-nil.decorator';

/**
 * Sub-DTO que representa un renglón del carrito sujeto a evaluación promocional (RF-06).
 */
export class ItemPromocionCarritoDto {
  @IsUUIDOrNil({
    message:
      'id_producto debe ser un UUIDv4 válido o el UUID reservado del comodín',
  })
  id_producto!: string;

  @IsNumber()
  @IsPositive({ message: 'cantidad debe ser mayor a 0' })
  cantidad!: number;

  @IsNumber()
  @IsPositive({
    message: 'precio_unitario (snapshot) debe ser estrictamente positivo',
  })
  precio_unitario!: number;

  @IsEnum(TipoPrecio, {
    message: 'tipo_precio debe ser MINORISTA o MAYORISTA',
  })
  tipo_precio!: TipoPrecio;
}

/**
 * DTO para solicitar el cálculo o recálculo dinámico de promociones aditivas sobre el carrito (RF-06 / O-11).
 * Garantiza que el motor de promociones reciba el snapshot de precios sin mutar `precio_unitario`.
 */
export class AplicarPromocionDto {
  @IsUUID('4', { message: 'id_sucursal debe ser un UUIDv4 válido' })
  id_sucursal!: string;

  @IsArray()
  @ArrayMinSize(1, {
    message: 'El carrito debe contener al menos 1 ítem para evaluar promociones',
  })
  @ValidateNested({ each: true })
  @Type(() => ItemPromocionCarritoDto)
  items!: ItemPromocionCarritoDto[];

  @IsOptional()
  @IsUUID('4', { message: 'id_promocion debe ser un UUIDv4 válido' })
  id_promocion?: string | null;
}
