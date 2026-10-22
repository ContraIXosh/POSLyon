/**
 * Máquina de Estados de una Alerta de Cuarentena de Stock (Diagrama de Estados de Alerta de Cuarentena).
 * Se dispara cuando un embalador reporta faltante físico en góndola (Regla C-11).
 */
export enum EstadoCuarentena {
  PENDIENTE = 'PENDIENTE',               // Alerta abierta tras reporte de faltante en preparación.
  MERMA_CONFIRMADA = 'MERMA_CONFIRMADA', // El administrador confirma que el stock realmente faltaba (ajusta stock_fisico y audita).
  FALSA_ALARMA = 'FALSA_ALARMA',         // El producto apareció en depósito/góndola; se restaura disponibilidad sin descontar stock.
}
