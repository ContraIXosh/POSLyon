import {
  ArrayNotEmpty,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class AsignarPermisosDto {
  @IsArray({ message: 'codigos_permisos debe ser un arreglo' })
  @ArrayNotEmpty({ message: 'Debe especificar al menos un permiso' })
  @IsString({ each: true, message: 'Cada permiso debe ser un string con el código' })
  codigos_permisos!: string[];

  @IsOptional()
  @IsUUID('4', { message: 'id_sucursal debe ser un UUIDv4 válido' })
  id_sucursal?: string;

  @IsString({ message: 'motivo es obligatorio para auditoría forense (RF-19)' })
  @IsNotEmpty({ message: 'motivo no puede estar vacío' })
  motivo!: string;
}
