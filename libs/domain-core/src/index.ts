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

// Validadores Declarativos Customizados (Resolución S-03)
export * from './validators/is-uuid-or-nil.decorator';

// DTOs con Validaciones Declarativas (Módulos 1 al 5)
export * from './dtos/crear-venta.dto';
export * from './dtos/aplicar-promocion.dto';
export * from './dtos/item-devolucion.dto';
export * from './dtos/crear-devolucion.dto';
export * from './dtos/registrar-abono.dto';
export * from './dtos/sync-cuenta-corriente-delta.dto';
export * from './dtos/reconciliar-codigo-huerfano.dto';
export * from './dtos/resolver-cuarentena.dto';
export * from './dtos/ajustar-stock-manual.dto';
export * from './dtos/vincular-diccionario.dto';
export * from './dtos/crear-recepcion.dto';
export * from './dtos/agregar-renglon-recepcion.dto';
export * from './dtos/confirmar-recepcion.dto';
export * from './dtos/sync-push.dto';
export * from './dtos/sync-pull-query.dto';
export * from './dtos/registrar-auditoria.dto';

// Reglas Puras y Guardas de Dominio (C-10, C-11, C-12, O-26, RF-07, RF-08)
export * from './rules/validar-margen-credito.rule';
export * from './rules/guardas-venta-y-stock.rule';

// Servicios Puros de Dominio (RF-09, RF-10, RF-13, RF-15, RF-17, S-08, S-09, S-10, C-18, C-21, C-23, O-23, O-27)
export * from './services/margen-precios.domain-service';
export * from './services/devoluciones.domain-service';
export * from './services/reconciliacion.domain-service';
export * from './services/reloj-y-arqueo.domain-service';
