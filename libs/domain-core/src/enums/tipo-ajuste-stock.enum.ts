/**
 * Clasificación del origen de un ajuste sobre PRODUCTO_SUCURSAL.stock_fisico.
 */
export enum TipoAjusteStock {
  RECONCILIACION_COMODIN = 'RECONCILIACION_COMODIN',
  MERMA_FISICA = 'MERMA_FISICA',
  INVENTARIO_INICIAL = 'INVENTARIO_INICIAL',
  AJUSTE_MANUAL = 'AJUSTE_MANUAL',
}
