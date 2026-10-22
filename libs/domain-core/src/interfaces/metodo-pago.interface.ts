/**
 * Catálogo de medios de pago soportados por la empresa (ERD: METODO_PAGO).
 */
export interface IMetodoPago {
  id: string; // UUIDv4 PK
  nombre: string; // 'Efectivo', 'Tarjeta de Débito', 'Transferencia Bancaria', 'Cuenta Corriente', etc.
  afecta_caja_fisica: boolean; // true para efectivo (altera arqueo físico de gaveta), false para dinero digital
  activo: boolean; // Soft delete
  created_at: string;
  updated_at: string;
}
