import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsString,
  Min,
} from 'class-validator';

export class CerrarTurnoCiegoDto {
  @IsNumber({}, { message: 'efectivo_declarado_ciego debe ser numérico' })
  @Min(0, { message: 'El efectivo declarado no puede ser negativo' })
  efectivo_declarado_ciego!: number;

  @IsInt({ message: 'version debe ser un número entero (Control OCC)' })
  @Min(1)
  version!: number;

  @IsString({ message: 'motivo es obligatorio para auditoría forense (RF-19)' })
  @IsNotEmpty({ message: 'motivo no puede estar vacío' })
  motivo!: string;
}
