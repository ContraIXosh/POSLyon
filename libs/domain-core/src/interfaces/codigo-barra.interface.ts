/**
 * Mapeo N:1 de códigos de barras escaneables asociados a un producto global (ERD: CODIGO_BARRA).
 */
export interface ICodigoBarra {
  codigo: string; // PK Código escaneado (EAN-13, ITF-14, etc.)
  id_producto: string; // UUIDv4 FK
  tipo: 'PRINCIPAL' | 'ADICIONAL' | 'DUN14';
  activo: boolean;
  created_at: string;
}
