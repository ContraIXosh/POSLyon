/**
 * Dimensión 3 de la Máquina de Estados Ortogonal de Venta: Situación Contable e Imputación Financiera.
 * Modela cómo se saldó (o adeuda) el importe total del comprobante.
 */
export enum EstadoFinanciero {
  PENDIENTE = 'PENDIENTE', // Venta en borrador, sin cobros registrados aún.
  PAGADO = 'PAGADO',       // 100% cobrado al instante (efectivo, débito, transferencia, QR).
  FIADO = 'FIADO',         // 100% cargado al libro mayor de CUENTA_CORRIENTE del cliente.
  PARCIAL = 'PARCIAL',     // Cobro mixto (RF-05): parte inmediata y saldo residual a cuenta corriente.
}
