import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class AsignarSucursalDto {
  @IsUUID('4', { message: 'id_sucursal debe ser un UUIDv4 válido' })
  @IsNotEmpty({ message: 'id_sucursal es obligatorio' })
  id_sucursal!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  rol?: string;

  @IsString({ message: 'motivo es obligatorio para auditoría forense (RF-19)' })
  @IsNotEmpty({ message: 'motivo no puede estar vacío' })
  motivo!: string;
}
