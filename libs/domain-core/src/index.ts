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

// Interfaces de Contratos Inmutables de Dominio
export * from './interfaces/venta.interface';
export * from './interfaces/venta-detalle.interface';
export * from './interfaces/pago-venta.interface';
export * from './interfaces/configuracion-sucursal.interface';
export * from './interfaces/producto-global.interface';
export * from './interfaces/producto-sucursal.interface';
export * from './interfaces/codigo-barra.interface';
export * from './interfaces/codigo-huerfano-resumen.interface';
export * from './interfaces/resultado-reconciliacion.interface';
export * from './interfaces/alerta-cuarentena.interface';
export * from './interfaces/transferencia-stock.interface';
export * from './interfaces/cliente.interface';
export * from './interfaces/cuenta-corriente.interface';
export * from './interfaces/nota-credito.interface';
export * from './interfaces/nota-credito-detalle.interface';
export * from './interfaces/turno-caja.interface';
export * from './interfaces/movimiento-caja.interface';
export * from './interfaces/metodo-pago.interface';
export * from './interfaces/proveedor.interface';
export * from './interfaces/diccionario-proveedor.interface';
export * from './interfaces/recepcion-mercaderia.interface';
export * from './interfaces/recepcion-mercaderia-detalle.interface';
export * from './interfaces/calculo-precio-sugerido.interface';
export * from './interfaces/auditoria.interface';
export * from './interfaces/sync-payload.interface';
export * from './interfaces/sync-cursor.interface';
export * from './interfaces/evento-websocket.interface';
export * from './interfaces/conflicto-occ.interface';
export * from './interfaces/sync-strategy.interface';
