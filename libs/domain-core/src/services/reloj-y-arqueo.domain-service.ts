/**
 * Resultado de la evaluación del Reloj Monótono e Invariante High Watermark (Resolución S-10).
 */
export interface ResultadoRelojConfiable {
  fechaConfiable: Date;
  isoConfiable: string;
  desfaseRegresivoDetectado: boolean;
}

/**
 * Parámetros de entrada para el cálculo canónico de Arqueo Ciego de Caja (RF-17 / Resolución O-23).
 */
export interface ParametrosArqueoCaja {
  monto_inicial_efectivo: number;
  ventas_efectivo: number;
  abonos_efectivo: number;
  ingresos_manuales_efectivo: number;
  devoluciones_efectivo: number;
  sangrias_retiros_efectivo: number;
  pagos_proveedores_efectivo: number;
  efectivo_declarado_ciego: number;
}

/**
 * Resultado del cálculo de Arqueo Ciego de Caja (RF-17 / Resolución O-23).
 */
export interface ResultadoArqueoCaja {
  efectivo_esperado_sistema: number;
  efectivo_declarado_cajero: number;
  diferencia_caja: number;
  estado_cuadre: 'EXACTO' | 'SOBRANTE' | 'FALTANTE';
}

/**
 * Guarda Pura de Dominio contra Manipulación de Reloj en Modo Offline Autónomo (Resolución S-10, C-13 y C-14).
 *
 * Combina el avance de un reloj monótono de hardware (`performance.now()`) con una marca de agua máxima
 * histórica (*High Watermark*) de la base de datos local:
 * - Si un usuario atrasa deliberadamente el reloj de Windows/Linux o la BIOS en frío para evitar que
 *   expiren las reservas de carritos (`GarbageCollectionService`) o para adulterar la fecha de un ticket,
 *   el tiempo estimado cae por debajo del `highWatermarkIso`.
 * - La guarda detecta la anomalía (`desfaseRegresivoDetectado = true`) y congela el reloj en `highWatermark + 1000ms`,
 *   garantizando monotonía temporal estricta ($t_{n+1} \ge t_n$).
 */
export class RelojMonotonoGuard {
  private t0RealMs: number;
  private t0MonotonicMs: number;
  private highWatermarkIso: string;

  constructor(params?: {
    tiempoInicialRealMs?: number;
    tiempoInicialMonotonoMs?: number;
    highWatermarkInicialIso?: string;
  }) {
    this.t0RealMs = params?.tiempoInicialRealMs ?? Date.now();
    this.t0MonotonicMs = params?.tiempoInicialMonotonoMs ?? performance.now();
    this.highWatermarkIso =
      params?.highWatermarkInicialIso ?? new Date(this.t0RealMs).toISOString();
  }

  /**
   * Calibra el reloj local contra el timestamp UTC autoritativo del servidor Cloud o NTP (Escenario 10 ERS).
   */
  public sincronizarHorarioServidor(
    timestampServidorUtcMs: number,
    monotonicNowMs: number = performance.now(),
  ): void {
    this.t0RealMs = timestampServidorUtcMs;
    this.t0MonotonicMs = monotonicNowMs;
    const servidorIso = new Date(timestampServidorUtcMs).toISOString();
    if (servidorIso > this.highWatermarkIso) {
      this.highWatermarkIso = servidorIso;
    }
  }

  /**
   * Actualiza el High Watermark si en la base de datos local existe un registro con fecha superior.
   */
  public registrarHighWatermarkBaseDatos(maxTimestampIso: string): void {
    const parsed = Date.parse(maxTimestampIso);
    if (!Number.isNaN(parsed)) {
      const normalizedIso = new Date(parsed).toISOString();
      if (normalizedIso > this.highWatermarkIso) {
        this.highWatermarkIso = normalizedIso;
      }
    }
  }

  /**
   * Obtiene la marca de tiempo confiable en modo online u offline autónomo (Resolución S-10).
   */
  public obtenerTiempoConfiable(
    monotonicNowMs: number = performance.now(),
  ): ResultadoRelojConfiable {
    const deltaMonotonoMs = Math.max(0, monotonicNowMs - this.t0MonotonicMs);
    const tiempoEstimadoMs = this.t0RealMs + deltaMonotonoMs;
    const highWatermarkMs = new Date(this.highWatermarkIso).getTime();

    if (tiempoEstimadoMs < highWatermarkMs) {
      const fechaForzada = new Date(highWatermarkMs + 1000);
      this.highWatermarkIso = fechaForzada.toISOString();
      return {
        fechaConfiable: fechaForzada,
        isoConfiable: this.highWatermarkIso,
        desfaseRegresivoDetectado: true,
      };
    }

    const fechaConfiable = new Date(tiempoEstimadoMs);
    const isoConfiable = fechaConfiable.toISOString();
    if (isoConfiable > this.highWatermarkIso) {
      this.highWatermarkIso = isoConfiable;
    }

    return {
      fechaConfiable,
      isoConfiable,
      desfaseRegresivoDetectado: false,
    };
  }

  /**
   * Calcula la nueva fecha de expiración de reserva de un carrito aplicando el mecanismo de
   * Ventana Deslizante (*Sliding Window*) sobre el `ttl_carrito_minutos` de la sucursal (Resoluciones C-13 y C-14).
   */
  public calcularNuevaExpiracionCarrito(
    ttlCarritoMinutos = 30,
    monotonicNowMs: number = performance.now(),
  ): string {
    const ttlEfectivo = ttlCarritoMinutos > 0 ? ttlCarritoMinutos : 30;
    const { fechaConfiable } = this.obtenerTiempoConfiable(monotonicNowMs);
    return new Date(
      fechaConfiable.getTime() + ttlEfectivo * 60 * 1000,
    ).toISOString();
  }

  public obtenerHighWatermarkActual(): string {
    return this.highWatermarkIso;
  }
}

/**
 * Servicio Puro de Dominio para el Cálculo de Arqueo Ciego de Caja (RF-17 y Resolución O-23).
 */
export class ArqueoCiegoDomainService {
  /**
   * Ejecuta la fórmula canónica completa de efectivo físico esperado en gaveta (Resolución O-23):
   *
   * $$\text{EfectivoEsperado} = \text{MontoInicial} + \text{VentasEfectivo} + \text{AbonosEfectivo} + \text{IngresosManuales} - \text{DevolucionesEfectivo} - \text{SangriasRetiros} - \text{PagosProveedoresEfectivo}$$
   *
   * Y calcula el descuadre frente al recuento ciego declarado por el cajero:
   * $$\text{DiferenciaCaja} = \text{EfectivoDeclarado} - \text{EfectivoEsperado}$$
   */
  static calcularArqueoTurno(
    params: ParametrosArqueoCaja,
  ): ResultadoArqueoCaja {
    const esperado = Number(
      (
        params.monto_inicial_efectivo +
        params.ventas_efectivo +
        params.abonos_efectivo +
        params.ingresos_manuales_efectivo -
        params.devoluciones_efectivo -
        params.sangrias_retiros_efectivo -
        params.pagos_proveedores_efectivo
      ).toFixed(2),
    );

    const diferencia = Number(
      (params.efectivo_declarado_ciego - esperado).toFixed(2),
    );

    let estadoCuadre: 'EXACTO' | 'SOBRANTE' | 'FALTANTE' = 'EXACTO';
    if (diferencia > 0) {
      estadoCuadre = 'SOBRANTE';
    } else if (diferencia < 0) {
      estadoCuadre = 'FALTANTE';
    }

    return {
      efectivo_esperado_sistema: esperado,
      efectivo_declarado_cajero: params.efectivo_declarado_ciego,
      diferencia_caja: diferencia,
      estado_cuadre: estadoCuadre,
    };
  }
}
