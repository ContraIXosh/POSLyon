/**
 * Estado del ciclo de sincronización de registros locales hacia el nodo autoritativo (MAESTRO_LAN o Cloud).
 */
export enum EstadoSincronizacion {
  PENDIENTE = 'PENDIENTE',         // Mutación asentada en SQLite local (WAL), pendiente de envío.
  EN_COLA = 'EN_COLA',             // Empaquetada en el lote actual del SyncWorker.
  SINCRONIZADA = 'SINCRONIZADA',   // Confirmada con HTTP 200 OK por el nodo autoritativo.
  CONFLICTO_OCC = 'CONFLICTO_OCC', // Colisión de versión detectada para resolución aditiva o administrativa.
}
