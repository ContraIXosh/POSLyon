/**
 * Dimensión 1 de la Máquina de Estados Ortogonal de Venta: Persistencia y Ciclo Transaccional.
 * Modela el ciclo de vida del comprobante y su elegibilidad para sincronización hacia la Nube.
 */
export enum EstadoGeneral {
  BORRADOR = 'BORRADOR',       // Carrito abierto o en preparación en SQLite local (jamás viaja a Cloud).
  CONFIRMADA = 'CONFIRMADA',   // Venta cerrada, fija id_turno_caja, descuenta stock_fisico y viaja a Cloud.
  CANCELADA = 'CANCELADA',     // Anulación formal de una venta previa CONFIRMADA (reingresa stock_fisico y viaja a Cloud).
  DESCARTADO = 'DESCARTADO',   // Carrito en borrador abandonado o purgado por Garbage Collection (solo libera stock_reservado, 100% local).
}
