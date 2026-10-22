/**
 * Estrategia de resolución para un código huérfano vendido bajo el Artículo Comodín (RF-13).
 * - CREAR_NUEVO: Da de alta el producto en el catálogo aplicando stock_inicial = stock_actual + ventas_historicas.
 * - VINCULAR_EXISTENTE: Asocia las ventas históricas comodín a un producto ya existente en el catálogo.
 */
export enum AccionReconciliacion {
  CREAR_NUEVO = 'CREAR_NUEVO',
  VINCULAR_EXISTENTE = 'VINCULAR_EXISTENTE',
}
