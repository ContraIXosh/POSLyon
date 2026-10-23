import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CrearUsuarioDto {
  @IsString({ message: 'nombre debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'nombre es obligatorio' })
  @MinLength(2, { message: 'nombre debe tener al menos 2 caracteres' })
  @MaxLength(100, { message: 'nombre no puede exceder 100 caracteres' })
  nombre!: string;

  @IsEmail({}, { message: 'email debe ser un correo electrónico válido' })
  @IsNotEmpty({ message: 'email es obligatorio' })
  @MaxLength(150, { message: 'email no puede exceder 150 caracteres' })
  email!: string;

  @IsString({ message: 'password debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'password es obligatorio' })
  @MinLength(6, { message: 'password debe tener al menos 6 caracteres' })
  password!: string;

  @IsOptional()
  @IsBoolean({ message: 'es_dueno debe ser booleano' })
  es_dueno?: boolean;
}
