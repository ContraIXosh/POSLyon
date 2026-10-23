import {
  IsUUID,
  IsNotEmpty,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  IsNumber,
  Min,
  IsOptional,
  IsString,
  IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ItemRecepcionTransferenciaDto {
  @IsUUID('4', { message: 'id_producto debe ser un UUIDv4 válido' })
  @IsNotEmpty()
  id_producto!: string;

  @IsNumber({}, { message: 'cantidad_recibida debe ser un número válido' })
  @Min(0, { message: 'cantidad_recibida no puede ser negativa' })
  cantidad_recibida!: number;

  @IsOptional()
  @IsString()
  estado_item?: string;
}

export class RecibirTransferenciaDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'Debe detallar los productos recibidos' })
  @ValidateNested({ each: true })
  @Type(() => ItemRecepcionTransferenciaDto)
  detalles_recibidos!: ItemRecepcionTransferenciaDto[];

  @IsOptional()
  @IsString()
  motivo_discrepancia?: string;

  @IsInt({ message: 'expected_version debe ser un entero para control OCC' })
  @Min(1)
  expected_version!: number;
}
