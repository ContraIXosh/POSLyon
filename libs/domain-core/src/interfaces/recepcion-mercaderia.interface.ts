import { EstadoRecepcion } from '../enums/estado-recepcion.enum';
import { IRecepcionMercaderiaDetalle } from './recepcion-mercaderia-detalle.interface';

/**
 * Cabecera de remito / recepción de mercadería en sucursal (ERD: RECEPCION_MERCADERIA - RF-14 / RF-15).
 */
export interface IRecepcionMercaderia {
  id: string; // UUIDv4 PK
  id_sucursal: string; // UUIDv4 FK
  id_proveedor: string; // UUIDv4 FK
  id_usuario: string; // Operario / Cajero receptor
  numero_remito: string; // Comprobante externo (Factura / Remito)
  estado: EstadoRecepcion; // BORRADOR -> EN_REVISION -> CONFIRMADA | RECHAZADA
  total_bultos: number;
  fecha_inicio: string; // ISO 8601 UTC
  fecha_completado?: string | null;
  version: number; // Control OCC
  detalles: IRecepcionMercaderiaDetalle[];
}
