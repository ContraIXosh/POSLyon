/**
 * Catálogo maestro de proveedores comerciales (ERD: PROVEEDOR).
 */
export interface IProveedor {
  id: string; // UUIDv4 PK
  razon_social: string;
  cuit: string; // Identificador tributario (CUIT / RUT)
  contacto_telefono?: string | null;
  contacto_email?: string | null;
  activo: boolean; // Soft delete
  created_at: string; // ISO 8601 UTC
  updated_at: string;
  deleted_at?: string | null;
}
