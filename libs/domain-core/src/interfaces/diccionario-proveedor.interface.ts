/**
 * Diccionario de mapeo de alias entre descripciones de facturas y productos oficiales (ERD: DICCIONARIO_PROVEEDOR - RF-14).
 * Restricción de unicidad compuesta: UNIQUE(id_proveedor, nombre_en_factura).
 */
export interface IDiccionarioProveedor {
  id: string; // UUIDv4 PK
  id_proveedor: string; // UUIDv4 FK
  id_producto: string; // UUIDv4 FK a PRODUCTO_GLOBAL
  nombre_en_factura: string; // Denominación textual exacta en el comprobante externo
  created_at: string; // ISO 8601 UTC
  updated_at?: string;
}
