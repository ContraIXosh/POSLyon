export interface ISyncChanges<T = any> {
  created: T[];
  updated: T[];
  deleted: string[]; // UUIDs para Soft Delete
}

/**
 * Payload de subida de deltas locales hacia el backend autoritativo (RF-18).
 */
export interface ISyncPushPayload {
  sucursal_id: string;
  last_pulled_at: string; // Timestamp ISO-8601 UTC de alta precisión del cursor previo (Resolución O-25)
  changes: {
    ventas?: ISyncChanges;
    venta_detalles?: ISyncChanges;
    pagos_venta?: ISyncChanges;
    cuenta_corriente?: ISyncChanges;
    turnos_caja?: ISyncChanges;
    movimientos_caja?: ISyncChanges;
    notas_credito?: ISyncChanges;
    nota_credito_detalles?: ISyncChanges;
    recepciones_mercaderia?: ISyncChanges;
    recepcion_mercaderia_detalles?: ISyncChanges;
    diccionario_proveedor?: ISyncChanges;
    alertas_cuarentena?: ISyncChanges;
    auditoria?: ISyncChanges;
    clientes?: ISyncChanges;
    [tabla: string]: ISyncChanges | undefined;
  };
}

/**
 * Respuesta de descarga incremental de novedades desde el backend autoritativo (RF-18).
 */
export interface ISyncPullResponse {
  changes: {
    productos_global?: ISyncChanges;
    productos_sucursal?: ISyncChanges;
    codigos_barra?: ISyncChanges;
    categorias?: ISyncChanges;
    promociones?: ISyncChanges;
    promociones_productos?: ISyncChanges;
    configuracion_sucursal?: ISyncChanges;
    metodos_pago?: ISyncChanges;
    proveedores?: ISyncChanges;
    diccionario_proveedor?: ISyncChanges;
    transferencias_stock?: ISyncChanges;
    transferencias_detalles?: ISyncChanges;
    permisos?: ISyncChanges;
    usuarios_permisos?: ISyncChanges;
    clientes?: ISyncChanges;
    [tabla: string]: ISyncChanges | undefined;
  };
  timestamp: string; // Nuevo cursor temporal ISO-8601 UTC de alta precisión (Resolución O-25)
}
