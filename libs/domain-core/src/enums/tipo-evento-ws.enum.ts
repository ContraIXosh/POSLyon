/**
 * Catálogo de eventos en tiempo real emitidos por WebSockets (LAN Local y Cloud Central).
 */
export enum TipoEventoWS {
  // Eventos LAN (Red local de sucursal - WiFi / Ethernet entre cajas y móviles)
  CARRITO_ACTUALIZADO = 'CARRITO_ACTUALIZADO',
  ITEM_AGREGADO = 'ITEM_AGREGADO',
  ITEM_EMBALADO = 'ITEM_EMBALADO',
  RESERVA_STOCK_LOCAL = 'RESERVA_STOCK_LOCAL',       // Soft Allocation en tiempo real entre cajas (Resolución C-15)
  VENTA_CONFIRMADA_LOCAL = 'VENTA_CONFIRMADA_LOCAL', // Notificación local de cobro para actualizar stock físico en LAN
  CARRITO_EXPIRADO_LAN = 'CARRITO_EXPIRADO_LAN',     // Garbage Collection local ejecutado (C-13 / C-14)
  ALERTA_STOCK_LAN = 'ALERTA_STOCK_LAN',

  // Eventos Cloud (Push central desde NestJS hacia sucursales online)
  CATALOGO_ACTUALIZADO = 'CATALOGO_ACTUALIZADO',
  PROMOCION_ACTUALIZADA = 'PROMOCION_ACTUALIZADA',
}
