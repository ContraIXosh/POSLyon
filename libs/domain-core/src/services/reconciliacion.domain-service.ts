import { EstadoCuarentena } from '../enums/estado-cuarentena.enum';
import { TipoDiscrepanciaPrecio } from '../enums/tipo-discrepancia-precio.enum';

/**
 * Resultado matemático del cálculo de stock inicial al reconciliar un código huérfano (RF-13 / C-18).
 */
export interface ResultadoStockReconciliacion {
  stock_fisico_contado_en_gondola: number;
  unidades_vendidas_historicas: number;
  stock_inicial_calculado: number;
  stock_final_post_deduccion: number;
}

/**
 * Evaluación de discrepancia financiera por renglón individual de venta comodín (Resolución C-21 Nivel 1).
 */
export interface ResultadoDiscrepanciaPrecioRenglon {
  precio_cobrado: number;
  precio_oficial: number;
  cantidad: number;
  diferencia_unitaria: number;
  diferencia_total: number;
  tipo_discrepancia: TipoDiscrepanciaPrecio;
}

/**
 * Consolidado financiero de mermas y sobrantes lógicos agrupado por Turno de Caja (Resolución C-21 Nivel 2).
 */
export interface BalanceReconciliacionTurno {
  id_turno: string;
  merma_acumulada: number;
  sobrante_acumulado: number;
  balance_neto: number;
}

/**
 * Servicio Puro de Dominio para el Algoritmo de Reconciliación de Códigos Huérfanos (Artículo Comodín RF-12 / RF-13)
 * y Resolución Matemática de Cuarentena de Stock (C-23).
 */
export class ReconciliacionDomainService {
  /**
   * Calcula el stock inicial de inserción para un producto nuevo surgido de la reconciliación
   * de ventas rápidas offline (RF-13 y Resolución C-18):
   *
   * $$\text{stock\_inicial\_calculado} = \text{stock\_fisico\_actual} + \text{unidades\_vendidas\_historicas}$$
   *
   * De este modo, cuando el motor resta las `unidades_vendidas_historicas` de los tickets pasados reasignados,
   * el `stock_fisico` final en la sucursal queda exactamente igual al conteo real en góndola (`stock_fisico_actual`).
   */
  static calcularStockInicialReconciliacion(
    stockFisicoActualEnGondola: number,
    unidadesVendidasHistoricas: number,
  ): ResultadoStockReconciliacion {
    if (stockFisicoActualEnGondola < 0) {
      throw new Error(
        'El conteo físico actual en góndola no puede ser negativo.',
      );
    }
    if (unidadesVendidasHistoricas < 0) {
      throw new Error(
        'Las unidades vendidas históricas no pueden ser negativas.',
      );
    }

    const stockInicialCalculado = Number(
      (stockFisicoActualEnGondola + unidadesVendidasHistoricas).toFixed(4),
    );
    const stockFinalPostDeduccion = Number(
      (stockInicialCalculado - unidadesVendidasHistoricas).toFixed(4),
    );

    return {
      stock_fisico_contado_en_gondola: stockFisicoActualEnGondola,
      unidades_vendidas_historicas: unidadesVendidasHistoricas,
      stock_inicial_calculado: stockInicialCalculado,
      stock_final_post_deduccion: stockFinalPostDeduccion,
    };
  }

  /**
   * Evalúa la discrepancia financiera de un renglón histórico vendido como comodín frente al precio oficial
   * de catálogo multiplicando rigurosamente por la cantidad vendida (Resolución C-21 Nivel 1).
   */
  static evaluarDiscrepanciaPrecioRenglon(
    precioCobradoSnapshot: number,
    precioOficialCatalogo: number,
    cantidadVendida: number,
  ): ResultadoDiscrepanciaPrecioRenglon {
    const diferenciaUnitaria = Number(
      (precioCobradoSnapshot - precioOficialCatalogo).toFixed(2),
    );
    const diferenciaTotal = Number(
      (diferenciaUnitaria * cantidadVendida).toFixed(2),
    );

    let tipoDiscrepancia = TipoDiscrepanciaPrecio.PRECIO_EXACTO;
    if (diferenciaTotal > 0) {
      tipoDiscrepancia = TipoDiscrepanciaPrecio.SOBRANTE_LOGICO;
    } else if (diferenciaTotal < 0) {
      tipoDiscrepancia = TipoDiscrepanciaPrecio.MERMA_LOGICA;
    }

    return {
      precio_cobrado: precioCobradoSnapshot,
      precio_oficial: precioOficialCatalogo,
      cantidad: cantidadVendida,
      diferencia_unitaria: diferenciaUnitaria,
      diferencia_total: diferenciaTotal,
      tipo_discrepancia: tipoDiscrepancia,
    };
  }

  /**
   * Consolida en memoria las mermas y sobrantes lógicos por cada Turno de Caja involucrado
   * en los tickets reconciliados (Resolución C-21 Nivel 2 / Escenario 6 del ERS).
   */
  static consolidarBalancesPorTurno(
    renglones: Array<{
      id_turno: string;
      precio_unitario: number;
      cantidad: number;
    }>,
    precioOficialCatalogo: number,
  ): Map<string, BalanceReconciliacionTurno> {
    const balancePorTurno = new Map<string, BalanceReconciliacionTurno>();

    for (const item of renglones) {
      const evaluacion = this.evaluarDiscrepanciaPrecioRenglon(
        item.precio_unitario,
        precioOficialCatalogo,
        item.cantidad,
      );

      if (evaluacion.diferencia_total !== 0) {
        const actual = balancePorTurno.get(item.id_turno) || {
          id_turno: item.id_turno,
          merma_acumulada: 0,
          sobrante_acumulado: 0,
          balance_neto: 0,
        };

        if (evaluacion.diferencia_total < 0) {
          actual.merma_acumulada = Number(
            (actual.merma_acumulada + evaluacion.diferencia_total).toFixed(2),
          );
        } else {
          actual.sobrante_acumulado = Number(
            (actual.sobrante_acumulado + evaluacion.diferencia_total).toFixed(
              2,
            ),
          );
        }

        actual.balance_neto = Number(
          (actual.merma_acumulada + actual.sobrante_acumulado).toFixed(2),
        );
        balancePorTurno.set(item.id_turno, actual);
      }
    }

    return balancePorTurno;
  }

  /**
   * Construye la Clave Canónica de Agrupamiento de Comodines (Resolución O-27):
   * - Si posee código de barras escaneado, agrupa por `codigo_comodin`.
   * - Si fue digitado en mostrador sin código de barras, agrupa por `'SIN_CODIGO:' + TRIM(LOWER(nombre_comodin))`,
   *   impidiendo que queden artículos comodín invisibles o irreconciliables.
   */
  static generarClaveAgrupamientoHuerfano(
    codigoComodin?: string | null,
    nombreComodin?: string | null,
  ): string {
    if (codigoComodin && codigoComodin.trim().length > 0) {
      return codigoComodin.trim();
    }
    const nombreNormalizado = (nombreComodin || 'SIN_NOMBRE')
      .trim()
      .toLowerCase();
    return `SIN_CODIGO:${nombreNormalizado}`;
  }

  /**
   * Aplica la regla matemática no destructiva para resolver una Alerta de Cuarentena (Resolución C-23):
   * - Si es `MERMA_CONFIRMADA`: deduce únicamente la `cantidad_faltante` (`stock_fisico - cantidad_faltante`),
   *   jamás reseteando destructivamente a 0 el stock remanente legítimo en la tienda.
   * - Si es `FALSA_ALARMA`: mantiene intacto el `stock_fisico`.
   */
  static calcularStockPostCuarentena(
    stockFisicoActual: number,
    cantidadFaltante: number,
    estadoResolucion:
      | EstadoCuarentena.MERMA_CONFIRMADA
      | EstadoCuarentena.FALSA_ALARMA,
  ): number {
    if (cantidadFaltante < 0) {
      throw new Error('La cantidad faltante no puede ser negativa.');
    }
    if (estadoResolucion === EstadoCuarentena.MERMA_CONFIRMADA) {
      return Number((stockFisicoActual - cantidadFaltante).toFixed(4));
    }
    return stockFisicoActual;
  }
}
