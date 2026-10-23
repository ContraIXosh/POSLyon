import {
  IsUUID,
  IsString,
  IsNotEmpty,
  IsEnum,
  IsNumber,
  Min,
  IsOptional,
} from 'class-validator';
import { TipoEfectoPromocion } from '@poslyon/domain-core';

/**
 * DTO para la creación de una regla de promoción en mostrador (RF-06).
 */
export class CrearPromocionDto {
  @IsUUID('4', { message: 'id_sucursal debe ser un UUIDv4 válido' })
  id_sucursal!: string;

  @IsString({ message: 'nombre de la promoción debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El nombre de la promoción no puede estar vacío' })
  nombre!: string;

  @IsEnum(TipoEfectoPromocion, {
    message: 'tipo_efecto debe ser PORCENTAJE, PRECIO_FIJO, CANTIDAD_BONIFICADA o MONTO_FIJO_DESCUENTO',
  })
  tipo_efecto!: TipoEfectoPromocion;

  @IsNumber({}, { message: 'valor_efecto debe ser un valor numérico' })
  @Min(0, { message: 'valor_efecto no puede ser negativo' })
  valor_efecto!: number;

  @IsNumber({}, { message: 'cantidad_minima debe ser un valor numérico' })
  @Min(1, { message: 'cantidad_minima debe ser al menos 1' })
  cantidad_minima!: number;

  @IsOptional()
  @IsUUID('4', { message: 'id_producto_aplicable debe ser un UUIDv4 válido' })
  id_producto_aplicable?: string | null;
}
