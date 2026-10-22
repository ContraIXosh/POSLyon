# Diagrama de Secuencia: Transición Atómica a CONFIRMADA con Fijación de Turno

## 1. Propósito Arquitectónico

Este diagrama documenta la transición crítica de una venta desde el estado `BORRADOR` (carrito activo en memoria / persistido localmente) al estado `CONFIRMADA` en la terminal POS. 

Garantiza:
1. **Fijación Inmutable de Turno (`id_turno_caja`):** Se asocia la venta al turno de caja abierto del operador que procesa el cobro, satisfaciendo el Arqueo Ciego de Caja (**RF-17**) y la Auditoría de Mermas/Sobrantes (**RF-13**).
2. **Atomicidad Local (ACID):** En un único bloque transaccional (`BEGIN TRANSACTION ... COMMIT`) en SQLite local (WatermelonDB), se fija el estado de la venta, se decrementa tanto el `stock_fisico` como el `stock_reservado` en góndola (*Soft Allocation Release*), y se registran los renglones de `PAGO_VENTA`.
3. **Sincronización Asíncrona (Local-First):** Una vez commiteada la transacción local, el worker en segundo plano detecta el cambio (`estado_general = 'CONFIRMADA'`) y envía el delta a la nube (NestJS / PostgreSQL).

---

## 2. Diagrama de Secuencia (Mermaid.js)

```mermaid
sequenceDiagram
    autonumber
    actor C as Cajero / Operador
    participant UI as Terminal POS (Desktop UI)
    participant BDL as SQLite Local (WatermelonDB)
    participant SYNC as Worker Push Delta (Background)
    participant API as Backend Cloud (NestJS / PostgreSQL)

    Note over C,UI: Carrito activo con estado_general = 'BORRADOR'
    C->>UI: Clic en "Procesar Cobro" / "Finalizar Venta"
    
    UI->>BDL: SELECT id FROM turno_caja WHERE id_usuario = :id_usuario AND estado = 'ABIERTO' LIMIT 1
    BDL-->>UI: Retorna id_turno_caja_activo (UUID)
    
    alt No existe turno de caja abierto para el operador
        UI-->>C: ERROR: Bloqueo de cobro. Debe abrir un turno de caja antes de cobrar.
    else Turno activo validado
        Note over UI,BDL: INICIO TRANSACCIÓN ATÓMICA LOCAL (ACID)
        UI->>BDL: BEGIN TRANSACTION;

        Note over BDL: 1. Fijar venta y asociar turno activo de forma inmutable
        UI->>BDL: UPDATE venta SET<br/>  estado_general = 'CONFIRMADA',<br/>  id_turno_caja = :id_turno_caja_activo,<br/>  version = version + 1,<br/>  updated_at = CURRENT_TIMESTAMP<br/>WHERE id = :id_venta AND estado_general = 'BORRADOR';

        Note over BDL: 2. Liberar reserva y descontar inventario físico
        loop Por cada ítem en VENTA_DETALLE
            UI->>BDL: UPDATE producto_sucursal SET<br/>  stock_reservado = stock_reservado - :cantidad,<br/>  stock_fisico = stock_fisico - :cantidad,<br/>  version = version + 1<br/>WHERE id_producto = :id_producto AND id_sucursal = :id_sucursal;
        end

        Note over BDL: 3. Registrar desglose de métodos de pago
        loop Por cada método de pago utilizado
            UI->>BDL: INSERT INTO pago_venta (id, id_venta, id_metodo_pago, monto)<br/>VALUES (:uuid_pago, :id_venta, :id_metodo_pago, :monto_pagado);
        end

        UI->>BDL: COMMIT;
        Note over UI,BDL: FIN TRANSACCIÓN ATÓMICA LOCAL

        UI-->>C: Emisión de Ticket de Venta y confirmación visual
        
        Note over UI,SYNC: Sincronización Asíncrona hacia la Nube
        SYNC->>BDL: Escaneo por cursor (registros con updated_at > cursor AND estado_general != 'BORRADOR')
        BDL-->>SYNC: Retorna registro VENTA confirmada + PAGO_VENTA
        SYNC->>API: POST /sync/push-deltas (Payload comprimido con id_turno_caja)
        API-->>SYNC: HTTP 200 OK (Nuevo cursor confirmado)
    end
```

---

## 3. Puntos Clave de Control Arquitectónico

- **Resiliencia ante Cortes de Energía:** SQLite configurado con `journal_mode = WAL` y `synchronous = FULL`. Si la energía se corta antes del `COMMIT`, la venta permanece en `BORRADOR` con su reserva activa. Si se corta después, la venta queda confirmada con su `id_turno_caja` intacto.
- **Desacoplamiento de Turnos en Operaciones Posteriores:** Las eventuales notas de crédito posteriores vincularán el `id_venta` original para conocer precios históricos, pero impactarán en el `TURNO_CAJA` activo del día de la devolución, sin mutar el `id_turno_caja` fijado en esta venta.
