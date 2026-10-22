/**
 * Catálogo Universal Unificado de Acciones de Auditoría Forense (Resolución S-04 y RF-19 / RF-21).
 * Tipifica estrictamente la columna AUDITORIA.accion tanto en SQLite local como en PostgreSQL Cloud.
 */
export enum AccionAuditoria {
  // Operaciones Genéricas del Interceptor REST / TypeORM
  CREACION = 'CREACION',
  MODIFICACION = 'MODIFICACION',
  SOFT_DELETE = 'SOFT_DELETE',
  OPERACION = 'OPERACION',

  // Planes Comerciales y Licenciamiento (RF-21)
  UPGRADE_PLAN_COMERCIAL = 'UPGRADE_PLAN_COMERCIAL',

  // Sincronización y Resiliencia Local-First (OCC / Sobregiros / Stock Negativo)
  RESOLUCION_MERGE_OCC = 'RESOLUCION_MERGE_OCC',
  EXCESO_LIMITE_CREDITO_POST_SYNC = 'EXCESO_LIMITE_CREDITO_POST_SYNC',
  VENTA_OFFLINE_STOCK_NEGATIVO = 'VENTA_OFFLINE_STOCK_NEGATIVO',

  // Reconciliación de Mercadería Huérfana y Venta Rápida (Comodines - RF-12 / RF-13)
  RECONCILIACION_DISCREPANCIA = 'RECONCILIACION_DISCREPANCIA',
  RECONCILIACION_DISCREPANCIA_TURNO = 'RECONCILIACION_DISCREPANCIA_TURNO',
  DESCUADRE_STOCK_RECONCILIACION = 'DESCUADRE_STOCK_RECONCILIACION',
  MERMA_LOGICA = 'MERMA_LOGICA',
  SOBRANTE_LOGICO = 'SOBRANTE_LOGICO',

  // Ajustes de Inventario, Merma y Cuarentena
  AJUSTE_STOCK = 'AJUSTE_STOCK',
  AJUSTE_STOCK_MERMA = 'AJUSTE_STOCK_MERMA',
  RESOLUCION_CUARENTENA = 'RESOLUCION_CUARENTENA',
  RECHAZO_FALTANTE = 'RECHAZO_FALTANTE',

  // Precios, Proveedores y Recepción de Mercadería
  AJUSTE_PRECIO = 'AJUSTE_PRECIO',
  CAMBIO_PRECIO_POR_RECEPCION = 'CAMBIO_PRECIO_POR_RECEPCION',
  CAMBIO_PRECIO_COSTO = 'CAMBIO_PRECIO_COSTO',
  CAMBIO_PRECIO_VENTA = 'CAMBIO_PRECIO_VENTA',
  NUEVO_ALIAS_DICCIONARIO = 'NUEVO_ALIAS_DICCIONARIO',

  // Caja, Turnos y Ventas
  RECTIFICACION_TURNO_CAJA = 'RECTIFICACION_TURNO_CAJA',
  REAPERTURA_TURNO_CAJA = 'REAPERTURA_TURNO_CAJA',
  ANULACION_VENTA = 'ANULACION_VENTA',
  DEVOLUCION_MERCADERIA = 'DEVOLUCION_MERCADERIA',
}

// Alias de retrocompatibilidad arquitectónica con specs de sincronización
export const AuditAction = AccionAuditoria;
export const AccionAuditoriaGlobal = AccionAuditoria;
