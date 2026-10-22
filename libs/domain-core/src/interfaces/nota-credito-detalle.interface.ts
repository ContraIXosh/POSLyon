export interface INotaCreditoDetalle {
  id: string; // UUIDv4 PK
  id_nota_credito: string; // UUIDv4 FK
  id_producto: string; // UUIDv4 FK
  cantidad: number; // Decimal para pesables devueltos
  precio_unitario_momento: number; // Snapshot inmutable del precio lista original
  monto_descuento: number; // Descuento prorrateado deducido (RF-09)
  subtotal: number; // (cantidad * precio_unitario_momento) - monto_descuento
  devuelto_a_inventario: boolean; // Siempre true (reingreso automático a stock_fisico)
}
