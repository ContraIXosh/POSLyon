import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CrearCategoriaDto {
  @IsString({ message: 'nombre debe ser string' })
  @IsNotEmpty({ message: 'nombre es obligatorio' })
  @MinLength(2, { message: 'nombre debe tener al menos 2 caracteres' })
  @MaxLength(100, { message: 'nombre no puede exceder 100 caracteres' })
  nombre!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  descripcion?: string;
}
