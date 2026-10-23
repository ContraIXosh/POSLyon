import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';
import {
  AccionAuditoria,
  AjustarStockManualDto,
  IAuditContext,
  TipoVentaProducto,
} from '@poslyon/domain-core';
import { POSLYON_DATA_SOURCE } from '../../../database/database.module';
import { AuditoriaService } from '../../auditoria/services/auditoria.service';
import { CrearProductoDto } from '../dtos/crear-producto.dto';
import { ActualizarProductoDto } from '../dtos/actualizar-producto.dto';
import { ActualizarPreciosSucursalDto } from '../dtos/actualizar-precios-sucursal.dto';
import { ProductoGlobalEntity } from '../entities/producto-global.entity';
import { ProductoSucursalEntity } from '../entities/producto-sucursal.entity';

@Injectable()
export class CatalogoService {
  constructor(
    @Inject(POSLYON_DATA_SOURCE)
    private readonly dataSource: DataSource,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  /**
   * Da de alta un nuevo producto global, sus códigos de barra y sus precios iniciales (RF-04 / RF-21).
   */
  async crearProducto(
    dto: CrearProductoDto,
    auditCtx: IAuditContext,
  ): Promise<ProductoGlobalEntity> {
    const productoId = randomUUID();
    const tipoVenta = dto.tipo_venta || TipoVentaProducto.UNIDAD;
    const multiplicador = dto.multiplicador_stock || 1;

    return await this.auditoriaService.ejecutarTransaccionAuditada({
      auditContext: {
        ...auditCtx,
        accion: AccionAuditoria.CREACION,
        motivo: auditCtx.motivo || 'Alta de producto en catálogo central',
      },
      tablaAfectada: 'PRODUCTO_GLOBAL',
      idRegistroAfectado: productoId,
      obtenerSnapshotPrevio: async () => null,
      mutacion: async (manager) => {
        // 1. Insertar en PRODUCTO_GLOBAL
        const [prod] = await manager.query(
          `INSERT INTO producto_global (
            id, id_categoria, nombre, descripcion, tipo_venta, multiplicador_stock,
            activo, version, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, true, 1, NOW(), NOW())
          RETURNING *;`,
          [
            productoId,
            dto.id_categoria || null,
            dto.nombre.trim(),
            dto.descripcion || null,
            tipoVenta,
            multiplicador,
          ],
        );

        // 2. Insertar Códigos de Barra
        const codigosBarra = dto.codigos_barra || [];
        for (let i = 0; i < codigosBarra.length; i++) {
          const cod = codigosBarra[i].trim();
          await manager.query(
            `INSERT INTO codigo_barra (id, id_producto, codigo, es_principal, created_at)
             VALUES ($1, $2, $3, $4, NOW())
             ON CONFLICT (codigo) DO NOTHING;`,
            [randomUUID(), productoId, cod, i === 0],
          );
        }

        // 3. Insertar Precios por Sucursal si fueron enviados
        const preciosSucursales: ProductoSucursalEntity[] = [];
        if (dto.precios_sucursales && dto.precios_sucursales.length > 0) {
          for (const ps of dto.precios_sucursales) {
            const [row] = await manager.query(
              `INSERT INTO producto_sucursal (
                id, id_sucursal, id_producto, precio_costo, precio_minorista,
                precio_mayorista, stock_fisico, stock_reservado, stock_minimo,
                version, activo, created_at, updated_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, 0, 0, 1, true, NOW(), NOW())
              RETURNING *;`,
              [
                randomUUID(),
                ps.id_sucursal,
                productoId,
                ps.precio_costo,
                ps.precio_minorista,
                ps.precio_mayorista || ps.precio_minorista,
                ps.stock_inicial || 0,
              ],
            );
            preciosSucursales.push(row);
          }
        }

        return {
          resultado: {
            ...prod,
            sucursales: preciosSucursales,
          } as ProductoGlobalEntity,
        };
      },
    });
  }

  /**
   * Actualiza los datos de cabecera de un producto global bajo control OCC.
   */
  async actualizarProductoGlobal(
    id: string,
    dto: ActualizarProductoDto,
    auditCtx: IAuditContext,
  ): Promise<ProductoGlobalEntity> {
    return await this.auditoriaService.ejecutarTransaccionAuditada({
      auditContext: {
        ...auditCtx,
        accion: AccionAuditoria.MODIFICACION,
        motivo: dto.motivo,
      },
      tablaAfectada: 'PRODUCTO_GLOBAL',
      idRegistroAfectado: id,
      obtenerSnapshotPrevio: async (manager) => {
        const rows = await manager.query(
          `SELECT * FROM producto_global WHERE id = $1 FOR UPDATE`,
          [id],
        );
        if (!rows.length) throw new NotFoundException(`Producto ${id} no encontrado`);
        return rows[0];
      },
      mutacion: async (manager) => {
        const rows = await manager.query(
          `SELECT * FROM producto_global WHERE id = $1`,
          [id],
        );
        const actual = rows[0];

        if (actual.version !== dto.version) {
          throw new ConflictException(
            `Conflicto OCC en PRODUCTO_GLOBAL:${id}. Versión esperada ${dto.version}, actual ${actual.version}.`,
          );
        }

        const nombreNuevo = dto.nombre ? dto.nombre.trim() : actual.nombre;
        const descNueva =
          dto.descripcion !== undefined ? dto.descripcion : actual.descripcion;
        const catNueva =
          dto.id_categoria !== undefined ? dto.id_categoria : actual.id_categoria;
        const tipoVentaNuevo = dto.tipo_venta || actual.tipo_venta;
        const multNuevo =
          dto.multiplicador_stock !== undefined
            ? dto.multiplicador_stock
            : actual.multiplicador_stock;

        const [prodActualizado] = await manager.query(
          `UPDATE producto_global
           SET nombre = $1, descripcion = $2, id_categoria = $3, tipo_venta = $4,
               multiplicador_stock = $5, version = version + 1, updated_at = NOW()
           WHERE id = $6 AND version = $7
           RETURNING *;`,
          [
            nombreNuevo,
            descNueva,
            catNueva,
            tipoVentaNuevo,
            multNuevo,
            id,
            dto.version,
          ],
        );

        return {
          resultado: prodActualizado as ProductoGlobalEntity,
        };
      },
    });
  }

  /**
   * Actualiza precios por sucursal bajo control OCC (RF-02 / RF-21).
   */
  async actualizarPreciosSucursal(
    idProducto: string,
    idSucursal: string,
    dto: ActualizarPreciosSucursalDto,
    auditCtx: IAuditContext,
  ): Promise<ProductoSucursalEntity> {
    return await this.auditoriaService.ejecutarTransaccionAuditada({
      auditContext: {
        ...auditCtx,
        accion: AccionAuditoria.MODIFICACION,
        motivo: dto.motivo,
      },
      tablaAfectada: 'PRODUCTO_SUCURSAL',
      idRegistroAfectado: idProducto,
      obtenerSnapshotPrevio: async (manager) => {
        const rows = await manager.query(
          `SELECT * FROM producto_sucursal WHERE id_producto = $1 AND id_sucursal = $2 FOR UPDATE`,
          [idProducto, idSucursal],
        );
        if (!rows.length) {
          throw new NotFoundException(
            `Producto ${idProducto} no asignado a la sucursal ${idSucursal}`,
          );
        }
        return rows[0];
      },
      mutacion: async (manager) => {
        const rows = await manager.query(
          `SELECT * FROM producto_sucursal WHERE id_producto = $1 AND id_sucursal = $2`,
          [idProducto, idSucursal],
        );
        const actual = rows[0];

        if (actual.version !== dto.version) {
          throw new ConflictException(
            `Conflicto OCC en PRODUCTO_SUCURSAL:${idProducto} (Sucursal: ${idSucursal}). Versión esperada ${dto.version}, actual ${actual.version}.`,
          );
        }

        const costo = dto.precio_costo ?? actual.precio_costo;
        const minorista = dto.precio_minorista ?? actual.precio_minorista;
        const mayorista = dto.precio_mayorista ?? actual.precio_mayorista;

        const [row] = await manager.query(
          `UPDATE producto_sucursal
           SET precio_costo = $1, precio_minorista = $2, precio_mayorista = $3,
               version = version + 1, updated_at = NOW()
           WHERE id_producto = $4 AND id_sucursal = $5 AND version = $6
           RETURNING *;`,
          [costo, minorista, mayorista, idProducto, idSucursal, dto.version],
        );

        return {
          resultado: row as ProductoSucursalEntity,
        };
      },
    });
  }

  /**
   * Ajuste manual de existencias con soporte permisivo de negativos (C-12) y control OCC.
   */
  async ajustarStockManual(
    dto: AjustarStockManualDto,
    auditCtx: IAuditContext,
  ): Promise<ProductoSucursalEntity> {
    return await this.auditoriaService.ejecutarTransaccionAuditada({
      auditContext: {
        ...auditCtx,
        accion: AccionAuditoria.MODIFICACION,
        motivo: dto.motivo,
      },
      tablaAfectada: 'PRODUCTO_SUCURSAL',
      idRegistroAfectado: dto.id_producto,
      obtenerSnapshotPrevio: async (manager) => {
        const rows = await manager.query(
          `SELECT * FROM producto_sucursal WHERE id_producto = $1 AND id_sucursal = $2 FOR UPDATE`,
          [dto.id_producto, dto.id_sucursal],
        );
        if (!rows.length) {
          throw new NotFoundException(
            `Producto ${dto.id_producto} no encontrado en la sucursal ${dto.id_sucursal}`,
          );
        }
        return rows[0];
      },
      mutacion: async (manager) => {
        const rows = await manager.query(
          `SELECT * FROM producto_sucursal WHERE id_producto = $1 AND id_sucursal = $2`,
          [dto.id_producto, dto.id_sucursal],
        );
        const actual = rows[0];

        if (actual.version !== dto.expected_version) {
          throw new ConflictException(
            `Conflicto OCC en ajuste de stock de PRODUCTO_SUCURSAL:${dto.id_producto}. Versión esperada ${dto.expected_version}, actual ${actual.version}.`,
          );
        }

        // Resolución C-12: admite valores de stock_fisico < 0
        const [actualizado] = await manager.query(
          `UPDATE producto_sucursal
           SET stock_fisico = $1, version = version + 1, updated_at = NOW()
           WHERE id_producto = $2 AND id_sucursal = $3 AND version = $4
           RETURNING *;`,
          [
            dto.cantidad_nueva,
            dto.id_producto,
            dto.id_sucursal,
            dto.expected_version,
          ],
        );

        return {
          resultado: actualizado as ProductoSucursalEntity,
        };
      },
    });
  }

  /**
   * Búsqueda por código de barra (EAN-13, interno) con resolución de precios de sucursal.
   */
  async buscarPorCodigoBarra(
    codigo: string,
    idSucursal?: string,
  ): Promise<any> {
    if (!this.dataSource.isInitialized) {
      throw new NotFoundException(`Código de barra ${codigo} no encontrado`);
    }

    const sql = `
      SELECT
        p.id, p.nombre, p.descripcion, p.tipo_venta, p.multiplicador_stock,
        cb.codigo AS codigo_barra_escaneado,
        ps.precio_costo, ps.precio_minorista, ps.precio_mayorista,
        ps.stock_fisico, ps.stock_reservado, ps.version AS version_sucursal
      FROM codigo_barra cb
      INNER JOIN producto_global p ON p.id = cb.id_producto AND p.activo = true
      LEFT JOIN producto_sucursal ps ON ps.id_producto = p.id
        ${idSucursal ? 'AND ps.id_sucursal = $2' : ''}
      WHERE cb.codigo = $1;
    `;

    const params = idSucursal ? [codigo.trim(), idSucursal] : [codigo.trim()];
    const rows = await this.dataSource.query(sql, params);

    if (!rows.length) {
      throw new NotFoundException(
        `No se encontró ningún producto con el código de barra '${codigo}'.`,
      );
    }

    return rows[0];
  }

  /**
   * Borrado lógico de producto global auditado (`activo = false`, `deleted_at = NOW()`).
   */
  async eliminarLogico(
    id: string,
    versionEsperada: number,
    motivo: string,
    auditCtx: IAuditContext,
  ) {
    return await this.auditoriaService.ejecutarTransaccionAuditada({
      auditContext: {
        ...auditCtx,
        accion: AccionAuditoria.SOFT_DELETE,
        motivo,
      },
      tablaAfectada: 'PRODUCTO_GLOBAL',
      idRegistroAfectado: id,
      obtenerSnapshotPrevio: async (manager) => {
        const rows = await manager.query(
          `SELECT id, nombre, activo, version FROM producto_global WHERE id = $1 FOR UPDATE`,
          [id],
        );
        if (!rows.length) throw new NotFoundException(`Producto ${id} no encontrado`);
        return rows[0];
      },
      mutacion: async (manager) => {
        const rows = await manager.query(
          `SELECT id, activo, version FROM producto_global WHERE id = $1`,
          [id],
        );
        if (!rows.length) throw new NotFoundException(`Producto ${id} no encontrado`);

        if (rows[0].version !== versionEsperada) {
          throw new ConflictException(
            `Conflicto OCC al eliminar PRODUCTO_GLOBAL:${id}. Versión esperada: ${versionEsperada}, actual: ${rows[0].version}`,
          );
        }

        const [res] = await manager.query(
          `UPDATE producto_global
           SET activo = false, deleted_at = NOW(), version = version + 1, updated_at = NOW()
           WHERE id = $1 AND version = $2
           RETURNING id, nombre, activo, version;`,
          [id, versionEsperada],
        );

        return {
          resultado: res,
        };
      },
    });
  }

  /**
   * Lista los productos globales con sus categorías y códigos de barra.
   */
  async listarProductos(filtros?: {
    idCategoria?: string;
    incluirInactivos?: boolean;
  }): Promise<ProductoGlobalEntity[]> {
    if (!this.dataSource.isInitialized) return [];

    const conditions: string[] = [];
    const params: any[] = [];

    if (!filtros?.incluirInactivos) {
      conditions.push('p.activo = true');
    }

    if (filtros?.idCategoria) {
      params.push(filtros.idCategoria);
      conditions.push(`p.id_categoria = $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `
      SELECT
        p.id, p.id_categoria, p.nombre, p.descripcion, p.tipo_venta,
        p.multiplicador_stock, p.activo, p.version, p.created_at, p.updated_at,
        c.nombre AS categoria_nombre,
        COALESCE(json_agg(cb.codigo) FILTER (WHERE cb.id IS NOT NULL), '[]') AS codigos_barra
      FROM producto_global p
      LEFT JOIN categoria c ON c.id = p.id_categoria
      LEFT JOIN codigo_barra cb ON cb.id_producto = p.id
      ${where}
      GROUP BY p.id, c.nombre
      ORDER BY p.nombre ASC;
    `;

    return await this.dataSource.query(sql, params);
  }
}
