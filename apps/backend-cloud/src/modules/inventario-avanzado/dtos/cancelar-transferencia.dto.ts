import { IsInt, Min, IsString, IsNotEmpty } from 'class-validator';

export class CancelarTransferenciaDto {
  @IsString()
  @IsNotEmpty({ message: 'El motivo de cancelación es obligatorio' })
  motivo!: string;

  @IsInt({ message: 'expected_version debe ser un entero para control OCC' })
  @Min(1)
  expected_version!: number;
}
