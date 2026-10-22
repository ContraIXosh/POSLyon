/**
 * Dimensión 2 de la Máquina de Estados Ortogonal de Venta: Flujo Físico y Preparación (Picking).
 * Modela el recorrido guiado de mercadería y la guarda estricta de bloqueo de cobro (Regla C-11).
 */
export enum EstadoLogistico {
  A_PREPARAR = 'A_PREPARAR',               // Pedido en edición o recién cargado en mostrador.
  PREPARANDO = 'PREPARANDO',               // Recorrido guiado en móvil con highlight ítem por ítem.
  CONTROLANDO = 'CONTROLANDO',             // Segunda revisión guiada opcional.
  INCOMPLETO = 'INCOMPLETO',               // Faltante reportado (Bloquea estrictamente el cobro - Regla C-11).
  LISTO_PARA_COBRAR = 'LISTO_PARA_COBRAR', // Preparación concluida, habilita el cobro en caja.
  ENTREGADO = 'ENTREGADO',                 // Cobrado y entregado físicamente al cliente.
}
