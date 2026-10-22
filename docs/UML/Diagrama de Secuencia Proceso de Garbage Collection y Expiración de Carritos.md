# Diagrama de Secuencia: Proceso de Garbage Collection y Expiración de Carritos

## 1. Propósito Arquitectónico

Este diagrama formaliza el mecanismo de limpieza automática de carritos abandonados (*Garbage Collection*) en la arquitectura Local-First de POSLyon, resolviendo de forma conjunta los hallazgos **C-13** y **C-14**.

Garantiza:
1. **Configuración Dinámica del TTL (Resolución C-13):** El tiempo de vida de la reserva se calcula dinámicamente mediante `CONFIGURACION_SUCURSAL.reglas_negocio.ttl_carrito_minutos` (ej. 30 minutos) descargado en la sucursal, eliminando cualquier referencia errónea a la hora de actualización diferida de precios.
2. **Alcance Universal sobre Estados en Borrador (Resolución C-14):** La expiración aplica universalmente a toda venta en `estado_general = 'BORRADOR'`, sin importar si su `estado_logistico` es `A_PREPARAR`, `PREPARANDO`, `CONTROLANDO`, `INCOMPLETO` o `LISTO_PARA_COBRAR`.
3. **Mecanismo de Ventana Deslizante (*Sliding Window*):** Cada interacción activa (escaneo, modificación de cantidad o avance en preparación guiada) refresca la `fecha_expiracion_reserva`. Solo los carritos efectivamente inactivos alcanzan el umbral de purga.
4. **Protección de Reloj (Clock Skew / NTP):** La evaluación temporal neutraliza manipulaciones o desfases del reloj del sistema operativo local utilizando el delta sincronizado con el servidor NTP / backend central (ERS RF-02 Escenario 10).
5. **Atomicidad y Reversión Incondicional:** La transición a `CANCELADA` revierte en una única transacción SQL en SQLite el `stock_reservado` en `PRODUCTO_SUCURSAL`, liberando de inmediato la mercadería para otros carritos.

---

## 2. Diagrama de Secuencia (Mermaid.js)

```mermaid
sequenceDiagram
    autonumber

    actor C as Cajero / Embalador
    participant UI as Terminal (Mostrador / Móvil)
    participant GC as Worker GC Local (Background)
    participant NTP as Servicio de Tiempo (NTP / Offset)
    participant BDL as BD Local (SQLite / WatermelonDB)
    participant WS as Servidor WebSocket LAN

    rect rgb(240, 248, 255)
    note over C, BDL: Flujo 1: Mutación Activa y Ventana Deslizante (Sliding Window)
    C->>UI: Escanea producto / Modifica ítem en carrito activo
    UI->>BDL: Lee ttl_carrito_minutos desde CONFIGURACION_SUCURSAL (ej. 30 min)
    UI->>NTP: Obtiene hora confiable actual (now + offset_servidor)
    UI->>UI: Calcula fecha_expiracion_reserva = now_confiable + (ttl_minutos * 60 * 1000)
    UI->>BDL: BEGIN TRANSACTION
    UI->>BDL: INSERT/UPDATE VENTA_DETALLE
    UI->>BDL: UPDATE PRODUCTO_SUCURSAL SET stock_reservado = stock_reservado + cant
    UI->>BDL: UPDATE VENTA SET fecha_expiracion_reserva = :nueva_fecha, updated_at = :now WHERE id = :id_venta
    UI->>BDL: COMMIT
    BDL-->>UI: Carrito actualizado con reserva extendida
    end

    rect rgb(255, 245, 238)
    note over GC, WS: Flujo 2: Bucle Periódico de Garbage Collection (Cada N minutos)
    loop Intervalo Periódico de Limpieza (ej. cada 60 segundos)
        GC->>NTP: Consulta hora confiable actual (evita manipulación de reloj OS)
        NTP-->>GC: Timestamp confiable T_actual
        GC->>BDL: SELECT id, id_sucursal FROM VENTA WHERE estado_general = 'BORRADOR' AND fecha_expiracion_reserva < :T_actual
        
        alt Existen Carritos Expirados por Inactividad
            loop Para cada carrito expirado
                GC->>BDL: BEGIN TRANSACTION
                GC->>BDL: SELECT id_producto, cantidad FROM VENTA_DETALLE WHERE id_venta = :id_venta
                GC->>BDL: UPDATE VENTA SET estado_general = 'CANCELADA', updated_at = :T_actual WHERE id = :id_venta AND estado_general = 'BORRADOR'
                loop Para cada detalle del carrito
                    GC->>BDL: UPDATE PRODUCTO_SUCURSAL SET stock_reservado = stock_reservado - :cantidad WHERE id_producto = :id_producto AND id_sucursal = :id_sucursal
                end
                GC->>BDL: COMMIT
                GC->>WS: Emite evento LAN "CARRITO_EXPIRADO" { id_venta }
                WS-->>UI: Push: Desaloja pedido expirado y notifica en pantalla
            end
        else Sin Carritos Expirados
            GC->>GC: Espera al siguiente ciclo sin realizar escrituras
        end
    end
    end

    rect rgb(255, 235, 235)
    note over C, UI: Flujo 3: Intento de Operación sobre Carrito Expirado
    C->>UI: Cajero o cliente intenta cobrar un carrito que ya expiró en background
    UI->>BDL: Consulta VENTA WHERE id = :id_venta
    BDL-->>UI: Registro con estado_general = 'CANCELADA'
    UI->>UI: Guarda de seguridad detecta estado CANCELADA
    UI-->>C: Notificación en pantalla: "El carrito ha expirado por inactividad y su reserva fue liberada. Por favor, inicie una nueva venta."
    end
```

---

## 3. Matriz de Estados de Venta y Aplicación del Garbage Collection

| Estado General | Estado Logístico | ¿Aplica Garbage Collection? | Comportamiento al Expirar |
|---|---|---|---|
| `BORRADOR` | `A_PREPARAR` | **SÍ** | Cancela venta y libera `stock_reservado` si el cajero deja el carrito abandonado en mostrador. |
| `BORRADOR` | `PREPARANDO` | **SÍ** | Cancela venta y libera `stock_reservado` si el preparador abandona el recorrido móvil. |
| `BORRADOR` | `CONTROLANDO` | **SÍ** | Cancela venta y libera `stock_reservado` si se abandona la verificación física. |
| `BORRADOR` | `INCOMPLETO` | **SÍ** | Cancela venta y libera `stock_reservado` si no se regulariza en mostrador antes del TTL. |
| `BORRADOR` | `LISTO_PARA_COBRAR` | **SÍ** | Cancela venta y libera `stock_reservado` si el cliente no se presenta en caja a pagar. |
| `CONFIRMADA` | Cualquiera (`ENTREGADO`) | **NO** | Inmutable. La venta fue cobrada, el `stock_fisico` fue descontado y no expira jamás. |
| `CANCELADA` | Cualquiera | **NO** | Ya fue cancelada y su stock reservado ya fue liberado. |
