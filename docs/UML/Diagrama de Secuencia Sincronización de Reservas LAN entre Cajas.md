# Diagrama de Secuencia: Sincronización de Reservas (Soft Allocation) entre Cajas en LAN

## 1. Propósito Arquitectónico

Este diagrama modela la sincronización en tiempo real de la reserva dinámica de stock (*Soft Allocation*) entre múltiples puntos de venta concurrentes en una misma sucursal, resolviendo el hallazgo **C-15**.

Garantiza:
1. **Sincronización Local sin Dependencia de Internet (Resolución C-15 y RF-21):** En una sucursal con dos o más cajas (`Caja A: MAESTRO_LAN`, `Caja B: SECUNDARIO_LAN`) y terminales móviles (`embalador-mobile`), los eventos de reserva de stock se propagan a través de la red de área local (LAN) mediante WebSockets (Socket.io), y las transacciones confirmadas en cajas secundarias se consolidan contra el SQLite de la Caja Maestra vía HTTP LAN (`/api/lan-sync/push`). No se requiere conexión a la nube ni consultas remotas a PostgreSQL para mantener la coherencia del stock disponible ni la contabilidad del local en el **Plan Básico Monosucursal (`BASICO_LOCAL`)**.
2. **Cálculo de Stock Disponible Distribuido:**
   $$\text{StockDisponible} = \text{StockFisico} - \text{StockReservado}$$
   Cuando la Caja A escanea un producto en un carrito borrador, la Caja B refleja inmediatamente el incremento en `stock_reservado`, evitando prometer mercadería ya retenida en el mostrador contiguo.
3. **Resiliencia ante Caídas de Red Wi-Fi LAN:** Si la red local se interrumpe y las terminales quedan aisladas, ninguna venta se detiene. En virtud de la regla **C-12 (Stock Negativo Universal)**, el cajero puede cobrar de inmediato y cualquier colisión física es absorbida en mostrador y regularizada posteriormente mediante auditoría.

---

## 2. Diagrama de Secuencia (Mermaid.js)

```mermaid
sequenceDiagram
    autonumber

    actor CA as Cajero 1 (Caja A - MAESTRO_LAN)
    participant BDLA as SQLite Maestro (Caja A)
    participant WSLAN as Gateway WebSocket + HTTP Hub LAN (Caja A)
    participant BDLB as SQLite Secundario (Caja B)
    actor CB as Cajero 2 (Caja B - SECUNDARIO_LAN)

    rect rgb(240, 248, 255)
    note over CA, BDLB: FASE 1: Carga de Ítem en Caja A y Difusión Local de Reserva (Soft Allocation)
    CA->>BDLA: Escanea 2 unidades de "Coca-Cola 2.25L" (Stock Físico: 10, Reservado: 0)
    BDLA->>BDLA: Actualiza SQLite Local: stock_reservado = 0 + 2 = 2
    BDLA-->>CA: Carrito actualizado (Stock Disponible local = 10 - 2 = 8)
    
    CA->>WSLAN: Emite evento LAN "RESERVA_STOCK_LOCAL" { id_producto: 'coca-1', delta_reservado: +2 }
    WSLAN-->>BDLB: Broadcast LAN WebSocket a todas las demás terminales
    BDLB->>BDLB: Actualiza SQLite Caja B: stock_reservado = 0 + 2 = 2
    BDLB-->>CB: UI Caja B actualiza catálogo en vivo: Stock Disponible = 10 - 2 = 8
    end

    rect rgb(255, 250, 230)
    note over CB, BDLB: FASE 2: Consulta Concurrente en Caja B
    CB->>BDLB: Cliente en Caja B solicita "Coca-Cola 2.25L"
    BDLB-->>CB: Muestra Stock Físico: 10 | Reservado: 2 | DISPONIBLE: 8
    note over CB: Cajero 2 ve con exactitud que 2 unidades<br/>ya están reservadas en otro mostrador
    end

    rect rgb(240, 255, 240)
    note over CA, BDLB: FASE 3: Cobro y Cierre de Venta en Caja A (Consolidación Física)
    CA->>BDLA: Clic "Cobrar" (Venta CONFIRMADA)
    BDLA->>BDLA: BEGIN TRANSACTION
    BDLA->>BDLA: stock_fisico = 10 - 2 = 8
    BDLA->>BDLA: stock_reservado = 2 - 2 = 0
    BDLA->>BDLA: COMMIT
    BDLA-->>CA: Ticket impreso y venta cerrada
    
    CA->>WSLAN: Emite evento LAN "VENTA_CONFIRMADA_LOCAL" { id_producto: 'coca-1', cantidad_vendida: 2 }
    WSLAN-->>BDLB: Broadcast LAN a Caja B
    BDLB->>BDLB: Actualiza SQLite Caja B: stock_fisico = 10 - 2 = 8, stock_reservado = 2 - 2 = 0
    BDLB-->>CB: UI Caja B refleja estado final: Stock Físico: 8, Reservado: 0, DISPONIBLE: 8
    end

    rect rgb(255, 235, 235)
    note over CA, BDLB: FASE 4: Liberación por Cancelación o Expiración (Garbage Collection)
    opt Si Caja A descarta el carrito o expira por inactividad
        CA->>BDLA: Carrito cancelado / GC Worker purga borrador
        BDLA->>BDLA: Revierte stock_reservado = stock_reservado - 2
        CA->>WSLAN: Emite evento LAN "RESERVA_STOCK_LOCAL" { id_producto: 'coca-1', delta_reservado: -2 }
        WSLAN-->>BDLB: Broadcast LAN a Caja B
        BDLB->>BDLB: Revierte stock_reservado = stock_reservado - 2
        BDLB-->>CB: Stock Disponible en Caja B vuelve al 100% (10 unidades)
    end
    end

    rect rgb(235, 245, 255)
    note over BDLA, CB: FASE 5: Cobro en Caja Secundaria B y Consolidación LAN Delta Sync (RF-21 Plan Básico Multi-Caja)
    CB->>BDLB: Cobra 1 unidad en Caja B (Venta CONFIRMADA en SQLite Secundario)
    BDLB->>WSLAN: POST /api/lan-sync/push { nodo_destino: 'LAN_MASTER', changes: { ventas, venta_detalles, pagos_venta } }
    WSLAN->>BDLA: BEGIN TRANSACTION (SQLite WAL Maestro)
    WSLAN->>BDLA: Inserta VENTA, VENTA_DETALLE, PAGO_VENTA y consolida stock_fisico = 8 - 1 = 7
    WSLAN->>BDLA: COMMIT
    WSLAN-->>BDLB: 200 OK { timestamp } (Actualiza SYNC_CURSOR.last_pushed_at para 'LAN_MASTER')
    end

    rect rgb(245, 245, 255)
    note over CB, BDLB: FASE 6: Resiliencia ante Desconexión de Red LAN Wi-Fi
    opt Si se corta la red Wi-Fi local de la sucursal
        WSLAN--xBDLB: Conexión LAN temporalmente inaccesible
        CB->>BDLB: Escanea y cobra en mostrador usando stock local
        note over CB, BDLB: Regla C-12: Stock Negativo Universal.<br/>Ninguna venta se bloquea. Al volver el Wi-Fi local, LanClusterSyncStrategy sincroniza los deltas con Caja A.
    end
    end
```

---

## 3. Matriz de Eventos y Endpoints LAN en Sucursal

| Canal / Evento LAN | Emisor | Receptores | Payload Clave | Efecto en Receptor |
|---|---|---|---|---|
| `RESERVA_STOCK_LOCAL` (WS) | Caja que muta carrito / GC | Demás Cajas y Móviles | `{ id_producto, delta_reservado }` | Aplica `stock_reservado = stock_reservado + delta_reservado` en SQLite local. |
| `VENTA_CONFIRMADA_LOCAL` (WS) | Caja que consuma cobro | Demás Cajas y Móviles | `{ id_producto, cantidad_vendida }` | Aplica `stock_fisico = stock_fisico - cant` y `stock_reservado = stock_reservado - cant`. |
| `CARRITO_EXPIRADO` (WS) | GC Worker local | Pantallas mostrador y móvil | `{ id_venta }` | Desaloja el pedido expirado de la vista del operador. |
| `POST /api/lan-sync/push` (HTTP) | Caja `SECUNDARIO_LAN` | Caja `MAESTRO_LAN` | `{ sucursal_id, nodo_destino: 'LAN_MASTER', changes }` | Persiste atómicamente en el SQLite Maestro las ventas confirmadas, pagos y saldos de clientes sin usar Nube. |
| `GET /api/lan-sync/pull` (HTTP) | Caja `SECUNDARIO_LAN` | Caja `MAESTRO_LAN` | `?last_pulled_at=:cursor&sucursal_id=:id` | Descarga cambios de catálogo, precios y clientes efectuados en la Caja Maestra. |
