/**
 * Instancia física y contable del producto en una sucursal específica (ERD: PRODUCTO_SUCURSAL).
 * Los precios y existencias se aíslan por tienda preservando la regla N=1 (RF-02 y RF-21).
 */
export interface IProductoSucursal {
  id: string; // UUIDv4 PK
  id_sucursal: string; // UUIDv4 FK
  id_producto: string; // UUIDv4 FK
  precio_costo: number; // Costo de reposición
  precio_minorista: number; // Precio lista de góndola
  precio_mayorista: number; // Tarifa por volumen
  precio_minorista_pendiente?: number | null; // Cambio programado diferido
  precio_mayorista_pendiente?: number | null;
  fecha_vigencia_pendiente?: string | null; // ISO 8601 UTC para aplicación programada
  stock_fisico: number; // Existencias reales (Permisivo: admite valores < 0 según C-12)
  stock_reservado: number; // Suma temporal contenida en carritos BORRADOR de la sucursal
  stock_minimo: number; // Punto de pedido
  version: number; // Control OCC
  activo: boolean; // Soft delete
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}
