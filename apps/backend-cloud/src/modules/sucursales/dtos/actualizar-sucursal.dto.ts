import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class ActualizarSucursalDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  nombre?: string;

  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(255)
  direccion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  telefono?: string;

  @IsInt({ message: 'version debe ser un número entero (Control OCC)' })
  @Min(1, { message: 'version debe ser mayor o igual a 1' })
  version!: number;

  @IsString({ message: 'motivo es obligatorio para auditoría forense (RF-19)' })
  @IsNotEmpty({ message: 'motivo no puede estar vacío' })
  motivo!: string;
}
