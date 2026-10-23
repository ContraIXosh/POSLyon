import {
  IsUUID,
  IsNumber,
  IsPositive,
  IsOptional,
  IsString,
  IsNotEmpty,
} from 'class-validator';

export class CrearAlertaCuarentenaDto {
  @IsUUID('4', { message: 'id_sucursal debe ser un UUIDv4 válido' })
  @IsNotEmpty()
  id_sucursal!: string;

  @IsUUID('4', { message: 'id_producto debe ser un UUIDv4 válido' })
  @IsNotEmpty()
  id_producto!: string;

  @IsOptional()
  @IsUUID('4', { message: 'id_venta debe ser un UUIDv4 válido' })
  id_venta?: string;

  @IsNumber({}, { message: 'cantidad_faltante debe ser un número válido' })
  @IsPositive({ message: 'cantidad_faltante debe ser mayor a 0' })
  cantidad_faltante!: number;

  @IsOptional()
  @IsString()
  observacion?: string;
}
