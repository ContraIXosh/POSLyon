import {
  IsUUID,
  IsEnum,
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  IsOptional,
  ValidateIf,
} from 'class-validator';
import { AccionReconciliacion } from '../enums/accion-reconciliacion.enum';

/**
 * DTO validado para procesar la Reconciliación de Códigos Huérfanos / Artículos Comodín (RF-13).
 *
 * Implementa validaciones condicionales (`@ValidateIf`):
 * - Si `accion === CREAR_NUEVO`: exige `nombre_oficial`, `id_categoria`, `precio_minorista` y `stock_fisico_actual` (Resolución C-18).
 * - Si `accion === VINCULAR_EXISTENTE`: exige `id_producto_existente` y admite opcionalmente `ajuste_stock` (Resolución C-19).
 * - Incluye obligatoriamente `id_sucursal` para aislar existencias por tienda (Resolución C-22).
 * - Admite conciliar por `codigo_comodin` o por `nombre_comodin` cuando fue digitado sin código (Resolución O-27).
 */
export class ReconciliarCodigoHuerfanoDto {
  @IsUUID('4', {
    message:
      'id_sucursal es obligatorio y debe ser un UUIDv4 válido (Resolución C-22)',
  })
  @IsNotEmpty()
  id_sucursal!: string;

  @IsOptional()
  @IsString()
  codigo_comodin?: string | null;

  @ValidateIf((o: ReconciliarCodigoHuerfanoDto) => !o.codigo_comodin)
  @IsString({
    message:
      'nombre_comodin es obligatorio cuando el artículo comodín no posee código de barras (Resolución O-27)',
  })
  @IsNotEmpty({
    message:
      'Debe especificar codigo_comodin o nombre_comodin para identificar las ventas huérfanas',
  })
  nombre_comodin?: string | null;

  @IsEnum(AccionReconciliacion, {
    message: 'accion debe ser CREAR_NUEVO o VINCULAR_EXISTENTE',
  })
  accion!: AccionReconciliacion;

  // --- Campos condicionales requeridos si accion === CREAR_NUEVO ---

  @ValidateIf(
    (o: ReconciliarCodigoHuerfanoDto) =>
      o.accion === AccionReconciliacion.CREAR_NUEVO,
  )
  @IsString()
  @IsNotEmpty({
    message: 'nombre_oficial es obligatorio al crear un nuevo producto oficial',
  })
  nombre_oficial?: string;

  @ValidateIf(
    (o: ReconciliarCodigoHuerfanoDto) =>
      o.accion === AccionReconciliacion.CREAR_NUEVO,
  )
  @IsUUID('4', {
    message:
      'id_categoria es obligatorio y debe ser un UUIDv4 válido al crear un nuevo producto',
  })
  id_categoria?: string;

  @ValidateIf(
    (o: ReconciliarCodigoHuerfanoDto) =>
      o.accion === AccionReconciliacion.CREAR_NUEVO,
  )
  @IsNumber()
  @Min(0, { message: 'precio_minorista no puede ser negativo' })
  precio_minorista?: number;

  @ValidateIf(
    (o: ReconciliarCodigoHuerfanoDto) =>
      o.accion === AccionReconciliacion.CREAR_NUEVO,
  )
  @IsNumber()
  @Min(0, {
    message:
      'stock_fisico_actual (conteo real en góndola) debe ser mayor o igual a 0',
  })
  stock_fisico_actual?: number;

  // --- Campos condicionales requeridos si accion === VINCULAR_EXISTENTE ---

  @ValidateIf(
    (o: ReconciliarCodigoHuerfanoDto) =>
      o.accion === AccionReconciliacion.VINCULAR_EXISTENTE,
  )
  @IsUUID('4', {
    message:
      'id_producto_existente es obligatorio y debe ser un UUIDv4 válido al vincular a producto existente',
  })
  id_producto_existente?: string;

  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'ajuste_stock no puede ser negativo' })
  ajuste_stock?: number;
}
