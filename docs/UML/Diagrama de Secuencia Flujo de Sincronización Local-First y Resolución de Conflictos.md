# Diagrama de Secuencia: Flujo de Sincronización Local-First y Push Delta (Cluster LAN / Nube)

## 1. Propósito Arquitectónico

Este diagrama formaliza el flujo de sincronización asíncrona por deltas (*Push Delta*) desde la base de datos local SQLite (WatermelonDB) hacia el nodo autoritativo correspondiente según el Plan Comercial activo (**ERS RF-21**), resolviendo íntegramente las ambigüedades arquitectónicas documentadas en **C-10**, **C-12**, **C-16** y **O-18**:
- **En Plan Básico Monosucursal (`BASICO_LOCAL` Multi-Caja):** Las terminales `SECUNDARIO_LAN` sincronizan mediante `LanClusterSyncStrategy` (`SYNC_CURSOR.nodo_destino = 'LAN_MASTER'`) hacia el `LanSyncHub` embebido en la Caja Maestra (`MAESTRO_LAN`, SQLite WAL), sin tráfico hacia internet.
- **En Plan Superior Multisucursal (`SUPERIOR_CLOUD`):** El nodo sincroniza mediante `CloudMultiBranchSyncStrategy` (`SYNC_CURSOR.nodo_destino = 'CLOUD_CENTRAL'`) hacia el backend central PostgreSQL (`backend-cloud` en NestJS). Cuando un comercio sube desde el Plan Básico al Plan Superior, el cursor para `'CLOUD_CENTRAL'` inicia en `null` y este mismo flujo ejecuta el **Bootstrap Catch-Up Push** inicial subiendo todo el catálogo e historial confirmado sin migración de tablas.

Garantiza:
1. **Filtrado Estricto de Carga (Resolución C-16):** El worker de sincronización escanea y sube **únicamente** transacciones con `estado_general = 'CONFIRMADA'`. Los carritos en `BORRADOR` y las reservas expiradas en `DESCARTADO` residen y fenecen exclusivamente en el almacenamiento local de la terminal.
2. **Evaluación Ortogonal e Independiente de Conflictos (Resolución O-18):** El impacto en el inventario y la actualización de crédito a clientes son tratados como **dos flujos concurrentes e independientes** dentro de la misma transacción ACID del nodo autoritativo, desterrando el antipatrón de modelarlos como ramas `alt/else` mutuamente excluyentes (una venta puede tener simultáneamente stock negativo y colisión de crédito).
3. **Persistencia Completa y Descuento Nominal de Stock (Resolución O-18):** Se ilustra explícitamente la inserción de cabecera `VENTA`, renglones `VENTA_DETALLE` y pagos `PAGO_VENTA`, así como el descuento normal de existencias físicas (`UPDATE PRODUCTO_SUCURSAL SET stock_fisico = stock_fisico - cantidad`), registrando alertas forenses solo si el stock resultante pasa a valores negativos.
4. **Merge Aditivo Acumulativo OCC (Resolución C-10):** Si la venta incluye pagos a crédito (`CUENTA_CORRIENTE`), el nodo receptor valida el campo `version` del cliente. Si detecta una colisión concurrente, ejecuta un bloqueo transaccional y aplica un merge aditivo acumulativo (`saldo_deudor = saldo_deudor + delta`), protegiendo la integridad del libro mayor.

---

## 2. Diagrama de Secuencia (Mermaid.js)

```mermaid
sequenceDiagram
    autonumber

    actor C as Cajero / POS Local
    participant BDL as BD Local (SQLite / WatermelonDB)
    participant Sync as Worker Sync Local (ISyncEngineStrategy)
    participant API as Hub Receptor (LanSyncHub MAESTRO_LAN / Backend Cloud NestJS)
    participant BDCentral as BD Autoritativa (SQLite Master LAN / PostgreSQL Cloud)

    rect rgb(240, 248, 255)
    note over C, BDL: FASE 1: Transacción Atómica de Cobro en Mostrador (Sin Latencia)
    C->>BDL: Presiona "Cobrar" (Venta Presencial)
    BDL->>BDL: BEGIN TRANSACTION (SQLite)
    BDL->>BDL: 1. UPDATE VENTA SET estado_general = 'CONFIRMADA', estado_logistico = 'ENTREGADO', id_turno_caja = :id_turno, updated_at = NOW()
    BDL->>BDL: 2. INSERT INTO VENTA_DETALLE (id, id_venta, id_producto, cantidad, precio_unitario, ...)
    BDL->>BDL: 3. UPDATE PRODUCTO_SUCURSAL SET stock_fisico = stock_fisico - cant, stock_reservado = stock_reservado - cant
    BDL->>BDL: 4. INSERT INTO PAGO_VENTA (id, id_venta, id_metodo_pago, monto)
    opt Si la Venta incluye Fiado / Crédito
        BDL->>BDL: 5. INSERT INTO CUENTA_CORRIENTE (id_cliente, id_venta, monto: +deuda, tipo: 'VENTA_CREDITO')
        BDL->>BDL: 6. UPDATE CLIENTE SET saldo_deudor = saldo_deudor + deuda, version = version + 1
    end
    BDL->>BDL: COMMIT TRANSACTION
    BDL-->>C: Venta confirmada e inmutable (Imprime Ticket fiscal / comprobante)
    end

    rect rgb(240, 255, 240)
    note over Sync, BDL: FASE 2: Extracción y Filtrado Estricto de Deltas (Resolución C-16)
    loop Worker Periódico en Background (o disparado por confirmación)
        Sync->>BDL: SELECT * FROM ventas WHERE estado_general = 'CONFIRMADA' AND updated_at > :last_pushed_at
        note over Sync, BDL: Regla C-16: Carritos en 'BORRADOR' y 'DESCARTADO'<br/>se ignoran y NO se envían a la nube
        BDL-->>Sync: Retorna Lote con VENTA, VENTA_DETALLE, PAGO_VENTA y CUENTA_CORRIENTE
        Sync->>API: POST /api/sync/push { deltas: [lote_ventas_confirmadas], last_pulled_at: :cursor }
    end
    end

    rect rgb(255, 245, 238)
    note over API, BDCentral: FASE 3: Consolidación Transaccional en PostgreSQL (Resolución O-18)
    API->>BDCentral: BEGIN TRANSACTION (PostgreSQL ACID)
    
    note over API, BDCentral: Paso A: Inserción de Comprobante Completo
    API->>BDCentral: INSERT INTO VENTA (id, numero_comprobante, id_sucursal, id_turno_caja, total, estado_general: 'CONFIRMADA', ...)
    API->>BDCentral: INSERT INTO VENTA_DETALLE (id, id_venta, id_producto, cantidad, precio_unitario, monto_descuento, ...)
    API->>BDCentral: INSERT INTO PAGO_VENTA (id, id_venta, id_metodo_pago, monto)

    note over API, BDCentral: Paso B: Descuento Nominal de Inventario en Góndola (Evaluación Independiente)
    API->>BDCentral: UPDATE PRODUCTO_SUCURSAL SET stock_fisico = stock_fisico - :cant WHERE id_producto = :id AND id_sucursal = :sucursal
    opt Stock Resultante < 0 (Aceptación de Stock Negativo - Resolución C-12)
        API->>BDCentral: INSERT INTO AUDITORIA (tabla: 'PRODUCTO_SUCURSAL', accion: 'VENTA_OFFLINE_STOCK_NEGATIVO', valor_nuevo: { stock: stock_resultante })
    end

    note over API, BDCentral: Paso C: Consolidación de Crédito en Cuenta Corriente (Evaluación Ortogonal)
    opt Si la Venta contiene Pagos a Crédito (CUENTA_CORRIENTE)
        API->>BDCentral: INSERT INTO CUENTA_CORRIENTE (id, id_cliente, id_venta, monto: +deuda, tipo: 'VENTA_CREDITO')
        API->>BDCentral: UPDATE CLIENTE SET saldo_deudor = saldo_deudor + delta_credito, version = version + 1 WHERE id = :id_cliente AND version = :version_local
        alt Versión Coincide (Sin Colisión Concurrente)
            BDCentral-->>API: Rows affected = 1 (Actualización Exitosa)
        else Colisión Concurrente (Resolución OCC Merge Aditivo - Resolución C-10)
            API->>BDCentral: SELECT saldo_deudor, limite_credito FROM CLIENTE WHERE id = :id_cliente FOR UPDATE
            API->>BDCentral: UPDATE CLIENTE SET saldo_deudor = saldo_deudor + delta_credito, version = version + 1 WHERE id = :id_cliente
            API->>BDCentral: INSERT INTO AUDITORIA (tabla: 'CLIENTE', accion: 'RESOLUCION_MERGE_OCC', motivo: 'Merge aditivo acumulativo de venta offline confirmada')
        end
    end

    API->>BDCentral: COMMIT TRANSACTION
    BDCentral-->>API: Transacción Central Consolidada Exitosamente
    API-->>Sync: 200 OK { nuevo_cursor: :timestamp, status: 'SUCCESS' }
    Sync->>BDL: UPDATE SYNC_CURSOR SET last_pushed_at = :nuevo_cursor
    end
```

---

## 3. Matriz de Filtrado y Persistencia según Dimensión General

| Estado General | ¿Se persiste en SQLite Local? | ¿Se sincroniza a PostgreSQL Nube? | Justificación Arquitectónica (C-16 y Ciclo de Vida) |
|---|---|---|---|
| `BORRADOR` | **SÍ** | **NO** | Reside estrictamente en SQLite local. Evita saturar la base central con carritos temporales o en armado. Solo reserva stock (`stock_reservado`). |
| `DESCARTADO` | **SÍ** (marca local) | **NO** | Carrito en borrador cancelado por el cajero o purgado por Garbage Collection. Solo libera `stock_reservado`; nunca afectó `stock_fisico` ni dinero. Permanece local. |
| `CONFIRMADA` | **SÍ** | **SÍ** | Venta legal, fiscal y físicamente consumada. Descuenta `stock_fisico`, fija `id_turno_caja` y viaja vía Push Delta a PostgreSQL. |
| `CANCELADA` | **SÍ** | **SÍ** | **Anulación formal de una venta previamente `CONFIRMADA`**. Reingresa el 100 % de los productos al `stock_fisico`, evalúa reintegro monetario según `estado_financiero` y se sincroniza a la Nube para anular la transacción remota y registrar la auditoría forense. |
