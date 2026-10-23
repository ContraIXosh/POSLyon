import {
  IsString,
  IsOptional,
  IsNumber,
  Min,
  IsInt,
  IsEmail,
  IsNotEmpty,
} from 'class-validator';

/**
 * DTO para la actualización de datos de cliente y modificación de cupo de crédito (RF-07 / OCC).
 */
export class ActualizarClienteDto {
  @IsOptional()
  @IsString({ message: 'nombre debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El nombre del cliente no puede estar vacío' })
  nombre?: string;

  @IsOptional()
  @IsString({ message: 'dni_cuit debe ser una cadena de texto' })
  dni_cuit?: string;

  @IsOptional()
  @IsString({ message: 'telefono debe ser una cadena de texto' })
  telefono?: string;

  @IsOptional()
  @IsEmail({}, { message: 'email debe tener un formato de correo electrónico válido' })
  email?: string;

  @IsOptional()
  @IsNumber({}, { message: 'limite_credito debe ser un valor numérico' })
  @Min(0, { message: 'El límite de crédito no puede ser negativo' })
  limite_credito?: number;

  @IsInt({ message: 'expected_version debe ser un número entero' })
  @Min(1, { message: 'expected_version debe ser mayor o igual a 1' })
  expected_version!: number;
}
