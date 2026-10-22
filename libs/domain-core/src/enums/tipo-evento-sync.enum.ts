/**
 * Tipología de ciclos de sincronización en el motor híbrido Local-First (RF-18).
 */
export enum TipoEventoSync {
  PUSH_VENTAS = 'PUSH_VENTAS',           // Subida de comprobantes confirmados y movimientos locales.
  PULL_CATALOGO = 'PULL_CATALOGO',       // Descarga incremental de catálogo, precios y configuraciones por cursor.
  CATCH_UP = 'CATCH_UP',                 // Puesta al día masiva tras reconexión prolongada.
  RESOLUCION_MERGE = 'RESOLUCION_MERGE', // Reconciliación automática mediante Merge Aditivo OCC.
}
