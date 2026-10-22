/**
 * Contrato inmutable de pago asociado a una venta (ERD: PAGO_VENTA).
 * Soporta pagos simples, fiados y pagos mixtos heterogéneos (RF-05).
 */
export interface IPagoVenta {
  id: string; // UUIDv4
  id_venta: string; // UUIDv4 FK
  id_metodo_pago: string; // UUIDv4 FK a METODO_PAGO (Efectivo, Tarjeta, Cuenta Corriente, etc.)
  monto: number; // Importe asignado a este medio de pago (> 0.00)
  created_at: string; // ISO 8601 UTC
}
