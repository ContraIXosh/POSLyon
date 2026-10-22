import { AccionAuditoria } from '../enums/accion-auditoria.enum';

/**
 * Contexto HTTP capturado automáticamente por el AuditContextInterceptor (RF-19).
 */
export interface IAuditContext {
  userId: string; // UUIDv4 del usuario autenticado o UUID_SYSTEM_BOT
  motivo: string; // Justificación textual obligatoria en ajustes o transferencias
  ip: string;
  path: string;
  accion: AccionAuditoria;
}

/**
 * Registro forense inmutable de auditoría (ERD: AUDITORIA - RF-19).
 * Captura snapshots previos y posteriores de mutaciones críticas para trazabilidad total.
 */
export interface IAuditoria {
  id: string; // UUIDv4 PK inmutable
  id_usuario: string; // UUIDv4 FK (Operador responsable o UUID_SYSTEM_BOT)
  tabla_afectada: string; // Nombre de la tabla ('PRODUCTO_SUCURSAL', 'VENTA', etc.)
  id_registro_afectado?: string | null; // UUID del registro alterado
  accion: AccionAuditoria;
  valor_anterior?: Record<string, any> | null; // Snapshot JSONB antes de la mutación
  valor_nuevo?: Record<string, any> | null; // Snapshot JSONB posterior a la mutación
  motivo?: string | null;
  fecha: string; // ISO 8601 UTC
}
