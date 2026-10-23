import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';
import {
  AccionAuditoria,
  AgregarRenglonRecepcionDto,
  ConfirmarRecepcionDto,
  CrearRecepcionDto,
  EstadoDiscrepanciaItem,
  EstadoRecepcion,
  IAuditContext,
  MargenPreciosDomainService,
  VincularDiccionarioDto,
} from '@poslyon/domain-core';
import { POSLYON_DATA_SOURCE } from '../../../database/database.module';
import { AuditoriaService } from '../../auditoria/services/auditoria.service';
import { CrearProveedorDto } from '../dtos/crear-proveedor.dto';
import { ActualizarProveedorDto } from '../dtos/actualizar-proveedor.dto';
import { ProveedorEntity } from '../entities/proveedor.entity';
import { DiccionarioProveedorEntity } from '../entities/diccionario-proveedor.entity';
import { RecepcionMercaderiaEntity } from '../entities/recepcion-mercaderia.entity';
import { RecepcionMercaderiaDetalleEntity } from '../entities/recepcion-mercaderia-detalle.entity';

@Injectable()
export class ProveedoresService {
  constructor(
    @Inject(POSLYON_DATA_SOURCE)
    private readonly dataSource: DataSource,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  /**
   * Registra un nuevo proveedor en el catálogo comercial (ERD: PROVEEDOR).
   */
  async crearProveedor(
    dto: CrearProveedorDto,
    auditCtx: IAuditContext,
  ): Promise<ProveedorEntity> {
    const proveedorId = randomUUID();

    return await this.auditoriaService.ejecutarTransaccionAuditada<ProveedorEntity>({
      auditContext: {
        ...auditCtx,
        accion: AccionAuditoria.CREACION,
        motivo: auditCtx.motivo || 'Alta de proveedor comercial',
      },
      tablaAfectada: 'PROVEEDOR',
      idRegistroAfectado: proveedorId,
      obtenerSnapshotPrevio: async () => null,
      mutacion: async (manager) => {
        const cuitNormalizado = dto.cuit.trim();
        const existentes = await manager.query(
          `SELECT id FROM proveedor WHERE cuit = $1 AND deleted_at IS NULL`,
          [cuitNormalizado],
        );

        if (existentes.length > 0) {
          throw new ConflictException(
            `Ya existe un proveedor activo registrado con el CUIT/RUT ${cuitNormalizado}.`,
          );
        }

        const ahora = new Date().toISOString();
        const res = await manager.query(
          `INSERT INTO proveedor (
            id, razon_social, cuit, contacto_telefono, contacto_email,
            activo, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING *`,
          [
            proveedorId,
            dto.razon_social.trim(),
            cuitNormalizado,
            dto.contacto_telefono ? dto.contacto_telefono.trim() : null,
            dto.contacto_email ? dto.contacto_email.trim().toLowerCase() : null,
            true,
            ahora,
            ahora,
          ],
        );

        return {
          resultado: res[0] as ProveedorEntity,
        };
      },
    });
  }

  /**
   * Obtiene un proveedor por su UUID.
   */
  async obtenerProveedorPorId(id: string): Promise<ProveedorEntity> {
    const res = await this.dataSource.query(
      `SELECT * FROM proveedor WHERE id = $1 AND activo = true`,
      [id],
    );

    if (!res || res.length === 0) {
      throw new NotFoundException(`Proveedor con ID ${id} no encontrado.`);
    }

    return res[0];
  }

  /**
   * Lista todos los proveedores comerciales activos.
   */
  async listarProveedores(): Promise<ProveedorEntity[]> {
    return await this.dataSource.query(
      `SELECT * FROM proveedor WHERE activo = true ORDER BY razon_social ASC`,
    );
  }

  /**
   * Actualiza los datos de un proveedor comercial.
   */
  async actualizarProveedor(
    id: string,
    dto: ActualizarProveedorDto,
    auditCtx: IAuditContext,
  ): Promise<ProveedorEntity> {
    return await this.auditoriaService.ejecutarTransaccionAuditada<ProveedorEntity>({
      auditContext: {
        ...auditCtx,
        accion: AccionAuditoria.MODIFICACION,
        motivo: auditCtx.motivo || 'Actualización de datos de proveedor',
      },
      tablaAfectada: 'PROVEEDOR',
      idRegistroAfectado: id,
      obtenerSnapshotPrevio: async (manager) => {
        const rows = await manager.query(
          `SELECT * FROM proveedor WHERE id = $1 AND activo = true`,
          [id],
        );
        return rows[0] || null;
      },
      mutacion: async (manager) => {
        const rows = await manager.query(
          `SELECT * FROM proveedor WHERE id = $1 AND activo = true`,
          [id],
        );
        const actual = rows[0];

        if (!actual) {
          throw new NotFoundException(`Proveedor ${id} no encontrado para actualizar.`);
        }

        if (dto.cuit && dto.cuit.trim() !== actual.cuit) {
          const existentes = await manager.query(
            `SELECT id FROM proveedor WHERE cuit = $1 AND id != $2 AND deleted_at IS NULL`,
            [dto.cuit.trim(), id],
          );
          if (existentes.length > 0) {
            throw new ConflictException(
              `Ya existe otro proveedor registrado con el CUIT/RUT ${dto.cuit.trim()}.`,
            );
          }
        }

        const razonSocial = dto.razon_social ? dto.razon_social.trim() : actual.razon_social;
        const cuit = dto.cuit ? dto.cuit.trim() : actual.cuit;
        const telefono = dto.contacto_telefono !== undefined ? dto.contacto_telefono : actual.contacto_telefono;
        const email = dto.contacto_email !== undefined ? dto.contacto_email : actual.contacto_email;
        const ahora = new Date().toISOString();

        const res = await manager.query(
          `UPDATE proveedor SET
            razon_social = $1,
            cuit = $2,
            contacto_telefono = $3,
            contacto_email = $4,
            updated_at = $5
          WHERE id = $6
          RETURNING *`,
          [razonSocial, cuit, telefono, email, ahora, id],
        );

        return {
          resultado: res[0] as ProveedorEntity,
        };
      },
    });
  }

  /**
   * Realiza la baja lógica (Soft Delete) de un proveedor.
   */
  async eliminarProveedor(
    id: string,
    auditCtx: IAuditContext,
  ): Promise<{ success: boolean; message: string }> {
    return await this.auditoriaService.ejecutarTransaccionAuditada<{ success: boolean; message: string }>({
      auditContext: {
        ...auditCtx,
        accion: AccionAuditoria.SOFT_DELETE,
        motivo: auditCtx.motivo || 'Baja lógica de proveedor',
      },
      tablaAfectada: 'PROVEEDOR',
      idRegistroAfectado: id,
      obtenerSnapshotPrevio: async (manager) => {
        const rows = await manager.query(
          `SELECT * FROM proveedor WHERE id = $1 AND activo = true`,
          [id],
        );
        return rows[0] || null;
      },
      mutacion: async (manager) => {
        const rows = await manager.query(
          `SELECT * FROM proveedor WHERE id = $1 AND activo = true`,
          [id],
        );
        const actual = rows[0];

        if (!actual) {
          throw new NotFoundException(`Proveedor ${id} no encontrado para dar de baja.`);
        }

        const ahora = new Date().toISOString();
        await manager.query(
          `UPDATE proveedor SET
            activo = false,
            deleted_at = $1,
            updated_at = $1
          WHERE id = $2`,
          [ahora, id],
        );

        return {
          resultado: {
            success: true,
            message: `Proveedor ${actual.razon_social} dado de baja lógicamente con éxito.`,
          },
        };
      },
    });
  }

  /**
   * Vincula o actualiza un alias de factura al catálogo oficial (RF-14 / UNIQUE(id_proveedor, nombre_en_factura)).
   */
  async vincularDiccionario(
    dto: VincularDiccionarioDto,
    auditCtx: IAuditContext,
  ): Promise<DiccionarioProveedorEntity> {
    const aliasId = randomUUID();

    return await this.auditoriaService.ejecutarTransaccionAuditada<DiccionarioProveedorEntity>({
      auditContext: {
        ...auditCtx,
        accion: AccionAuditoria.NUEVO_ALIAS_DICCIONARIO,
        motivo: auditCtx.motivo || `Vinculación de alias factura: "${dto.nombre_en_factura}"`,
      },
      tablaAfectada: 'DICCIONARIO_PROVEEDOR',
      idRegistroAfectado: aliasId,
      obtenerSnapshotPrevio: async () => null,
      mutacion: async (manager) => {
        await this.obtenerProveedorPorId(dto.id_proveedor);

        const ahora = new Date().toISOString();
        const textoFactura = dto.nombre_en_factura.trim();

        // Upsert respetando UNIQUE(id_proveedor, nombre_en_factura)
        const res = await manager.query(
          `INSERT INTO diccionario_proveedor (
            id, id_proveedor, id_producto, nombre_en_factura, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (id_proveedor, nombre_en_factura)
          DO UPDATE SET id_producto = EXCLUDED.id_producto, updated_at = EXCLUDED.updated_at
          RETURNING *`,
          [aliasId, dto.id_proveedor, dto.id_producto, textoFactura, ahora, ahora],
        );

        return {
          resultado: res[0] as DiccionarioProveedorEntity,
        };
      },
    });
  }

  /**
   * Consulta el diccionario de alias para sugerir automáticamente el producto oficial en base a la factura (RF-14).
   */
  async consultarAliasDiccionario(
    idProveedor: string,
    nombreEnFactura: string,
  ): Promise<DiccionarioProveedorEntity | null> {
    const res = await this.dataSource.query(
      `SELECT * FROM diccionario_proveedor
       WHERE id_proveedor = $1 AND LOWER(nombre_en_factura) = LOWER($2)`,
      [idProveedor, nombreEnFactura.trim()],
    );

    return res.length > 0 ? res[0] : null;
  }

  /**
   * Inicia una nueva orden de Recepción de Mercadería en estado BORRADOR (RF-14 / RF-15).
   */
  async iniciarRecepcion(
    dto: CrearRecepcionDto,
    auditCtx: IAuditContext,
  ): Promise<RecepcionMercaderiaEntity> {
    const recepcionId = randomUUID();

    return await this.auditoriaService.ejecutarTransaccionAuditada<RecepcionMercaderiaEntity>({
      auditContext: {
        ...auditCtx,
        accion: AccionAuditoria.CREACION,
        motivo: auditCtx.motivo || `Inicio de recepción de mercadería Remito ${dto.numero_remito}`,
      },
      tablaAfectada: 'RECEPCION_MERCADERIA',
      idRegistroAfectado: recepcionId,
      obtenerSnapshotPrevio: async () => null,
      mutacion: async (manager) => {
        const ahora = new Date().toISOString();
        const res = await manager.query(
          `INSERT INTO recepcion_mercaderia (
            id, id_sucursal, id_proveedor, id_usuario, numero_remito,
            estado, total_bultos, fecha_inicio, version, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 1, $9, $10)
          RETURNING *`,
          [
            recepcionId,
            dto.id_sucursal,
            dto.id_proveedor,
            dto.id_usuario,
            dto.numero_remito.trim(),
            EstadoRecepcion.BORRADOR,
            0,
            ahora,
            ahora,
            ahora,
          ],
        );

        return {
          resultado: {
            ...res[0],
            detalles: [],
          } as RecepcionMercaderiaEntity,
          versionNueva: 1,
        };
      },
    });
  }

  /**
   * Agrega un renglón de mercadería a la recepción evaluando matemáticamente el precio de venta sugerido (RF-15).
   */
  async agregarRenglonRecepcion(
    idRecepcion: string,
    dto: AgregarRenglonRecepcionDto,
    auditCtx: IAuditContext,
  ): Promise<RecepcionMercaderiaDetalleEntity> {
    const renglonId = randomUUID();

    return await this.auditoriaService.ejecutarTransaccionAuditada<RecepcionMercaderiaDetalleEntity>({
      auditContext: {
        ...auditCtx,
        accion: AccionAuditoria.OPERACION,
        motivo: auditCtx.motivo || `Carga de renglón en recepción ${idRecepcion}`,
      },
      tablaAfectada: 'RECEPCION_MERCADERIA_DETALLE',
      idRegistroAfectado: renglonId,
      obtenerSnapshotPrevio: async () => null,
      mutacion: async (manager) => {
        const recRows = await manager.query(
          `SELECT * FROM recepcion_mercaderia WHERE id = $1`,
          [idRecepcion],
        );

        if (!recRows || recRows.length === 0) {
          throw new NotFoundException(`Recepción ${idRecepcion} no encontrada.`);
        }

        const recepcion = recRows[0];
        if (
          recepcion.estado !== EstadoRecepcion.BORRADOR &&
          recepcion.estado !== EstadoRecepcion.EN_REVISION
        ) {
          throw new BadRequestException(
            `No se pueden agregar renglones a una recepción en estado ${recepcion.estado}.`,
          );
        }

        // Consultar costo y precio minorista previo en la sucursal para calcular Markup
        const prodSucRows = await manager.query(
          `SELECT precio_costo, precio_minorista FROM producto_sucursal
           WHERE id_producto_global = $1 AND id_sucursal = $2`,
          [dto.id_producto, recepcion.id_sucursal],
        );

        const costoAnterior = prodSucRows.length > 0 ? Number(prodSucRows[0].precio_costo) : 0;
        const precioMinoristaAnterior = prodSucRows.length > 0 ? Number(prodSucRows[0].precio_minorista) : 0;

        // Motor de Preservación de Margen (RF-15)
        const calculoMargen = MargenPreciosDomainService.calcular(
          costoAnterior,
          precioMinoristaAnterior,
          dto.costo_unitario,
        );

        const ahora = new Date().toISOString();
        const res = await manager.query(
          `INSERT INTO recepcion_mercaderia_detalle (
            id, id_recepcion_mercaderia, id_producto, cantidad_declarada,
            cantidad_recibida, costo_unitario, costo_anterior, precio_venta_sugerido,
            aplicar_precio_sugerido, estado_discrepancia, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          RETURNING *`,
          [
            renglonId,
            idRecepcion,
            dto.id_producto,
            dto.cantidad_declarada,
            dto.cantidad_declarada, // Preliminarmente igual a declarada hasta el conteo de confirmación
            dto.costo_unitario,
            costoAnterior,
            calculoMargen.precio_minorista_sugerido,
            true,
            EstadoDiscrepanciaItem.CONFORME,
            ahora,
            ahora,
          ],
        );

        // Si se informó el alias de factura, persistir en el diccionario automáticamente (RF-14)
        if (dto.nombre_en_factura) {
          const aliasUUID = randomUUID();
          await manager.query(
            `INSERT INTO diccionario_proveedor (
              id, id_proveedor, id_producto, nombre_en_factura, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (id_proveedor, nombre_en_factura)
            DO UPDATE SET id_producto = EXCLUDED.id_producto, updated_at = EXCLUDED.updated_at`,
            [aliasUUID, recepcion.id_proveedor, dto.id_producto, dto.nombre_en_factura.trim(), ahora, ahora],
          );
        }

        return {
          resultado: res[0] as RecepcionMercaderiaDetalleEntity,
        };
      },
    });
  }

  /**
   * Confirma la Recepción de Mercadería de forma atómica (ACID / RF-15 / O-18):
   * 1. Solo la `cantidad_recibida` físicamente contada ingresa al `stock_fisico`.
   * 2. Actualiza `precio_costo` en inventario.
   * 3. Si `aplicar_precio_sugerido === true`, actualiza `precio_minorista` para preservar margen.
   * 4. Pasa el estado a `CONFIRMADA` bajo control OCC.
   */
  async confirmarRecepcion(
    idRecepcion: string,
    dto: ConfirmarRecepcionDto,
    auditCtx: IAuditContext,
  ): Promise<RecepcionMercaderiaEntity> {
    return await this.auditoriaService.ejecutarTransaccionAuditada<RecepcionMercaderiaEntity>({
      auditContext: {
        ...auditCtx,
        accion: AccionAuditoria.CAMBIO_PRECIO_POR_RECEPCION,
        motivo: auditCtx.motivo || `Confirmación de remito y actualización de inventario / precios`,
      },
      tablaAfectada: 'RECEPCION_MERCADERIA',
      idRegistroAfectado: idRecepcion,
      obtenerSnapshotPrevio: async (manager) => {
        const rows = await manager.query(
          `SELECT * FROM recepcion_mercaderia WHERE id = $1`,
          [idRecepcion],
        );
        return rows[0] || null;
      },
      mutacion: async (manager) => {
        const recRows = await manager.query(
          `SELECT * FROM recepcion_mercaderia WHERE id = $1`,
          [idRecepcion],
        );

        if (!recRows || recRows.length === 0) {
          throw new NotFoundException(`Recepción ${idRecepcion} no encontrada.`);
        }

        const recepcion = recRows[0];
        if (recepcion.estado === EstadoRecepcion.CONFIRMADA) {
          throw new BadRequestException(`La recepción ${idRecepcion} ya fue confirmada con anterioridad.`);
        }

        const detallesRows = await manager.query(
          `SELECT * FROM recepcion_mercaderia_detalle WHERE id_recepcion_mercaderia = $1`,
          [idRecepcion],
        );

        const mapaDetalles = new Map<string, any>();
        detallesRows.forEach((d: any) => mapaDetalles.set(d.id, d));

        const ahora = new Date().toISOString();
        let bultosTotales = 0;

        for (const r of dto.renglones) {
          const detalle = mapaDetalles.get(r.id_detalle);
          if (!detalle) {
            throw new NotFoundException(`Renglón ${r.id_detalle} no pertenece a la recepción.`);
          }

          // Evaluar discrepancia matemática (Resolución O-17)
          const discrepancia = MargenPreciosDomainService.evaluarDiscrepanciaRecepcion(
            Number(detalle.cantidad_declarada),
            r.cantidad_recibida,
          );

          // Actualizar renglón
          await manager.query(
            `UPDATE recepcion_mercaderia_detalle SET
              cantidad_recibida = $1,
              aplicar_precio_sugerido = $2,
              estado_discrepancia = $3,
              updated_at = $4
            WHERE id = $5`,
            [r.cantidad_recibida, r.aplicar_precio_sugerido, discrepancia, ahora, r.id_detalle],
          );

          bultosTotales += Number(r.cantidad_recibida);

          // Impactar inventario de sucursal: solo la cantidad recibida entra al stock (Resolución O-18)
          // Y si aplicar_precio_sugerido es true, actualizar precio_minorista preservando Markup (RF-15)
          await manager.query(
            `UPDATE producto_sucursal SET
              stock_fisico = stock_fisico + $1,
              precio_costo = $2,
              precio_minorista = CASE WHEN $3 = true THEN $4 ELSE precio_minorista END,
              version = version + 1,
              updated_at = $5
            WHERE id_producto_global = $6 AND id_sucursal = $7`,
            [
              r.cantidad_recibida,
              detalle.costo_unitario,
              r.aplicar_precio_sugerido,
              detalle.precio_venta_sugerido,
              ahora,
              detalle.id_producto,
              recepcion.id_sucursal,
            ],
          );
        }

        const nuevaVersion = Number(recepcion.version) + 1;
        const resRec = await manager.query(
          `UPDATE recepcion_mercaderia SET
            estado = $1,
            total_bultos = $2,
            fecha_completado = $3,
            version = $4,
            updated_at = $3
          WHERE id = $5
          RETURNING *`,
          [EstadoRecepcion.CONFIRMADA, bultosTotales, ahora, nuevaVersion, idRecepcion],
        );

        const detallesFinales = await manager.query(
          `SELECT * FROM recepcion_mercaderia_detalle WHERE id_recepcion_mercaderia = $1`,
          [idRecepcion],
        );

        return {
          resultado: {
            ...resRec[0],
            detalles: detallesFinales,
          } as RecepcionMercaderiaEntity,
          versionNueva: nuevaVersion,
        };
      },
    });
  }

  /**
   * Obtiene una recepción de mercadería por ID con todos sus renglones.
   */
  async obtenerRecepcionPorId(id: string): Promise<RecepcionMercaderiaEntity> {
    const recRows = await this.dataSource.query(
      `SELECT * FROM recepcion_mercaderia WHERE id = $1`,
      [id],
    );

    if (!recRows || recRows.length === 0) {
      throw new NotFoundException(`Recepción con ID ${id} no encontrada.`);
    }

    const detalles = await this.dataSource.query(
      `SELECT * FROM recepcion_mercaderia_detalle WHERE id_recepcion_mercaderia = $1 ORDER BY created_at ASC`,
      [id],
    );

    return {
      ...recRows[0],
      detalles,
    } as RecepcionMercaderiaEntity;
  }
}
