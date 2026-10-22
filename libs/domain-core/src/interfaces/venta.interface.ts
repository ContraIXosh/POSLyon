import { EstadoGeneral } from '../enums/estado-general.enum';
import { EstadoLogistico } from '../enums/estado-logistico.enum';
import { EstadoFinanciero } from '../enums/estado-financiero.enum';

/**
 * Contrato inmutable para la cabecera de Venta en POSLyon (ERD: VENTA).
 * Vinculación estricta con TURNO_CAJA al transicionar a CONFIRMADA (RF-17).
 */
export interface IVenta {
  id: string; // UUIDv4
  id_sucursal: string; // UUIDv4
  numero_comprobante?: string | null; // Correlativo por punto de venta
  id_turno_caja: string | null; // FK a TURNO_CAJA (obligatorio en CONFIRMADA)
  id_usuario: string; // UUIDv4 Cajero
  id_cliente?: string | null; // UUIDv4 (Obligatorio si hay pago fiado en Cuenta Corriente)
  total: number;
  fecha: string; // ISO 8601 UTC
  estado_general: EstadoGeneral;
  estado_logistico: EstadoLogistico;
  estado_financiero: EstadoFinanciero;
  tiene_devolucion_parcial: boolean; // Flag de inmutabilidad ante devoluciones (RF-11)
  es_compartido: boolean; // Preparación colaborativa en LAN
  fecha_expiracion_reserva?: string | null; // Timestamp para Garbage Collection (C-13/C-14)
  version: number; // Control de Concurrencia Optimista (OCC)
}
