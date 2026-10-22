/**
 * Vista consolidada de ventas huérfanas bajo el Artículo Comodín para el panel de reconciliación (RF-13).
 */
export interface ICodigoHuerfanoResumen {
  clave_agrupamiento: string; // COALESCE(codigo_comodin, 'SIN_CODIGO:' || TRIM(LOWER(nombre_comodin)))
  codigo_comodin?: string | null; // NULL si fue producto digitado en mostrador sin código de barras
  id_sucursal: string; // Resolución C-22: Sucursal específica donde se originaron las ventas
  nombre_comodin_frecuente: string;
  unidades_vendidas_historicas: number;
  precio_promedio_cobrado: number;
  primera_venta: string; // ISO 8601 UTC
  ultima_venta: string; // ISO 8601 UTC
  total_facturado: number;
}
