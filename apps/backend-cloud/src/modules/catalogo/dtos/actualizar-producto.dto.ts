import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { TipoVentaProducto } from '@poslyon/domain-core';

export class ActualizarProductoDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  nombre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  descripcion?: string;

  @IsOptional()
  @IsUUID('4')
  id_categoria?: string;

  @IsOptional()
  @IsEnum(TipoVentaProducto)
  tipo_venta?: TipoVentaProducto;

  @IsOptional()
  @IsNumber()
  @Min(0.001)
  multiplicador_stock?: number;

  @IsInt({ message: 'version debe ser entero (Control OCC)' })
  @Min(1)
  version!: number;

  @IsString({ message: 'motivo es obligatorio para auditoría forense (RF-19)' })
  @IsNotEmpty({ message: 'motivo no puede estar vacío' })
  motivo!: string;
}
