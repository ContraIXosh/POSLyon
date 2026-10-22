import { TipoMovimientoCC } from '../enums/tipo-movimiento-cc.enum';

/**
 * Asiento contable inmutable del Libro Mayor de Cuenta Corriente (ERD: CUENTA_CORRIENTE - RF-08).
 * Patrón Signed Ledger: montos positivos incrementan deuda, montos negativos acreditan pagos/devoluciones.
 */
export interface ICuentaCorriente {
  id: string; // UUIDv4 PK (Idempotencia unificada O-22)
  id_cliente: string; // UUIDv4 FK
  id_venta?: string | null; // Venta generadora si es VENTA_CREDITO
  id_nota_credito?: string | null; // Nota de crédito si es AJUSTE_DEVOLUCION
  id_metodo_pago?: string | null; // Medio de pago si es ABONO
  monto: number; // Positivo (+cargo) o Negativo (-abono/-devolución)
  tipo_movimiento: TipoMovimientoCC;
  fecha: string; // ISO 8601 UTC
  created_at?: string;
  updated_at?: string;
}
