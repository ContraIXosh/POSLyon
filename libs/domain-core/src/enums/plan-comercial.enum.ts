/**
 * Nivel de suscripción comercial que gobierna la estrategia de sincronización y Feature Flags (RF-21).
 * Mantiene invariancia de esquema relacional (Regla N=1) para permitir upgrade sin migración de tablas.
 */
export enum PlanComercial {
  BASICO_LOCAL = 'BASICO_LOCAL',     // 1 Sucursal ($N=1$), 100% SQLite local, LocalOnlySyncStrategy (Costo Cloud $0).
  SUPERIOR_CLOUD = 'SUPERIOR_CLOUD', // N Sucursales, CloudDeltaSyncStrategy contra PostgreSQL Central.
}

/**
 * Rol topológico de la terminal dentro del clúster de red de área local (LAN) de la sucursal.
 */
export enum ModoNodoLan {
  MAESTRO_LAN = 'MAESTRO_LAN',       // Caja principal que aloja el SQLite autoritativo local y el Hub WebSocket LAN.
  SECUNDARIO_LAN = 'SECUNDARIO_LAN', // Caja adicional que sincroniza por LAN contra el MAESTRO_LAN.
  MOBILE_PICKER = 'MOBILE_PICKER',   // Dispositivo móvil de preparación guiada de pedidos (Embalador).
}
