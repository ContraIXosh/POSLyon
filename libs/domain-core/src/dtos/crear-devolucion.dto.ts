import { Type } from 'class-transformer';
import {
  IsUUID,
  IsEnum,
  IsString,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import { TipoDevolucion } from '../enums/tipo-devolucion.enum';
import { ItemDevolucionDto } from './item-devolucion.dto';

/**
 * DTO de entrada para emitir una Nota de Crédito y procesar una devolución desacoplada temporalmente (RF-09, RF-10, RF-11).
 *
 * - `id_venta`: Apunta al comprobante histórico original inmutable (para consultar snapshots de precios y descuentos).
 * - `id_turno_caja`: Apunta al turno de caja ACTIVO hoy donde impacta el movimiento financiero (Arqueo Ciego RF-17).
 * - `confirmar_sin_dinero`: Flag de confirmación explícita requerido cuando la venta original está en `PENDIENTE` (Resolución O-15).
 */
export class CrearDevolucionDto {
  @IsUUID('4', { message: 'id_venta debe ser un UUIDv4 válido' })
  id_venta!: string;

  @IsUUID('4', { message: 'id_turno_caja debe ser un UUIDv4 válido' })
  id_turno_caja!: string;

  @IsEnum(TipoDevolucion, {
    message:
      'tipo_devolucion debe ser EFECTIVO_CAJA, REDUCCION_DEUDA o SIN_REINTEGRO_MONETARIO',
  })
  tipo_devolucion!: TipoDevolucion;

  @IsString({ message: 'motivo debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El motivo de la devolución es obligatorio' })
  motivo!: string;

  @IsArray({ message: 'items debe ser un arreglo de artículos a devolver' })
  @ArrayMinSize(1, {
    message: 'Se debe incluir al menos 1 artículo en la devolución',
  })
  @ValidateNested({ each: true })
  @Type(() => ItemDevolucionDto)
  items!: ItemDevolucionDto[];

  @IsOptional()
  @IsBoolean({ message: 'confirmar_sin_dinero debe ser un valor booleano' })
  confirmar_sin_dinero?: boolean;
}
