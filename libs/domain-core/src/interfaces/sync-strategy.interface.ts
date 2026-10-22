/**
 * Puerto de arquitectura hexagonal (Ports & Adapters) para el motor de sincronización.
 * Permite desacoplar el Plan Básico (LocalOnlySyncStrategy - No-Op) del Plan Superior (CloudDeltaSyncStrategy).
 */
export interface ISyncEngineStrategy {
  inicializar(): Promise<void>;
  notificarMutacionLocal(tabla: string, registroId: string): Promise<void>;
  ejecutarUpgradeInicialACloud?(): Promise<void>;
}
