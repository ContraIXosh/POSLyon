/**
 * Tipificación de asientos del Libro Mayor en Cuenta Corriente (Patrón Signed Ledger - RF-08).
 * - VENTA_CREDITO: Asiento con signo positivo (+monto) que incrementa la deuda del cliente.
 * - ABONO: Asiento con signo negativo (-monto) por pago presencial o transferencia del cliente.
 * - AJUSTE_DEVOLUCION: Asiento con signo negativo (-monto) originado por una Nota de Crédito (RF-10).
 */
export enum TipoMovimientoCC {
  VENTA_CREDITO = 'VENTA_CREDITO',
  ABONO = 'ABONO',
  AJUSTE_DEVOLUCION = 'AJUSTE_DEVOLUCION',
}
