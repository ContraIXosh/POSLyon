# Diagrama de Secuencia: Preparación Guiada Local-First, WebSockets y Sincronización

## 1. Propósito Arquitectónico

Este diagrama modela la interacción en tiempo real entre la **Terminal de Mostrador (Caja)** y la **Terminal Móvil (Embalador / Preparador)** dentro de la red de área local (LAN) de la sucursal mediante WebSockets, junto con el mecanismo de persistencia local en SQLite (WatermelonDB) y sincronización asíncrona hacia la Nube (PostgreSQL).

Garantiza:
1. **Flujo Guiado de Preparación (Focus / Highlight):** Orientación visual producto por producto en el móvil del preparador.
2. **Detección de Faltantes y Bloqueo Estricto de Cobro (Resolución C-11):** Transición inmediata a `INCOMPLETO` ante faltantes de mercadería y deshabilitación inquebrantable del cobro hasta su regularización en mostrador.
3. **Resiliencia Local-First y Operación sin Internet:** Todas las operaciones críticas de mostrador y preparación operan sin depender de la nube.

---

## 2. Diagrama de Secuencia (Mermaid.js)

```mermaid
sequenceDiagram
    autonumber

    actor C as Cajero (PC Mostrador)
    actor E as Preparador (Móvil)
    participant BDL as BD Local (SQLite / WatermelonDB)
    participant WS as Servidor Local (WebSocket LAN)
    participant N as Nube (PostgreSQL / NestJS)

    rect rgb(240, 248, 255)
    note over C, WS: Fase 1: Carga en Mostrador y Asignación de Preparación
    C->>BDL: Crea Carrito (estado_general = 'BORRADOR', estado_logistico = 'A_PREPARAR')
    C->>BDL: Escanea productos (+Stock Reservado / Soft Allocation)
    C->>WS: Clic "Preparar" -> Emite "PEDIDO_INICIAR_PREPARACION" { id_venta }
    WS-->>E: Push WebSocket: Abre pedido en celular (estado_logistico = 'PREPARANDO')
    end

    rect rgb(255, 250, 230)
    note over E, WS: Fase 2: Recorrido Guiado con Modo Focus / Highlight
    E->>E: UI activa Ítem 1 (Highlight) y opaca el resto de la pantalla
    E->>E: Operador halla producto físico en góndola y presiona "OK"
    E->>WS: Emite "ITEM_PREPARADO_OK" { id_venta, id_producto }
    WS-->>C: Notifica progreso (Ítem 1 marcado en verde en mostrador)
    E->>E: UI desplaza Highlight automáticamente al Ítem 2
    end

    rect rgb(255, 235, 235)
    note over C, E: Fase 3: Detección de Faltante y Bloqueo Estricto de Cobro (C-11)
    E->>E: Ítem 2: Stock insuficiente en salón -> Clic "Incompleto"
    E->>WS: Emite "PEDIDO_INCOMPLETO" { id_venta, id_producto, cant_hallada: 2, cant_solicitada: 5 }
    WS->>BDL: UPDATE VENTA SET estado_logistico = 'INCOMPLETO'
    WS-->>C: Push WebSocket: Alerta de discrepancia en mostrador
    
    note over C, E: GUARDA DE SEGURIDAD CRÍTICA (C-11):<br/>Botón "Cobrar" y "Finalizar" DESHABILITADOS en todas las terminales
    
    C->>C: Cajero consulta con cliente en mostrador
    C->>BDL: Regulariza Carrito: Actualiza renglón a 2 unidades
    BDL->>BDL: Recalcula total venta y retorna estado_logistico = 'A_PREPARAR'
    C->>WS: Emite "CARRITO_REGULARIZADO" { id_venta, nuevo_total }
    WS-->>E: Actualiza vista móvil -> Desbloqueo de cobro liberado
    end

    rect rgb(240, 255, 240)
    note over C, BDL: Fase 4: Cobro Atómico y Cierre en Mostrador
    C->>BDL: Clic "Cobrar" (Venta presencial prioritaria)
    BDL->>BDL: BEGIN TRANSACTION
    BDL->>BDL: UPDATE VENTA SET estado_general = 'CONFIRMADA', estado_logistico = 'ENTREGADO', id_turno_caja = turno_activo.id
    BDL->>BDL: INSERT INTO PAGO_VENTA (id_venta, id_metodo_pago, monto)
    BDL->>BDL: UPDATE PRODUCTO_SUCURSAL SET stock_fisico = stock_fisico - cant, stock_reservado = stock_reservado - cant
    BDL->>BDL: COMMIT
    BDL-->>C: Venta confirmada localmente -> Imprime Ticket fiscal/comprobante
    C->>WS: Emite "VENTA_FINALIZADA" { id_venta }
    WS-->>E: Remueve pedido finalizado del panel móvil
    end

    rect rgb(245, 245, 255)
    note over BDL, N: Fase 5: Sincronización Asíncrona a la Nube (Worker Background)
    loop Cada intervalo configurado o evento de cambio
        BDL->>BDL: Consulta ventas con estado_general = 'CONFIRMADA' y updated_at > last_cursor
        BDL->>N: POST /api/sync/push { deltas: [ventas_confirmadas] }
        alt Conexión Nube Exitosa
            N->>N: BEGIN TRANSACTION
            N->>N: Valida e inserta Venta y Pagos con UUIDs de origen
            N->>N: Aplica deltas a stock central
            N->>N: COMMIT
            N-->>BDL: 200 OK { nuevo_cursor }
            BDL->>BDL: Actualiza cursor local de sincronización
        else Sin Conexión a Internet / Servidor Inaccesible
            N--xBDL: Timeout / Error de red
            BDL->>BDL: Retiene deltas en cola local. Reintenta en el próximo ciclo sin detener el mostrador.
        end
    end
    end
```

---

## 3. Matriz de Eventos WebSocket LAN

| Evento WebSocket | Emisor | Receptores | Payload Clave | Comportamiento en Receptor |
|---|---|---|---|---|
| `PEDIDO_INICIAR_PREPARACION` | Mostrador (PC) | Embaladores (Móviles) | `{ id_venta, items }` | Abre la pantalla de preparación guiada con focus en ítem 0. |
| `ITEM_PREPARADO_OK` | Embalador (Móvil) | Mostrador (PC) | `{ id_venta, id_producto }` | Pinta el ítem en verde y actualiza barra de progreso en mostrador. |
| `PEDIDO_INCOMPLETO` | Embalador (Móvil) | Mostrador (PC) | `{ id_venta, id_producto, cant_hallada }` | Activa alerta roja y **bloquea el botón de cobro** en ambas pantallas. |
| `CARRITO_REGULARIZADO` | Mostrador (PC) | Embaladores (Móviles) | `{ id_venta, items_actualizados, total }` | Vuelve el pedido a estado regular y **desbloquea el cobro**. |
| `VENTA_FINALIZADA` | Mostrador (PC) | Embaladores (Móviles) | `{ id_venta }` | Cierra la vista del pedido en móvil y retorna a la lista de espera. |
