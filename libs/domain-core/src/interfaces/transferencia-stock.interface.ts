import { EstadoTransferenciaStock } from '../enums/estado-transferencia-stock.enum';

export interface ITransferenciaDetalle {
  id: string; // UUIDv4 PK
  id_transferencia: string; // UUIDv4 FK
  id_producto: string; // UUIDv4 FK
  cantidad_enviada: number; // Decimal para pesables (O-08)
  cantidad_recibida?: number | null; // Conteo físico al recibir
  estado_item?: string | null; // CONFORME | FALTANTE | SOBRANTE | ROTURA
  created_at: string;
}

/**
 * Orden de transferencia de mercadería inter-sucursal bajo protocolo 2PC (ERD: TRANSFERENCIA_STOCK - RF-16).
 */
export interface ITransferenciaStock {
  id: string; // UUIDv4 PK
  id_sucursal_origen: string; // UUIDv4 FK
  id_sucursal_destino: string; // UUIDv4 FK
  id_usuario_envia: string;
  id_usuario_recibe?: string | null;
  estado: EstadoTransferenciaStock; // PENDIENTE_DESPACHO -> EN_TRANSITO -> COMPLETADA | DISCREPANCIA
  fecha_envio?: string | null; // ISO 8601 UTC
  fecha_recepcion?: string | null;
  motivo_discrepancia?: string | null;
  fecha_resolucion_discrepancia?: string | null;
  id_usuario_resuelve_discrepancia?: string | null;
  version: number; // Control OCC
  created_at: string;
  updated_at: string;
  detalles: ITransferenciaDetalle[];
}
