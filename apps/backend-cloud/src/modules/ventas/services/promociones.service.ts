import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';
import {
  AccionAuditoria,
  AplicarPromocionDto,
  IAuditContext,
  ItemPromocionCarritoDto,
  TipoEfectoPromocion,
} from '@poslyon/domain-core';
import { POSLYON_DATA_SOURCE } from '../../../database/database.module';
import { AuditoriaService } from '../../auditoria/services/auditoria.service';
import { CrearPromocionDto } from '../dtos/crear-promocion.dto';
import { PromocionEntity } from '../entities/promocion.entity';

export interface ItemEvaluadoPromocion {
  id_producto: string;
  cantidad: number;
  precio_unitario: number;
  subtotal_bruto: number;
  monto_descuento: number;
  subtotal_neto: number;
  id_promocion_aplicada?: string | null;
  nombre_promocion?: string | null;
}

export interface ResultadoEvaluacionCarrito {
  items: ItemEvaluadoPromocion[];
  total_bruto: number;
  total_descuento: number;
  total_neto: number;
}

@Injectable()
export class PromocionesService {
  constructor(
    @Inject(POSLYON_DATA_SOURCE)
    private readonly dataSource: DataSource,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  /**
   * Crea una nueva regla de promoción comercial para la sucursal (RF-06).
   */
  async crearPromocion(
    dto: CrearPromocionDto,
    auditCtx: IAuditContext,
  ): Promise<PromocionEntity> {
    const promoId = randomUUID();

    return await this.auditoriaService.ejecutarTransaccionAuditada<PromocionEntity>({
      auditContext: {
        ...auditCtx,
        accion: AccionAuditoria.CREACION,
        motivo: auditCtx.motivo || `Alta de promoción: ${dto.nombre}`,
      },
      tablaAfectada: 'PROMOCION',
      idRegistroAfectado: promoId,
      obtenerSnapshotPrevio: async () => null,
      mutacion: async (manager) => {
        const ahora = new Date().toISOString();
        const res = await manager.query(
          `INSERT INTO promocion (
            id, id_sucursal, nombre, tipo_efecto, valor_efecto,
            cantidad_minima, id_producto_aplicable, activo, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING *`,
          [
            promoId,
            dto.id_sucursal,
            dto.nombre.trim(),
            dto.tipo_efecto,
            dto.valor_efecto,
            dto.cantidad_minima,
            dto.id_producto_aplicable || null,
            true,
            ahora,
            ahora,
          ],
        );

        return {
          resultado: res[0] as PromocionEntity,
        };
      },
    });
  }

  /**
   * Lista las promociones activas de una sucursal.
   */
  async listarPromociones(idSucursal: string): Promise<PromocionEntity[]> {
    return await this.dataSource.query(
      `SELECT * FROM promocion WHERE id_sucursal = $1 AND activo = true ORDER BY created_at DESC`,
      [idSucursal],
    );
  }

  /**
   * Evalúa dinámicamente las promociones aplicables sobre el carrito sin mutar el precio de lista (RF-06 / O-11).
   */
  async evaluarCarrito(dto: AplicarPromocionDto): Promise<ResultadoEvaluacionCarrito> {
    const promociones: PromocionEntity[] = await this.listarPromociones(dto.id_sucursal);

    let totalBruto = 0;
    let totalDescuento = 0;

    const itemsEvaluados: ItemEvaluadoPromocion[] = dto.items.map((item: ItemPromocionCarritoDto) => {
      const subtotalBruto = Number((item.precio_unitario * item.cantidad).toFixed(2));
      totalBruto += subtotalBruto;

      // Buscar si existe promoción aplicable al producto
      let promoAplicable: PromocionEntity | undefined;

      if (dto.id_promocion) {
        promoAplicable = promociones.find((p) => p.id === dto.id_promocion);
      } else {
        promoAplicable = promociones.find(
          (p) =>
            p.activo &&
            (p.id_producto_aplicable === item.id_producto || p.id_producto_aplicable === null) &&
            item.cantidad >= Number(p.cantidad_minima),
        );
      }

      let descuentoItem = 0;
      let idPromoAplicada: string | null = null;
      let nombrePromo: string | null = null;

      if (promoAplicable && item.cantidad >= Number(promoAplicable.cantidad_minima)) {
        idPromoAplicada = promoAplicable.id;
        nombrePromo = promoAplicable.nombre;

        switch (promoAplicable.tipo_efecto) {
          case TipoEfectoPromocion.PORCENTAJE: {
            const pct = Number(promoAplicable.valor_efecto) / 100;
            descuentoItem = Number((subtotalBruto * pct).toFixed(2));
            break;
          }
          case TipoEfectoPromocion.MONTO_FIJO_DESCUENTO: {
            descuentoItem = Math.min(subtotalBruto, Number(promoAplicable.valor_efecto));
            break;
          }
          case TipoEfectoPromocion.CANTIDAD_BONIFICADA: {
            // Ejemplo: 2x1 o 3x2. Lleva cantMinima y paga valorEfecto.
            // Para cada grupo completo de cantidad_minima, se bonifican (cantidad_minima - valor_efecto) unidades
            const cantMin = Number(promoAplicable.cantidad_minima);
            const cantPaga = Number(promoAplicable.valor_efecto);
            const grupos = Math.floor(item.cantidad / cantMin);
            const unidadesBonificadas = grupos * (cantMin - cantPaga);
            descuentoItem = Number((unidadesBonificadas * item.precio_unitario).toFixed(2));
            break;
          }
          case TipoEfectoPromocion.PRECIO_FIJO: {
            const precioFijoTotal = Number(promoAplicable.valor_efecto);
            if (subtotalBruto > precioFijoTotal) {
              descuentoItem = Number((subtotalBruto - precioFijoTotal).toFixed(2));
            }
            break;
          }
        }
      }

      totalDescuento += descuentoItem;
      const subtotalNeto = Number((subtotalBruto - descuentoItem).toFixed(2));

      return {
        id_producto: item.id_producto,
        cantidad: item.cantidad,
        precio_unitario: item.precio_unitario,
        subtotal_bruto: subtotalBruto,
        monto_descuento: descuentoItem,
        subtotal_neto: subtotalNeto,
        id_promocion_aplicada: idPromoAplicada,
        nombre_promocion: nombrePromo,
      };
    });

    return {
      items: itemsEvaluados,
      total_bruto: Number(totalBruto.toFixed(2)),
      total_descuento: Number(totalDescuento.toFixed(2)),
      total_neto: Number((totalBruto - totalDescuento).toFixed(2)),
    };
  }
}
