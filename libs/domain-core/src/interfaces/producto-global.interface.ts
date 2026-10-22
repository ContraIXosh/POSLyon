import { TipoVentaProducto } from '../enums/tipo-efecto-promocion.enum';

/**
 * Entidad maestra del catálogo central global (ERD: PRODUCTO_GLOBAL).
 * Mantiene la definición intrínseca del producto compartida entre todas las sucursales.
 */
export interface IProductoGlobal {
  id: string; // UUIDv4 universal (00000000-0000-0000-0000-000000000000 es el Artículo Comodín)
  id_categoria: string; // UUIDv4 FK
  nombre: string;
  descripcion?: string | null;
  tipo_venta: TipoVentaProducto; // UNIDAD | PESABLE | PACK (RF-04)
  id_producto_base?: string | null; // UUIDv4 auto-referencial si es PACK
  multiplicador_stock: number; // Factor de conversión para packs (ej: 6 para six-pack)
  version: number; // Control OCC
  activo: boolean; // Borrado lógico (Soft delete)
  created_at: string; // ISO 8601 UTC
  updated_at: string;
  deleted_at?: string | null;
}
