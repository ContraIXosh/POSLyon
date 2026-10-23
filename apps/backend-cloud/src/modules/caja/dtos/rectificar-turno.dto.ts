import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class RectificarTurnoDto {
  @IsNumber({}, { message: 'efectivo_rectificado debe ser un valor numérico' })
  @Min(0, { message: 'El efectivo rectificado no puede ser negativo' })
  efectivo_rectificado!: number;

  @IsUUID('4', { message: 'id_supervisor debe ser un UUIDv4 válido' })
  @IsNotEmpty({ message: 'id_supervisor es obligatorio' })
  id_supervisor!: string;

  @IsInt({ message: 'version debe ser entero (Control OCC)' })
  @Min(1)
  version!: number;

  @IsString({ message: 'motivo es obligatorio para la rectificación forense (RF-17)' })
  @IsNotEmpty({ message: 'Debe justificar documentalmente el motivo de la rectificación' })
  motivo!: string;
}
