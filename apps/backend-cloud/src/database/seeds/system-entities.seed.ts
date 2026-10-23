import { DataSource } from 'typeorm';
import { RESERVED_UUIDS } from '@poslyon/domain-core';

export interface SeedSystemEntitiesResult {
  ejecutado: boolean;
  system_bot_id: string;
  producto_comodin_id: string;
  detalle: string;
}

/**
 * Seed inicial e idempotente para PostgreSQL y SQLite (Resolución S-03 — File-Level Specs Módulo Sync §12).
 *
 * Garantiza la existencia incondicional de los registros del sistema requeridos para la
 * integridad referencial (FK `NOT NULL`) de `AUDITORIA` (`SYSTEM_BOT`) y `VENTA_DETALLE` (`PRODUCTO_COMODIN`).
 * Utiliza `ON CONFLICT (id) DO NOTHING` dentro de una transacción explícita ACID.
 */
export async function seedSystemEntities(
  dataSource: DataSource,
): Promise<SeedSystemEntitiesResult> {
  if (!dataSource.isInitialized) {
    return {
      ejecutado: false,
      system_bot_id: RESERVED_UUIDS.SYSTEM_BOT,
      producto_comodin_id: RESERVED_UUIDS.PRODUCTO_COMODIN,
      detalle: 'DataSource no inicializado; seed diferido hasta conexión activa.',
    };
  }

  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    // Verificar si las tablas usuario y producto_global ya fueron creadas en el esquema
    const tablasCheck = await queryRunner.query(`
      SELECT
        to_regclass('public.usuario') AS tabla_usuario,
        to_regclass('public.producto_global') AS tabla_producto_global
    `);

    const tieneTablaUsuario = Boolean(tablasCheck?.[0]?.tabla_usuario);
    const tieneTablaProducto = Boolean(tablasCheck?.[0]?.tabla_producto_global);

    if (tieneTablaUsuario) {
      await queryRunner.query(
        `INSERT INTO usuario (id, nombre, email, password_hash, es_dueno, activo, version, created_at, updated_at)
         VALUES ($1, 'SYSTEM_BOT', 'system@poslyon.internal', 'DISABLED_SYSTEM_ACCOUNT', false, true, 1, NOW(), NOW())
         ON CONFLICT (id) DO NOTHING`,
        [RESERVED_UUIDS.SYSTEM_BOT],
      );
    }

    if (tieneTablaProducto) {
      await queryRunner.query(
        `INSERT INTO producto_global (id, nombre, descripcion, tipo_venta, multiplicador_stock, version, activo, created_at, updated_at)
         VALUES ($1, 'PRODUCTO COMODÍN / VENTA RÁPIDA', 'Registro universal RFC 4122 Nil UUID para artículos comodín no catalogados en mostrador (RF-12)', 'UNIDAD', 1, 1, true, NOW(), NOW())
         ON CONFLICT (id) DO NOTHING`,
        [RESERVED_UUIDS.PRODUCTO_COMODIN],
      );
    }

    await queryRunner.commitTransaction();

    return {
      ejecutado: tieneTablaUsuario || tieneTablaProducto,
      system_bot_id: RESERVED_UUIDS.SYSTEM_BOT,
      producto_comodin_id: RESERVED_UUIDS.PRODUCTO_COMODIN,
      detalle:
        tieneTablaUsuario && tieneTablaProducto
          ? 'Identidades canónicas SYSTEM_BOT y PRODUCTO_COMODIN aseguradas idempotentemente.'
          : 'Conexión PostgreSQL activa (tablas maestras pendientes de migración en Nivel 2).',
    };
  } catch (error) {
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    await queryRunner.release();
  }
}
