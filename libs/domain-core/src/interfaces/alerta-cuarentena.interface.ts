import { EstadoCuarentena } from '../enums/estado-cuarentena.enum';

/**
 * Alerta de stock faltante reportada durante la preparación guiada de un pedido (ERD: ALERTA_CUARENTENA).
 * Bloquea temporalmente el cobro del carrito hasta regularizar en mostrador (Regla C-11).
 */
export interface IAlertaCuarentena {
  id: string; // UUIDv4 PK
  id_sucursal: string; // UUIDv4 FK
  id_producto: string; // UUIDv4 FK
  id_venta?: string | null; // Carrito asociado en preparación
  id_usuario_reporta: string; // Operario / Embalador
  id_usuario_resuelve?: string | null; // Administrador o Cajero
  cantidad_faltante: number;
  estado: EstadoCuarentena; // PENDIENTE | MERMA_CONFIRMADA | FALSA_ALARMA
  observacion?: string | null;
  created_at: string; // ISO 8601 UTC
  resolved_at?: string | null;
}
