import {
  IsUUID,
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
  IsEmail,
} from 'class-validator';

/**
 * DTO para la creación de un nuevo cliente con asignación de límite de crédito inicial (RF-07).
 */
export class CrearClienteDto {
  @IsUUID('4', { message: 'id_sucursal debe ser un UUIDv4 válido' })
  id_sucursal!: string;

  @IsString({ message: 'nombre debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El nombre del cliente no puede estar vacío' })
  nombre!: string;

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
  limite_credito?: number = 0;
}
