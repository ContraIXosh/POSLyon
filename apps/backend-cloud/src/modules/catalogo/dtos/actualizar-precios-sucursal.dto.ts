import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class ActualizarPreciosSucursalDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  precio_costo?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  precio_minorista?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  precio_mayorista?: number;

  @IsInt({ message: 'version debe ser entero (OCC)' })
  @Min(1)
  version!: number;

  @IsString({ message: 'motivo es obligatorio para auditoría forense (RF-19)' })
  @IsNotEmpty({ message: 'motivo no puede estar vacío' })
  motivo!: string;
}
