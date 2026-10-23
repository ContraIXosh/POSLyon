import {
  IsUUID,
  IsEnum,
  IsNumber,
  IsInt,
  Min,
  IsString,
  IsNotEmpty,
} from 'class-validator';
import { TipoAjusteStock } from '../enums/tipo-ajuste-stock.enum';

/**
 * DTO para realizar un ajuste manual de existencias en una sucursal (RF-02 / UC12).
 * Exige `expected_version` (OCC) y `motivo` obligatorio para auditoría forense (`AUDITORIA`).
 */
export class AjustarStockManualDto {
  @IsUUID('4', { message: 'id_sucursal debe ser un UUIDv4 válido' })
  id_sucursal!: string;

  @IsUUID('4', { message: 'id_producto debe ser un UUIDv4 válido' })
  id_producto!: string;

  @IsEnum(TipoAjusteStock, {
    message:
      'tipo_ajuste debe ser un valor válido del catálogo TipoAjusteStock',
  })
  tipo_ajuste!: TipoAjusteStock;

  @IsNumber(
    {},
    {
      message:
        'cantidad_nueva debe ser un valor numérico (admite negativos bajo C-12)',
    },
  )
  cantidad_nueva!: number;

  @IsInt({ message: 'expected_version debe ser un entero para validación OCC' })
  @Min(0)
  expected_version!: number;

  @IsString({ message: 'motivo debe ser un texto' })
  @IsNotEmpty({
    message:
      'El motivo del ajuste manual de stock es obligatorio para el registro de auditoría forense (RF-19)',
  })
  motivo!: string;
}
