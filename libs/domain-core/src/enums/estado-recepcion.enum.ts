/**
 * Máquina de Estados de una Recepción de Mercadería de Proveedor (Diagrama de Estados de Recepción).
 */
export enum EstadoRecepcion {
  BORRADOR = 'BORRADOR',       // Remito recién abierto o en carga inicial.
  EN_REVISION = 'EN_REVISION', // Conteo físico y mapeo en Diccionario de Proveedor en curso.
  CONFIRMADA = 'CONFIRMADA',   // Conteo cerrado: impacta stock_fisico (+cantidad_recibida) y actualiza costos/precios.
  RECHAZADA = 'RECHAZADA',     // Rechazo total del remito por avería o error (no impacta stock ni precios; audita evento).
}
