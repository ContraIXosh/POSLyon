import { TipoEventoWS } from '../enums/tipo-evento-ws.enum';

/**
 * Payload estructurado para la comunicación reactiva por WebSockets (LAN Local y Cloud).
 */
export interface IEventoWebSocket<T = any> {
  tipo: TipoEventoWS;
  origen_nodo_id: string; // UUID de la terminal o 'CLOUD_SERVER'
  id_sucursal: string;
  timestamp: string; // ISO 8601 UTC
  payload: T;
}
