import { EstadoTurnoCaja } from '../enums/estado-turno-caja.enum';

/**
 * Ciclo de caja física y arqueo con soporte de Cierre Ciego y Rectificación (ERD: TURNO_CAJA - RF-17 / O-16).
 */
export interface ITurnoCaja {
  id: string; // UUIDv4 PK
  id_sucursal: string; // UUIDv4 FK
  id_usuario: string; // Cajero operador
  fecha_apertura: string; // ISO 8601 UTC
  fecha_cierre?: string | null;
  monto_inicial_efectivo: number; // Fondo fijo de cambio inicial
  efectivo_declarado?: number | null; // Arqueo ciego del cajero (congelado e inmutable)
  diferencia_caja?: number | null; // Descuadre calculado por el sistema
  estado: EstadoTurnoCaja; // ABIERTO | CERRADO | RECTIFICADO | REABIERTO_AUDITADO
  efectivo_rectificado?: number | null; // Corrección auditada del supervisor
  fecha_rectificacion?: string | null;
  id_usuario_rectifica?: string | null; // Supervisor que rectificó
  created_at: string;
  updated_at: string;
}
