import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { TipoMovimientoCaja } from '@poslyon/domain-core';

export class CrearMovimientoCajaDto {
  @IsUUID('4', { message: 'id_turno_caja debe ser un UUIDv4 válido' })
  @IsNotEmpty({ message: 'id_turno_caja es obligatorio' })
  id_turno_caja!: string;

  @IsUUID('4', { message: 'id_usuario debe ser un UUIDv4 válido' })
  @IsNotEmpty({ message: 'id_usuario es obligatorio' })
  id_usuario!: string;

  @IsOptional()
  @IsUUID('4', { message: 'id_metodo_pago debe ser un UUIDv4 válido' })
  id_metodo_pago?: string;

  @IsEnum(TipoMovimientoCaja, { message: 'tipo_movimiento debe ser INGRESO o EGRESO' })
  tipo_movimiento!: TipoMovimientoCaja;

  @IsNumber({}, { message: 'monto debe ser un valor numérico' })
  @Min(0.01, { message: 'El importe del movimiento debe ser mayor a cero' })
  monto!: number;

  @IsString({ message: 'concepto debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'concepto es obligatorio' })
  concepto!: string;

  @IsOptional()
  @IsBoolean({ message: 'afecta_caja_fisica debe ser booleano' })
  afecta_caja_fisica?: boolean;

  @IsString({ message: 'motivo es obligatorio para auditoría forense (RF-19)' })
  @IsNotEmpty({ message: 'motivo no puede estar vacío' })
  motivo!: string;
}
