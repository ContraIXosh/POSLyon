// Constantes Globales de Dominio
export * from './constants/comodin.constants';

// Enums de la Máquina de Estados Ortogonal de Venta y Promociones (Módulo 1: Core POS)
export * from './enums/estado-general.enum';
export * from './enums/estado-logistico.enum';
export * from './enums/estado-financiero.enum';
export * from './enums/tipo-efecto-promocion.enum';
export * from './enums/estado-turno-caja.enum';

// Enums de Cuentas Corrientes, Devoluciones y Notas de Crédito (Módulo 2 y 3)
export * from './enums/tipo-movimiento-cc.enum';
export * from './enums/tipo-devolucion.enum';
export * from './enums/motivo-devolucion.enum';

// Enums de Inventario, Reconciliación de Huérfanos, Cuarentena y Transferencias 2PC (Módulo 4)
export * from './enums/accion-reconciliacion.enum';
export * from './enums/estado-cuarentena.enum';
export * from './enums/tipo-ajuste-stock.enum';
export * from './enums/tipo-discrepancia-precio.enum';
export * from './enums/estado-transferencia-stock.enum';

// Enums de Proveedores, Diccionario y Recepción de Mercadería (Módulo Proveedores)
export * from './enums/estado-recepcion.enum';
export * from './enums/estado-discrepancia-item.enum';
export * from './enums/tipo-actualizacion-precio.enum';

// Enums de Sincronización Local-First, Auditoría Forense y Planes Comerciales (Módulo Sync & SaaS)
export * from './enums/accion-auditoria.enum';
export * from './enums/estado-sincronizacion.enum';
export * from './enums/tipo-evento-sync.enum';
export * from './enums/tipo-evento-ws.enum';
export * from './enums/plan-comercial.enum';
