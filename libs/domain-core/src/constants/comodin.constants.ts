/**
 * Identificador universal reservado para artículos no registrados / venta rápida offline (RF-12).
 * Utiliza el Nil UUID (RFC 4122) para preservar la restricción de integridad referencial NOT NULL
 * en la clave foránea VENTA_DETALLE.id_producto sin requerir valores nulos.
 */
export const UUID_ARTICULO_COMODIN = '00000000-0000-0000-0000-000000000000';

/**
 * Identificador de sistema reservado para procesos autónomos, garbage collection,
 * sincronización background y alertas post-sync en la tabla AUDITORIA.
 */
export const UUID_SYSTEM_BOT = '00000000-0000-0000-0000-000000000001';
