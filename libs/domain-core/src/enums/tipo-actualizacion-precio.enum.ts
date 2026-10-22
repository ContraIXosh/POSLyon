/**
 * Estrategia elegida por el operador al recibir mercadería con variación en el costo de reposición.
 */
export enum TipoActualizacionPrecio {
  MARGEN_PRESERVADO = 'MARGEN_PRESERVADO',   // Aplica automáticamente el precio sugerido conservando el Markup histórico.
  PRECIO_FIJO_MANUAL = 'PRECIO_FIJO_MANUAL', // El operador define un precio minorista manual distinto al sugerido.
  SIN_CAMBIO = 'SIN_CAMBIO',                 // Se actualiza precio_costo pero se mantiene el precio_minorista actual en góndola.
}
