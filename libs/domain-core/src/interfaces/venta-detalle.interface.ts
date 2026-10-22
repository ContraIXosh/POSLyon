import { TipoPrecio } from '../enums/tipo-efecto-promocion.enum';

/**
 * Contrato inmutable para el renglón de detalle de venta (ERD: VENTA_DETALLE).
 * Aislamiento estricto entre el snapshot de precio de lista y los descuentos promocionales (RF-06).
 */
export interface IVentaDetalle {
  id: string; // UUIDv4
  id_venta: string; // UUIDv4 FK
  id_producto: string; // UUIDv4 (UUID_ARTICULO_COMODIN si es venta rápida)
  cantidad: number; // Decimal para pesables/granel (RF-04)
  precio_unitario: number; // Snapshot inmutable del precio lista de góndola al escanear
  id_promocion_aplicada?: string | null; // UUIDv4 FK opcional
  monto_descuento: number; // Descuento aditivo calculado por la promoción (>= 0.00)
  tipo_precio: TipoPrecio; // MINORISTA | MAYORISTA
  codigo_comodin?: string | null; // Código escaneado original si fue comodín (RF-12)
  nombre_comodin?: string | null; // Descripción ingresada en mostrador si fue comodín
}
