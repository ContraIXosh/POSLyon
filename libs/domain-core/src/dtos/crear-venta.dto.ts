import { Type } from 'class-transformer';
import {
  IsUUID,
  IsArray,
  ValidateNested,
  IsPositive,
  IsNumber,
  IsOptional,
  IsEnum,
  IsString,
  Min,
} from 'class-validator';
import { TipoPrecio } from '../enums/tipo-efecto-promocion.enum';
import { IsUUIDOrNil } from '../validators/is-uuid-or-nil.decorator';

/**
 * Sub-DTO que representa una línea de pago dentro de una venta (RF-05 Pagos Mixtos).
 */
export class PagoItemDto {
  @IsUUID('4', {
    message: 'id_metodo_pago debe ser un identificador UUIDv4 válido',
  })
  id_metodo_pago!: string;

  @IsNumber(
    {},
    { message: 'monto debe ser un valor numérico válido' },
  )
  @IsPositive({ message: 'monto del pago debe ser estrictamente mayor a 0' })
  monto!: number;
}

/**
 * Sub-DTO que representa un renglón del ticket de venta (RF-01 / RF-04 / RF-06).
 */
export class ItemVentaDto {
  @IsUUIDOrNil({
    message: 'id_producto debe ser un UUIDv4 válido o el UUID reservado del comodín',
  })
  id_producto!: string;

  @IsNumber()
  @IsPositive({ message: 'cantidad debe ser estrictamente mayor a 0' })
  cantidad!: number;

  @IsNumber()
  @IsPositive({ message: 'precio_unitario (snapshot) debe ser mayor a 0' })
  precio_unitario!: number;

  @IsOptional()
  @IsUUID('4', { message: 'id_promocion_aplicada debe ser un UUIDv4 válido' })
  id_promocion_aplicada?: string;

  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'monto_descuento no puede ser negativo' })
  monto_descuento?: number;

  @IsOptional()
  @IsEnum(TipoPrecio, { message: 'tipo_precio debe ser MINORISTA o MAYORISTA' })
  tipo_precio?: TipoPrecio;

  @IsOptional()
  @IsString()
  codigo_comodin?: string;

  @IsOptional()
  @IsString()
  nombre_comodin?: string;
}

/**
 * DTO universal de creación y confirmación de venta para pagos simples, fiados o mixtos (RF-01, RF-05, RF-17).
 * Recibe un arreglo de pagos heterogéneos y asocia de forma inmutable la venta al turno de caja activo (`id_turno_caja`).
 */
export class CrearVentaDto {
  @IsUUID('4', { message: 'id_sucursal debe ser un UUIDv4 válido' })
  id_sucursal!: string;

  @IsUUID('4', {
    message:
      'id_turno_caja es obligatorio y debe ser un UUIDv4 válido para fijación en arqueo (RF-17)',
  })
  id_turno_caja!: string;

  @IsUUID('4', { message: 'id_usuario debe ser un UUIDv4 válido' })
  id_usuario!: string;

  @IsOptional()
  @IsUUID('4', { message: 'id_cliente debe ser un UUIDv4 válido' })
  id_cliente?: string | null;

  @IsNumber({}, { message: 'total debe ser un número válido' })
  @IsPositive({ message: 'total de la venta debe ser mayor a 0' })
  total!: number;

  @IsArray({ message: 'pagos debe ser un arreglo de ítems de pago' })
  @ValidateNested({ each: true })
  @Type(() => PagoItemDto)
  pagos!: PagoItemDto[];

  @IsOptional()
  @IsArray({ message: 'items debe ser un arreglo de ítems de venta' })
  @ValidateNested({ each: true })
  @Type(() => ItemVentaDto)
  items?: ItemVentaDto[];
}
