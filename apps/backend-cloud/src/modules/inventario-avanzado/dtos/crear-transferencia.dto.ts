import {
  IsUUID,
  IsNotEmpty,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  IsNumber,
  IsPositive,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ItemTransferenciaDto {
  @IsUUID('4', { message: 'id_producto debe ser un UUIDv4 válido' })
  @IsNotEmpty()
  id_producto!: string;

  @IsNumber({}, { message: 'cantidad_enviada debe ser un número válido' })
  @IsPositive({ message: 'cantidad_enviada debe ser mayor a 0' })
  cantidad_enviada!: number;
}

export class CrearTransferenciaDto {
  @IsUUID('4', { message: 'id_sucursal_origen debe ser un UUIDv4 válido' })
  @IsNotEmpty()
  id_sucursal_origen!: string;

  @IsUUID('4', { message: 'id_sucursal_destino debe ser un UUIDv4 válido' })
  @IsNotEmpty()
  id_sucursal_destino!: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'La transferencia debe incluir al menos un producto' })
  @ValidateNested({ each: true })
  @Type(() => ItemTransferenciaDto)
  detalles!: ItemTransferenciaDto[];
}
