/**
 * Resultado estructurado del motor de cálculo de precios de venta sugeridos (RF-15).
 * Fórmula: Markup = (precio_minorista_anterior - costo_anterior) / costo_anterior
 *          precio_sugerido = costo_nuevo * (1 + Markup)
 */
export interface ICalculoPrecioSugerido {
  costo_anterior: number;
  costo_nuevo: number;
  precio_minorista_anterior: number;
  markup_porcentual: number; // Margen porcentual preservado
  precio_minorista_sugerido: number; // Precio de góndola propuesto
  diferencia_costo: number; // Variación absoluta (costo_nuevo - costo_anterior)
  variacion_costo_porcentual: number;
}
