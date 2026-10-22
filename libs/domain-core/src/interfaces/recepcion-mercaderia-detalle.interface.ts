import { EstadoDiscrepanciaItem } from '../enums/estado-discrepancia-item.enum';

/**
 * Renglón de mercadería recepcionada en remito con evaluación de margen (ERD: RECEPCION_MERCADERIA_DETALLE - RF-15).
 */
export interface IRecepcionMercaderiaDetalle {
  id: string; // UUIDv4 PK
  id_recepcion_mercaderia: string; // UUIDv4 FK
  id_producto: string; // UUIDv4 FK
  cantidad_declarada: number; // Cantidad impresa en la factura/remito
  cantidad_recibida: number; // Cantidad física contada en depósito (solo esto ingresa al stock_fisico)
  costo_unitario: number; // Costo de compra facturado nuevo
  costo_anterior: number; // Snapshot del costo de reposición previo en base de datos
  precio_venta_sugerido: number; // Precio calculado preservando el Markup histórico
  aplicar_precio_sugerido: boolean; // Si true, actualiza PRODUCTO_SUCURSAL.precio_minorista
  estado_discrepancia: EstadoDiscrepanciaItem; // CONFORME | FALTANTE | SOBRANTE | RECHAZADO_CALIDAD
}
