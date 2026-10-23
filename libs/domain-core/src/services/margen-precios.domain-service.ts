import { EstadoDiscrepanciaItem } from '../enums/estado-discrepancia-item.enum';
import { ICalculoPrecioSugerido } from '../interfaces/calculo-precio-sugerido.interface';

/**
 * Servicio Puro de Dominio para el Motor de Preservación de Margen Bruto Comercial
 * y Evaluación de Discrepancias en Recepción de Mercadería (RF-15 y Resolución O-17).
 */
export class MargenPreciosDomainService {
  /**
   * Calcula el precio de venta minorista sugerido preservando con exactitud matemática
   * el margen de marcación histórico (*Markup*) ante incrementos en el costo de reposición (RF-15):
   *
   * $$\text{Markup Histórico} = \frac{\text{precio\_minorista\_anterior} - \text{costo\_anterior}}{\text{costo\_anterior}}$$
   * $$\text{precio\_sugerido} = \text{round}\left(\text{costo\_nuevo} \times (1 + \text{Markup Histórico})\right)$$
   *
   * Si `costoAnterior <= 0` o `precioMinoristaAnterior <= costoAnterior` (ej. primer ingreso de catálogo),
   * aplica el `margenDefecto` configurable (por defecto 30% = `0.30`).
   */
  static calcular(
    costoAnterior: number,
    precioMinoristaAnterior: number,
    costoNuevo: number,
    margenDefecto = 0.3,
  ): ICalculoPrecioSugerido {
    if (costoNuevo <= 0) {
      throw new Error(
        'El nuevo costo unitario de reposición debe ser mayor a 0.',
      );
    }

    let markupRatio = margenDefecto;

    if (costoAnterior > 0 && precioMinoristaAnterior > costoAnterior) {
      markupRatio = (precioMinoristaAnterior - costoAnterior) / costoAnterior;
    }

    const precioMinoristaSugerido = Math.round(costoNuevo * (1 + markupRatio));
    const diferenciaCosto = Number((costoNuevo - costoAnterior).toFixed(2));
    const variacionCostoPorcentual =
      costoAnterior > 0
        ? Number(((diferenciaCosto / costoAnterior) * 100).toFixed(2))
        : 0;

    return {
      costo_anterior: costoAnterior,
      costo_nuevo: costoNuevo,
      precio_minorista_anterior: precioMinoristaAnterior,
      markup_porcentual: Number((markupRatio * 100).toFixed(2)),
      precio_minorista_sugerido: precioMinoristaSugerido,
      diferencia_costo: diferenciaCosto,
      variacion_costo_porcentual: variacionCostoPorcentual,
    };
  }

  /**
   * Clasifica el estado de discrepancia física de un renglón de remito al comparar
   * la cantidad declarada en la factura contra la cantidad real contada en depósito (Resolución O-17).
   */
  static evaluarDiscrepanciaRecepcion(
    cantidadDeclarada: number,
    cantidadRecibida: number,
    rechazadoPorCalidad = false,
  ): EstadoDiscrepanciaItem {
    if (rechazadoPorCalidad) {
      return EstadoDiscrepanciaItem.RECHAZADO_CALIDAD;
    }
    if (cantidadRecibida < cantidadDeclarada) {
      return EstadoDiscrepanciaItem.FALTANTE;
    }
    if (cantidadRecibida > cantidadDeclarada) {
      return EstadoDiscrepanciaItem.SOBRANTE;
    }
    return EstadoDiscrepanciaItem.CONFORME;
  }
}
