/**
 * Máquina de Estados de TURNO_CAJA (Diagrama de Máquina de Estados de Turno de Caja - RF-17 / O-16).
 * Preserva el principio de Instantánea Contable Inmutable (Cierre Ciego) junto con la capacidad
 * de rectificación o reapertura auditada por un Administrador sin sobrescribir la declaración original.
 */
export enum EstadoTurnoCaja {
  ABIERTO = 'ABIERTO',                       // Turno activo recibiendo cobros, abonos y egresos.
  CERRADO = 'CERRADO',                       // Cierre ciego ejecutado; efectivo_declarado congelado.
  RECTIFICADO = 'RECTIFICADO',               // Discrepancia corregida por Admin en efectivo_rectificado (preserva efectivo_declarado).
  REABIERTO_AUDITADO = 'REABIERTO_AUDITADO', // Reapertura excepcional autorizada y auditada ante contingencias.
}

/**
 * Dirección del flujo monetario en la tabla MOVIMIENTO_CAJA.
 */
export enum TipoMovimientoCaja {
  INGRESO = 'INGRESO',
  EGRESO = 'EGRESO',
}
