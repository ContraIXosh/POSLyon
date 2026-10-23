import {
  IsNotEmpty,
  IsNumber,
  IsUUID,
  Min,
} from 'class-validator';

export class AbrirTurnoDto {
  @IsUUID('4', { message: 'id_sucursal debe ser un UUIDv4 válido' })
  @IsNotEmpty({ message: 'id_sucursal es obligatorio' })
  id_sucursal!: string;

  @IsUUID('4', { message: 'id_usuario debe ser un UUIDv4 válido' })
  @IsNotEmpty({ message: 'id_usuario es obligatorio' })
  id_usuario!: string;

  @IsNumber({}, { message: 'monto_inicial_efectivo debe ser un valor numérico' })
  @Min(0, { message: 'El fondo inicial de cambio no puede ser negativo' })
  monto_inicial_efectivo!: number;
}
