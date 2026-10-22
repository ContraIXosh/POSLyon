# Diagrama de Secuencia: Sincronización Push en Tiempo Real y Catch-Up por Cursor

> **Alcance por Plan Comercial (ERS RF-21):**
> - **Plan Superior (`SUPERIOR_CLOUD`):** El cursor en `SYNC_CURSOR` utiliza `nodo_destino = 'CLOUD_CENTRAL'` contra PostgreSQL (`backend-cloud`). Al realizar un Upgrade desde el Plan Básico mediante `licencia_token`, `last_pulled_at` nace en `null` (`0`), disparando un **Bootstrap Catch-Up inicial** que sube todo el catálogo e historial local a la nube sin migración de esquema.
> - **Plan Básico Multi-Caja (`BASICO_LOCAL`):** Las cajas `SECUNDARIO_LAN` aplican este mismo mecanismo de cursores (`nodo_destino = 'LAN_MASTER'`) contra el `LanSyncHub` de la Caja `MAESTRO_LAN` dentro de la red local.

```mermaid
sequenceDiagram

autonumber

actor A as Administrador
participant S as Servidor Autoritativo (PostgreSQL Cloud / SQLite MAESTRO_LAN)
participant W as Sync Engine (WatermelonDB / Socket)
participant B as App Terminal (SQLite Local)

Note over S,B: ESCENARIO 1: Conexión Estable (Push en Tiempo Real)

B->>W: Abre conexión persistente (WebSocket)
A->>S: Actualiza precio "Queso" a $8.000
S->>S: UPDATE producto_sucursal SET precio_minorista=8000, updated_at=10:05
S->>W: Notifica cambio a través de evento reactivo
W-->>B: PUSH (Precio Queso: $8.000)
B->>B: Actualiza SQLite y UI (Costo de red casi nulo, tiempo < 100ms)

Note over S,B: ESCENARIO 2: Pérdida de Conexión y Cambios Múltiples

Note over B: Corte de Red (Offline)
A->>S: Actualiza precio "Fiambre" a $5.000 (updated_at=11:00)
A->>S: Elimina "Cerveza" (soft delete activo=false, updated_at=11:15)
S->>W: Notifica cambios
W-x+B: Intenta PUSH pero falla (Terminal inaccesible)
Note over W: El servidor NO encola mensajes por sucursal.<br/>Simplemente actualiza su base de datos y avanza.

Note over S,B: ESCENARIO 3: Reconexión y Sincronización por Cursor (SYNC_CURSOR)

Note over B: Vuelve la Conexión (13:00)
B->>S: GET /sync/pull?last_pulled_at=2026-10-18T10:05:00.000Z (Cursor ISO-8601 UTC por nodo_destino)
Note over B,S: La terminal solicita únicamente los deltas<br/>posteriores a su última sincronización exitosa.
S-->>B: Retorna Array [Fiambre ($5.000), Cerveza (activo: false)]
B->>B: Ejecuta transacciones en SQLite local y actualiza SYNC_CURSOR.last_pulled_at
B->>W: Reestablece conexión persistente (WebSocket)

Note over B,S: Sincronización de subida (Background Push)
B->>S: POST /sync/push { ventas_confirmadas_offline: [...] }
S->>S: Procesa tickets CONFIRMADOS generados durante el corte y actualiza SYNC_CURSOR.last_pushed_at
```
