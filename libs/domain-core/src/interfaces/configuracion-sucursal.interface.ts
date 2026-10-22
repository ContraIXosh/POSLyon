import { PlanComercial, ModoNodoLan } from '../enums/plan-comercial.enum';

export interface IFeatureToggles {
  sincronizacion_cloud: boolean; // false en BASICO_LOCAL, true en SUPERIOR_CLOUD
  sincronizacion_lan_multicaja: boolean; // true para sincronización LAN entre cajas
  catalogo_multisucursal: boolean; // UI matricial de precios por sucursal
  transferencias_inter_sucursal: boolean; // Módulo 2PC de stock entre tiendas (RF-16)
  clientes_inter_sucursal: boolean; // Replicación de padrón y cuentas corrientes (RF-07)
  reconciliacion_local: boolean; // Ejecución de reconciliación en SQLite local
  habilitar_modo_oscuro?: boolean;
  permitir_venta_sin_turno?: boolean;
  requerir_control_ciego_arqueo?: boolean;
  habilitar_alertas_sonoras_preparacion?: boolean;
  habilitar_venta_offline_avanzada?: boolean;
  [clave: string]: boolean | number | string | undefined;
}

export interface IReglasNegocioSucursal {
  comportamiento_precios: 'inmediato' | 'cierre_turno' | 'diferido';
  hora_actualizacion_diferida?: string; // ej. "03:00"
  descuento_stock: 'reserva_logica' | 'inmediato';
  ttl_carrito_minutos: number; // TTL para Garbage Collection de reservas lógicas
  politica_stock: 'UNIVERSAL_PERMISIVO'; // Resolución C-12: stock_fisico < 0 permitido
  feature_toggles: IFeatureToggles;
}

/**
 * Contrato de configuración por sucursal con payload JSONB extensible (ERD: CONFIGURACION_SUCURSAL).
 * Gobierna el comportamiento local y remoto preservando invariancia N=1 (RF-21).
 */
export interface IConfiguracionSucursal {
  id: string; // UUIDv4 PK
  id_sucursal: string; // UUIDv4 FK UNIQUE
  plan_activo: PlanComercial; // 'BASICO_LOCAL' | 'SUPERIOR_CLOUD'
  modo_nodo_lan: ModoNodoLan; // 'MAESTRO_LAN' | 'SECUNDARIO_LAN' | 'MOBILE_PICKER'
  licencia_token?: string | null; // JWT firmado criptográficamente (Ed25519)
  lan_master_url?: string | null; // URL del nodo maestro local para cajas secundarias
  cloud_endpoint_url?: string | null; // URL del backend en la nube en Plan Superior
  reglas_negocio: IReglasNegocioSucursal;
  ultima_modificacion: string; // ISO 8601 UTC
  version: number; // Control OCC
}
