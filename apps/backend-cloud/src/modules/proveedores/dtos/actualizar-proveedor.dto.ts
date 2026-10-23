import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
} from 'class-validator';

/**
 * DTO para la actualización de datos de contacto de un proveedor comercial.
 */
export class ActualizarProveedorDto {
  @IsOptional()
  @IsString({ message: 'razon_social debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'La razón social no puede estar vacía' })
  razon_social?: string;

  @IsOptional()
  @IsString({ message: 'cuit debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El CUIT no puede estar vacío' })
  cuit?: string;

  @IsOptional()
  @IsString({ message: 'contacto_telefono debe ser una cadena de texto' })
  contacto_telefono?: string;

  @IsOptional()
  @IsEmail({}, { message: 'contacto_email debe tener un formato de correo electrónico válido' })
  contacto_email?: string;
}
