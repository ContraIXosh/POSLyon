/**
 * Contrato inmutable de Cliente con control de límite de crédito consolidado (ERD: CLIENTE - RF-07).
 */
export interface ICliente {
  id: string; // UUIDv4 PK
  id_sucursal: string; // Sucursal de radicación física original
  nombre: string;
  limite_credito: number; // >= 0.00
  saldo_deudor: number; // >= 0.00 (Monto acumulado adeudado, incondicionalmente no negativo)
  requiere_revision: boolean; // Flag activada ante sobregiro post-sync (RF-07)
  version: number; // Control OCC
  activo: boolean; // Soft delete
  created_at: string; // ISO 8601 UTC
  updated_at: string;
  deleted_at?: string | null;
}
