import { TipoMovimientoCaja } from '../enums/estado-turno-caja.enum';

/**
 * Movimientos financieros directos de gaveta dentro de un turno de caja (ERD: MOVIMIENTO_CAJA).
 */
export interface IMovimientoCaja {
  id: string; // UUIDv4 PK
  id_turno_caja: string; // UUIDv4 FK Turno activo receptor
  id_metodo_pago?: string | null; // UUIDv4 FK a METODO_PAGO
  tipo_movimiento: TipoMovimientoCaja; // INGRESO | EGRESO
  monto: number; // Importe absoluto (> 0.00)
  concepto: string; // 'ABONO_CUENTA_CORRIENTE' | 'DEVOLUCION_EFECTIVO' | 'EXTRACCION_CAMBIO' | string
  afecta_caja_fisica: boolean; // true altera billetes de gaveta, false altera balance digital
  fecha: string; // ISO 8601 UTC
}
