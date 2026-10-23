import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
} from 'class-validator';

/**
 * DTO para el registro de un nuevo proveedor comercial (ERD: PROVEEDOR).
 */
export class CrearProveedorDto {
  @IsString({ message: 'razon_social debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'La razón social del proveedor no puede estar vacía' })
  razon_social!: string;

  @IsString({ message: 'cuit debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El identificador fiscal CUIT/RUT es obligatorio' })
  cuit!: string;

  @IsOptional()
  @IsString({ message: 'contacto_telefono debe ser una cadena de texto' })
  contacto_telefono?: string;

  @IsOptional()
  @IsEmail({}, { message: 'contacto_email debe tener un formato de correo electrónico válido' })
  contacto_email?: string;
}
