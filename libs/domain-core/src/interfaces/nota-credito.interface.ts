import { TipoDevolucion } from '../enums/tipo-devolucion.enum';
import { INotaCreditoDetalle } from './nota-credito-detalle.interface';

/**
 * Comprobante formal de devolución y nota de crédito (ERD: NOTA_CREDITO - RF-09 / RF-10).
 * Vinculación temporal desacoplada: valida venta original pero impacta en el id_turno_caja de hoy.
 */
export interface INotaCredito {
  id: string; // UUIDv4 PK
  numero_comprobante: string; // Correlativo fiscal/interno por punto de venta
  id_venta: string; // UUIDv4 FK Venta histórica de origen
  id_cliente?: string | null; // NULL si fue consumidor final anónimo
  id_usuario: string; // Cajero que emite la nota de crédito hoy
  id_turno_caja: string; // Turno ACTIVO hoy donde impacta el arqueo contable
  monto_total: number; // Reembolso neto (descontando promociones prorrateadas)
  tipo_devolucion: TipoDevolucion; // EFECTIVO_CAJA | REDUCCION_DEUDA | SIN_REINTEGRO_MONETARIO
  motivo: string;
  fecha: string; // ISO 8601 UTC
  detalles: INotaCreditoDetalle[];
}
