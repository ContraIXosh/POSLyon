import { EstadoLogistico } from '../enums/estado-logistico.enum';

/**
 * Resultado del cálculo de deducción de inventario para productos unitarios o Packs (Resolución O-26).
 */
export interface ResultadoDescuentoPack {
  id_producto_objetivo: string;
  es_pack: boolean;
  factor_multiplicador: number;
  cantidad_total_a_descontar: number;
}

/**
 * Guarda de Seguridad Crítica (Resolución C-11 y RF-02):
 * Prohíbe incondicionalmente finalizar o cobrar un pedido si su estado logístico es `INCOMPLETO`
 * (faltante físico reportado por el embalador). El cajero debe regularizar primero el carrito en mostrador.
 */
export function validarPuedeCobrar(estadoLogistico: EstadoLogistico): boolean {
  return estadoLogistico !== EstadoLogistico.INCOMPLETO;
}

/**
 * Política Universal de Stock Negativo Permisivo (Resolución C-12 y RF-02):
 * En el mostrador físico presencial, el cliente ya tiene el producto en la mano.
 * Por diseño de negocio, la venta jamás se bloquea por `stock_fisico <= 0`;
 * las discrepancias se derivan a auditoría forense asíncrona (`VENTA_OFFLINE_STOCK_NEGATIVO`).
 */
export function validarDisponibilidadParaVenta(
  _stockFisico: number,
  _cantidadDemandada: number,
): boolean {
  return true;
}

/**
 * Calcula sobre qué producto real y en qué magnitud debe descontarse el inventario al confirmar una venta
 * (RF-04 y Resolución O-26: Arquitectura de Inventario de Packs sin stock físico propio).
 *
 * - Si el artículo tiene `id_producto_base` no nulo, es un Pack: el descuento se redirige al producto base
 *   multiplicando `cantidad_vendida * multiplicador_stock`.
 * - Si es un artículo estándar o pesable, se descuenta sobre sí mismo con factor 1.
 */
export function calcularDescuentoStockPack(params: {
  id_producto: string;
  cantidad_vendida: number;
  id_producto_base?: string | null;
  multiplicador_stock?: number;
}): ResultadoDescuentoPack {
  if (params.cantidad_vendida <= 0) {
    throw new Error('La cantidad vendida debe ser mayor a 0.');
  }

  const esPack = Boolean(
    params.id_producto_base && params.id_producto_base.trim().length > 0,
  );
  const factor = esPack ? Number(params.multiplicador_stock || 1) : 1;

  if (factor <= 0) {
    throw new Error('El multiplicador de stock del pack debe ser mayor a 0.');
  }

  return {
    id_producto_objetivo: esPack
      ? (params.id_producto_base as string)
      : params.id_producto,
    es_pack: esPack,
    factor_multiplicador: factor,
    cantidad_total_a_descontar: Number(
      (params.cantidad_vendida * factor).toFixed(4),
    ),
  };
}

/**
 * Calcula la disponibilidad vendible virtual de un Pack en tiempo real (Resolución O-26):
 * $$\text{StockVirtualPack} = \lfloor \text{StockDisponible}_{\text{base}} / \text{multiplicador\_stock} \rfloor$$
 */
export function calcularStockVirtualPack(
  stockDisponibleBase: number,
  multiplicadorStock: number,
): number {
  if (multiplicadorStock <= 0) {
    throw new Error('El multiplicador de stock debe ser mayor a 0.');
  }
  if (stockDisponibleBase <= 0) {
    return 0;
  }
  return Math.floor(stockDisponibleBase / multiplicadorStock);
}
