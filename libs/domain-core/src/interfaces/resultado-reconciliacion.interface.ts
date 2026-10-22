import { TipoDiscrepanciaPrecio } from '../enums/tipo-discrepancia-precio.enum';

export interface IDiscrepanciaRenglonReconciliacion {
  id_venta_detalle: string;
  cantidad: number;
  precio_cobrado: number;
  precio_oficial: number;
  diferencia_unitaria: number; // precio_cobrado - precio_oficial
  diferencia_total: number; // diferencia_unitaria * cantidad
  tipo_discrepancia: TipoDiscrepanciaPrecio; // SOBRANTE_LOGICO | MERMA_LOGICA | PRECIO_EXACTO
}

/**
 * Contrato de resultado del proceso transaccional de reconciliación de producto comodín (RF-13).
 */
export interface IResultadoReconciliacion {
  id_producto_oficial: string;
  nombre_oficial: string;
  id_sucursal: string;
  unidades_historicas_vinculadas: number;
  stock_inicial_calculado: number; // stock_fisico_actual + unidades_historicas_vinculadas
  stock_fisico_resultante: number; // Coincide exactamente con el conteo en góndola
  discrepancia_financiera_neta: number; // Suma algebraica de diferencias (negativo = merma, positivo = sobrante)
  renglones_auditados: IDiscrepanciaRenglonReconciliacion[];
}
