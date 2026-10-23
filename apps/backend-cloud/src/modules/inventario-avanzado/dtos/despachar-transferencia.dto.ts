import { IsInt, Min } from 'class-validator';

export class DespacharTransferenciaDto {
  @IsInt({ message: 'expected_version debe ser un entero' })
  @Min(1)
  expected_version!: number;
}
