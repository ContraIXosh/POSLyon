/**
 * Tipología de algoritmos del Motor de Promociones Dinámico (Patrón Strategy - RF-06 / O-11).
 * Ninguna estrategia altera VENTA_DETALLE.precio_unitario; todas calculan VENTA_DETALLE.monto_descuento.
 */
export enum TipoEfectoPromocion {
  PORCENTAJE = 'PORCENTAJE',                     // Descuento porcentual sobre los ítems calificados.
  PRECIO_FIJO = 'PRECIO_FIJO',                   // Precio cerrado por el combo o conjunto de productos.
  CANTIDAD_BONIFICADA = 'CANTIDAD_BONIFICADA',   // Lleva N y paga M (ej: 2x1, 3x2, donde valor_efecto = M y cantidad_minima = N).
  MONTO_FIJO_DESCUENTO = 'MONTO_FIJO_DESCUENTO', // Deducción monetaria directa en pesos.
}

/**
 * Selector de lista de precios aplicada al renglón de venta (RF-06).
 */
export enum TipoPrecio {
  MINORISTA = 'MINORISTA',
  MAYORISTA = 'MAYORISTA',
}

/**
 * Modalidad de comercialización y descuento de inventario del producto (RF-04 / O-26).
 * - UNIDAD: Descuenta 1 a 1 del propio registro en PRODUCTO_SUCURSAL.
 * - PESABLE: Admite cantidades decimales (kg/litros) de balanza o ingreso manual.
 * - PACK: No posee stock físico propio; descuenta recursivamente (cantidad * multiplicador_stock) sobre id_producto_base.
 */
export enum TipoVentaProducto {
  UNIDAD = 'UNIDAD',
  PESABLE = 'PESABLE',
  PACK = 'PACK',
}
