/**
 * Máquina de Estados de TRANSFERENCIA_STOCK bajo protocolo Two-Phase Commit de Negocio (2PC - RF-16).
 * Evita que la mercadería desaparezca o se sume instantáneamente sin validación de recepción física.
 */
export enum EstadoTransferenciaStock {
  PENDIENTE_DESPACHO = 'PENDIENTE_DESPACHO',       // Handshake dual validado (Origen y Destino online - C-24).
  EN_TRANSITO = 'EN_TRANSITO',                     // Mercadería despachada; stock_fisico descontado en Origen.
  COMPLETADA = 'COMPLETADA',                       // Recepción conforme (cantidad_recibida == cantidad_enviada); suma en Destino.
  DISCREPANCIA = 'DISCREPANCIA',                   // Faltante/sobrante/rotura constatada (suma solo lo recibido físicamente).
  DISCREPANCIA_RESUELTA = 'DISCREPANCIA_RESUELTA', // Diferencia auditada y cerrada administrativamente en Panel Nube.
  CANCELADA = 'CANCELADA',                         // Orden anulada antes de la salida física (sin impacto en stock).
}
