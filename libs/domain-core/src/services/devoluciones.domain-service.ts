import { EstadoFinanciero } from '../enums/estado-financiero.enum';
import { MotivoDevolucion } from '../enums/motivo-devolucion.enum';
import { TipoDevolucion } from '../enums/tipo-devolucion.enum';

/**
 * Detalle financiero calculado para un renglón devuelto en una Nota de Crédito (RF-09 / C-04).
 */
export interface ResultadoReembolsoItem {
  cantidad_devuelta: number;
  precio_unitario_momento: number;
  descuento_unitario_prorrateado: number;
  monto_descuento_devuelto: number;
  subtotal_reembolso_neto: number;
}

/**
 * Plan de impacto financiero de una devolución sobre Cuenta Corriente y Gaveta de Caja (RF-10).
 */
export interface ResultadoCompensacionDevolucion {
  tipo_devolucion_efectivo: TipoDevolucion;
  monto_total_nota_credito: number;
  monto_compensado_deuda: number;
  monto_egreso_efectivo_caja: number;
  nuevo_saldo_deudor_cliente: number;
}

/**
 * Servicio Puro de Dominio para Devoluciones, Notas de Crédito y Compensación Mixta (RF-09, RF-10, RF-11).
 * Centraliza las fórmulas matemáticas y guardas de integridad contable para SQLite local y PostgreSQL Cloud.
 */
export class DevolucionesDomainService {
  /**
   * Calcula el reembolso neto exacto de un artículo devuelto, deduciendo proporcionalmente
   * cualquier descuento promocional aplicado en la venta original (RF-09 / Resolución C-04 / Escenario 11)
   * y verificando el control anti-doble devolución (Resolución O-19).
   *
   * Fórmula:
   * $$\text{descuento\_unitario} = \frac{\text{monto\_descuento\_original}}{\text{cantidad\_original}}$$
   * $$\text{subtotal\_reembolso} = (\text{cantidad\_a\_devolver} \times \text{precio\_unitario\_momento}) - (\text{cantidad\_a\_devolver} \times \text{descuento\_unitario})$$
   */
  static calcularReembolsoNetoItem(params: {
    cantidad_original: number;
    precio_unitario_momento: number;
    monto_descuento_total_original: number;
    cantidad_a_devolver: number;
    cantidad_previa_devuelta?: number;
  }): ResultadoReembolsoItem {
    const {
      cantidad_original,
      precio_unitario_momento,
      monto_descuento_total_original,
      cantidad_a_devolver,
      cantidad_previa_devuelta = 0,
    } = params;

    if (cantidad_a_devolver <= 0) {
      throw new Error('La cantidad a devolver debe ser mayor a 0.');
    }

    const cantidadDisponibleParaDevolver =
      cantidad_original - cantidad_previa_devuelta;
    if (cantidad_a_devolver > cantidadDisponibleParaDevolver) {
      throw new Error(
        `La cantidad devuelta (${cantidad_a_devolver}) supera la cantidad neta disponible para devolución (${cantidadDisponibleParaDevolver}).`,
      );
    }

    const descuentoUnitario =
      cantidad_original > 0 && monto_descuento_total_original > 0
        ? monto_descuento_total_original / cantidad_original
        : 0;

    const descuentoDevuelto = Number(
      (cantidad_a_devolver * descuentoUnitario).toFixed(2),
    );
    const subtotalBruto = cantidad_a_devolver * precio_unitario_momento;
    const subtotalReembolsoNeto = Number(
      (subtotalBruto - descuentoDevuelto).toFixed(2),
    );

    return {
      cantidad_devuelta: cantidad_a_devolver,
      precio_unitario_momento,
      descuento_unitario_prorrateado: Number(descuentoUnitario.toFixed(2)),
      monto_descuento_devuelto: descuentoDevuelto,
      subtotal_reembolso_neto: subtotalReembolsoNeto,
    };
  }

  /**
   * Evalúa las guardas financieras y calcula la distribución exacta entre amortización de deuda
   * en Cuenta Corriente y egreso de billetes físicos en el Turno de Caja activo (RF-10, C-01, C-02, C-03, O-15).
   */
  static calcularCompensacionFinanciera(params: {
    tipo_devolucion_solicitado: TipoDevolucion;
    monto_total_devolucion: number;
    estado_financiero_venta: EstadoFinanciero;
    id_cliente?: string | null;
    saldo_deudor_cliente?: number;
    confirmar_sin_dinero?: boolean;
  }): ResultadoCompensacionDevolucion {
    const {
      tipo_devolucion_solicitado,
      monto_total_devolucion,
      estado_financiero_venta,
      id_cliente = null,
      saldo_deudor_cliente = 0,
      confirmar_sin_dinero = false,
    } = params;

    // 1. Regla O-15: Venta en estado financiero PENDIENTE (el dinero nunca ingresó a la caja)
    if (estado_financiero_venta === EstadoFinanciero.PENDIENTE) {
      if (!confirmar_sin_dinero) {
        throw new Error(
          'ADVERTENCIA_VENTA_PENDIENTE: Esta venta está en estado PENDIENTE (no se registró ingreso de dinero a caja). Se requiere confirmación explícita para procesar devolución sin reintegro de dinero.',
        );
      }
      return {
        tipo_devolucion_efectivo: TipoDevolucion.SIN_REINTEGRO_MONETARIO,
        monto_total_nota_credito: monto_total_devolucion,
        monto_compensado_deuda: 0,
        monto_egreso_efectivo_caja: 0,
        nuevo_saldo_deudor_cliente: saldo_deudor_cliente,
      };
    }

    // 2. Guarda de ventas anónimas (sin cliente registrado)
    if (
      !id_cliente &&
      tipo_devolucion_solicitado === TipoDevolucion.REDUCCION_DEUDA
    ) {
      throw new Error(
        'Ventas anónimas sólo admiten devolución en EFECTIVO_CAJA.',
      );
    }

    // 3. Guarda contra Saldo Deudor Negativo (Resoluciones C-01 y C-02):
    // Si el cliente solicita REDUCCION_DEUDA pura pero su deuda actual es menor al monto a devolver,
    // se prohíbe dejar saldo a favor negativo; se exige EFECTIVO_CAJA (que aplicará compensación mixta RF-10).
    if (tipo_devolucion_solicitado === TipoDevolucion.REDUCCION_DEUDA) {
      if (saldo_deudor_cliente < monto_total_devolucion) {
        throw new Error(
          `Saldo deudor insuficiente ($${saldo_deudor_cliente} < $${monto_total_devolucion}). Reembolso forzado en EFECTIVO_CAJA.`,
        );
      }

      return {
        tipo_devolucion_efectivo: TipoDevolucion.REDUCCION_DEUDA,
        monto_total_nota_credito: monto_total_devolucion,
        monto_compensado_deuda: monto_total_devolucion,
        monto_egreso_efectivo_caja: 0,
        nuevo_saldo_deudor_cliente: Number(
          (saldo_deudor_cliente - monto_total_devolucion).toFixed(2),
        ),
      };
    }

    // 4. Compensación Mixta de Deuda Residual en Devolución en Efectivo (RF-10 y Resolución C-03):
    // Si la devolución es EFECTIVO_CAJA y el cliente posee deuda activa (saldo_deudor > 0),
    // primero se absorbe la deuda residual hasta $0 y solo se entrega en billetes el saldo remanente.
    if (tipo_devolucion_solicitado === TipoDevolucion.EFECTIVO_CAJA) {
      if (
        estado_financiero_venta === EstadoFinanciero.FIADO &&
        saldo_deudor_cliente >= monto_total_devolucion
      ) {
        throw new Error(
          'Ventas fiadas con deuda vigente mayor o igual a la devolución deben amortizar la deuda en Cuenta Corriente (REDUCCION_DEUDA).',
        );
      }

      const montoCompensadoDeuda =
        id_cliente && saldo_deudor_cliente > 0
          ? Number(
              Math.min(saldo_deudor_cliente, monto_total_devolucion).toFixed(2),
            )
          : 0;

      const montoEgresoEfectivo = Number(
        (monto_total_devolucion - montoCompensadoDeuda).toFixed(2),
      );
      const nuevoSaldo = Number(
        (saldo_deudor_cliente - montoCompensadoDeuda).toFixed(2),
      );

      return {
        tipo_devolucion_efectivo: TipoDevolucion.EFECTIVO_CAJA,
        monto_total_nota_credito: monto_total_devolucion,
        monto_compensado_deuda: montoCompensadoDeuda,
        monto_egreso_efectivo_caja: montoEgresoEfectivo,
        nuevo_saldo_deudor_cliente: nuevoSaldo,
      };
    }

    return {
      tipo_devolucion_efectivo: TipoDevolucion.SIN_REINTEGRO_MONETARIO,
      monto_total_nota_credito: monto_total_devolucion,
      monto_compensado_deuda: 0,
      monto_egreso_efectivo_caja: 0,
      nuevo_saldo_deudor_cliente: saldo_deudor_cliente,
    };
  }

  /**
   * Determina si un artículo devuelto es apto para reingresar automáticamente al `stock_fisico`
   * vendible de la góndola o si debe apartarse como merma auditada (Resolución S-08).
   */
  static esReintegrableAInventarioVendible(
    motivo: MotivoDevolucion | string,
  ): boolean {
    return (
      motivo === MotivoDevolucion.ERROR_COMPRA ||
      motivo === MotivoDevolucion.CAMBIO_TALLE_COLOR
    );
  }

  /**
   * Genera la numeración correlativa legal e inmutable para una Nota de Crédito por sucursal (Resolución S-09).
   * Ejemplo: `NC-SUC01-00000042`
   */
  static generarNumeroComprobanteNC(
    codigoSucursal: string,
    correlativoSiguiente: number,
  ): string {
    const prefijoSucursal = (codigoSucursal || 'SUC01').trim().toUpperCase();
    const secuencia = String(Math.max(1, correlativoSiguiente)).padStart(
      8,
      '0',
    );
    return `NC-${prefijoSucursal}-${secuencia}`;
  }
}
