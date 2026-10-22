/**
 * Metadatos de seguimiento del cursor temporal de sincronización por sucursal (ERD: SYNC_CURSOR - RF-18).
 */
export interface ISyncCursor {
  id: string; // UUIDv4 PK
  id_sucursal: string; // UUIDv4 FK
  nodo_destino: 'LAN_MASTER' | 'CLOUD_CENTRAL';
  last_pulled_at: string; // Timestamp ISO-8601 UTC con milisegundos del último pull exitoso
  last_pushed_at?: string | null; // Timestamp ISO-8601 UTC con milisegundos del último push exitoso
  schema_version: number; // Versión de esquema para compatibilidad evolutiva
  updated_at: string;
}
