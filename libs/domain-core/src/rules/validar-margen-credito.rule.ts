/**
 * Resultado de la evaluación preventiva de cupo de crédito en mostrador (RF-05, RF-07, RF-08).
 */
export interface ResultadoValidacionCredito {
  aprobado: boolean;
  disponible: number;
  exceso: number;
  nuevo_saldo_proyectado: number;
}

/**
 * Resultado de la reconciliación de saldo deudor mediante Merge Aditivo ante colisión OCC post-sync (RF-07 / C-10).
 */
export interface ResultadoMergeAditivoCredito {
  nuevo_saldo_consolidado: number;
  excede_limite_remoto: boolean;
  exceso: number;
  requiere_auditoria_exceso: boolean;
}

/**
 * Función pura de dominio que valida el margen de crédito disponible antes de otorgar una venta fiada
 * o mixta (RF-05, RF-07, RF-08).
 *
 * Evalúa **únicamente el delta que se imputa a la cuenta corriente** (`montoFiadoSolicitado`),
 * permitiendo pagos mixtos (ej. mitad en efectivo y mitad fiado) sin rechazos falsos positivos.
 */
export function validarMargenCredito(
  saldoActual: number,
  limiteCredito: number,
  montoFiadoSolicitado: number,
): ResultadoValidacionCredito {
  if (montoFiadoSolicitado < 0) {
    throw new Error('El monto fiado solicitado no puede ser negativo.');
  }

  const disponible = Math.max(0, limiteCredito - saldoActual);
  const nuevoSaldo = saldoActual + montoFiadoSolicitado;

  if (nuevoSaldo > limiteCredito) {
    return {
      aprobado: false,
      disponible,
      exceso: Number((nuevoSaldo - limiteCredito).toFixed(2)),
      nuevo_saldo_proyectado: Number(nuevoSaldo.toFixed(2)),
    };
  }

  return {
    aprobado: true,
    disponible,
    exceso: 0,
    nuevo_saldo_proyectado: Number(nuevoSaldo.toFixed(2)),
  };
}

/**
 * Función pura de dominio para resolver colisiones OCC de Cuenta Corriente durante la sincronización
 * de ventas presenciales cerradas en modo offline (Resolución C-10 y RF-07).
 *
 * - Jamás pisa el saldo del servidor con un valor absoluto (lo cual borraría abonos concurrentes en otra sucursal).
 * - Aplica **Merge Aditivo**: `nuevo_saldo = saldo_actual_autoritativo + delta_monto_offline`.
 * - Si el nuevo saldo supera el límite vigente en el servidor, NO rechaza la venta presencial ya entregada,
 *   sino que indica `requiere_auditoria_exceso = true` para emitir la alerta `EXCESO_LIMITE_CREDITO_POST_SYNC`
 *   con `UUID_SYSTEM_BOT`.
 */
export function calcularMergeAditivoOCC(
  saldoActualAutoritativo: number,
  limiteCreditoAutoritativo: number,
  deltaMontoOffline: number,
): ResultadoMergeAditivoCredito {
  const nuevoSaldo = Number(
    (saldoActualAutoritativo + deltaMontoOffline).toFixed(2),
  );
  const excede = nuevoSaldo > limiteCreditoAutoritativo;
  const exceso = excede
    ? Number((nuevoSaldo - limiteCreditoAutoritativo).toFixed(2))
    : 0;

  return {
    nuevo_saldo_consolidado: Math.max(0, nuevoSaldo),
    excede_limite_remoto: excede,
    exceso,
    requiere_auditoria_exceso: excede && deltaMontoOffline > 0,
  };
}
