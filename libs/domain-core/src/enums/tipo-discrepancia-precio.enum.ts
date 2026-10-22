/**
 * Resultado de la evaluación financiera por renglón al reconciliar ventas de Artículo Comodín (Resolución C-21).
 * Compara el precio_unitario cobrado en caja contra el precio_oficial de lista asignado.
 */
export enum TipoDiscrepanciaPrecio {
  PRECIO_EXACTO = 'PRECIO_EXACTO',     // precio_cobrado == precio_oficial (Diferencia = $0)
  SOBRANTE_LOGICO = 'SOBRANTE_LOGICO', // precio_cobrado > precio_oficial (Diferencia > $0)
  MERMA_LOGICA = 'MERMA_LOGICA',       // precio_cobrado < precio_oficial (Diferencia < $0)
}
