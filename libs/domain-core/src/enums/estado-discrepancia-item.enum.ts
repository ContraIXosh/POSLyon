/**
 * Estado físico verificado por renglón al contrastar cantidad_declarada (factura) vs cantidad_recibida (conteo en depósito).
 */
export enum EstadoDiscrepanciaItem {
  CONFORME = 'CONFORME',                   // cantidad_recibida == cantidad_declarada
  FALTANTE = 'FALTANTE',                   // cantidad_recibida < cantidad_declarada (solo ingresa lo recibido físicamente)
  SOBRANTE = 'SOBRANTE',                   // cantidad_recibida > cantidad_declarada
  RECHAZADO_CALIDAD = 'RECHAZADO_CALIDAD', // Mercadería dañada o vencida no ingresada a stock
}
