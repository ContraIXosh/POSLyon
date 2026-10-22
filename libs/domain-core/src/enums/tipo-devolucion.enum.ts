/**
 * Modalidad de compensación financiera al emitir una Nota de Crédito por devolución (RF-10).
 * - EFECTIVO_CAJA: Egreso físico de billetes en el turno actual (admite compensación mixta si hay deuda residual menor al reembolso).
 * - REDUCCION_DEUDA: Crédito directo a favor en la Cuenta Corriente del cliente sin tocar efectivo de gaveta.
 * - SIN_REINTEGRO_MONETARIO: Aplicable cuando la venta original no había ingresado dinero físico a caja.
 */
export enum TipoDevolucion {
  EFECTIVO_CAJA = 'EFECTIVO_CAJA',
  REDUCCION_DEUDA = 'REDUCCION_DEUDA',
  SIN_REINTEGRO_MONETARIO = 'SIN_REINTEGRO_MONETARIO',
}
