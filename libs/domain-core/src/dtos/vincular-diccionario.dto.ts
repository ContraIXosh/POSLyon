import { IsUUID, IsString, IsNotEmpty } from 'class-validator';

/**
 * DTO para dar de alta o vincular un alias de factura de proveedor hacia el catálogo oficial (RF-14).
 * Respalda la restricción de unicidad compuesta `UNIQUE(id_proveedor, nombre_en_factura)`.
 */
export class VincularDiccionarioDto {
  @IsUUID('4', { message: 'id_proveedor debe ser un UUIDv4 válido' })
  id_proveedor!: string;

  @IsUUID('4', { message: 'id_producto debe ser un UUIDv4 válido' })
  id_producto!: string;

  @IsString({ message: 'nombre_en_factura debe ser una cadena de texto' })
  @IsNotEmpty({
    message:
      'El texto impreso en la factura (nombre_en_factura) no puede estar vacío',
  })
  nombre_en_factura!: string;
}
