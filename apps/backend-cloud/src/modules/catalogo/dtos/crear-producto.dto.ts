import {
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TipoVentaProducto } from '@poslyon/domain-core';

export class PrecioSucursalInicialDto {
  @IsUUID('4', { message: 'id_sucursal debe ser un UUIDv4 válido' })
  @IsNotEmpty()
  id_sucursal!: string;

  @IsNumber({}, { message: 'precio_costo debe ser numérico' })
  @Min(0)
  precio_costo!: number;

  @IsNumber({}, { message: 'precio_minorista debe ser numérico' })
  @Min(0)
  precio_minorista!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  precio_mayorista?: number;

  @IsOptional()
  @IsNumber()
  stock_inicial?: number;
}

export class CrearProductoDto {
  @IsString({ message: 'nombre debe ser string' })
  @IsNotEmpty({ message: 'nombre es obligatorio' })
  @MinLength(2, { message: 'nombre debe tener al menos 2 caracteres' })
  @MaxLength(150, { message: 'nombre no puede exceder 150 caracteres' })
  nombre!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  descripcion?: string;

  @IsOptional()
  @IsUUID('4', { message: 'id_categoria debe ser un UUIDv4 válido' })
  id_categoria?: string;

  @IsOptional()
  @IsEnum(TipoVentaProducto, { message: 'tipo_venta debe ser UNIDAD, PESABLE o PACK' })
  tipo_venta?: TipoVentaProducto;

  @IsOptional()
  @IsNumber()
  @Min(0.001)
  multiplicador_stock?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  codigos_barra?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PrecioSucursalInicialDto)
  precios_sucursales?: PrecioSucursalInicialDto[];
}
