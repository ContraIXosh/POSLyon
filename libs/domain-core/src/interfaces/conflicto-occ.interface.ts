/**
 * Detalle de una colisión de Control de Concurrencia Optimista (OCC) HTTP 409 Conflict.
 */
export interface IConflictoOCC {
  entidad: string;
  id_registro: string;
  version_esperada: number;
  version_actual_en_servidor: number;
  campo_en_conflicto?: string;
  valor_servidor?: any;
  mensaje: string;
}
