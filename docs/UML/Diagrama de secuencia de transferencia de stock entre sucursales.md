# Diagrama de Secuencia: Transferencia de Stock entre Sucursales con Handshake de Conectividad Dual

> **Alcance por Plan Comercial (ERS RF-16 y RF-21):** `[Exclusivo Plan Superior — plan_activo = 'SUPERIOR_CLOUD' y feature_toggles.transferencias_inter_sucursal = true]`. En el Plan Básico Monosucursal (`BASICO_LOCAL`), este módulo no se carga en memoria (*React Lazy Code Splitting*) y sus rutas permanecen desactivadas.

Este diagrama modela el flujo logístico y transaccional para la transferencia de mercadería entre sucursales, implementando el patrón *Two-Phase Commit* (2PC) a nivel de negocio y exigiendo la **precondición de conectividad dual activa** (Handshake Obligatorio) para prevenir mercadería en tránsito hacia o desde sucursales desconectadas (Resolución C-24, ERS RF-16 y Escenario 8).

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Administrador Global (Web)
    participant N as Nube Central (PostgreSQL)
    participant BDA as BD Local Sucursal A (Origen)
    actor SA as Operario / Encargado (Suc. A)
    participant BDB as BD Local Sucursal B (Destino)
    actor SB as Operario / Encargado (Suc. B)

    rect rgb(253, 245, 230)
    Note over Admin,N: FASE 0: Orquestación Central y Handshake de Conectividad Dual (RF-16 / Escenario 8)
    Admin->>N: POST /transferencias { id_sucursal_origen: 'Suc-A', id_sucursal_destino: 'Suc-B', items: [{ id_producto, cantidad: 50 }] }
    N->>N: Verifica conectividad en tiempo real:<br/>SELECT id, en_linea FROM sucursal WHERE id IN ('Suc-A', 'Suc-B')
    
    alt Alguna sucursal se encuentra OFFLINE (Handshake Rechazado - Escenario 8)
        N-->>Admin: HTTP 409 Conflict ("No se puede iniciar transferencia: Sucursal B está OFFLINE")
        Note over Admin,N: Operación abortada. Stock intacto y sin mercadería en el limbo.
    else Conectividad Dual Confirmada (en_linea = true en Origen y Destino)
        N->>N: Inserta transferencia en estado 'PENDIENTE_DESPACHO'
        N-->>Admin: HTTP 201 Created (Transferencia #TR-101 registrada)
        N->>BDA: Notificación Push / WebSocket ("Nueva Orden de Despacho #TR-101: 50 unid. a Suc. B")
    end
    end

    rect rgb(240, 248, 255)
    Note over N,SA: FASE 1: Armado Físico y Despacho en Sucursal Origen
    BDA-->>SA: UI Alerta en terminal: "Preparar 50 unidades para transferir a Sucursal B"
    SA->>SA: Separa y embala la mercadería física en depósito
    SA->>BDA: Confirma despacho de bultos
    BDA->>BDA: Transacción Local: UPDATE producto_sucursal SET stock_fisico = stock_fisico - 50 WHERE id_sucursal = 'Suc-A'
    BDA->>N: Sync Push: Evento 'DESPACHO_CONFIRMADO' (id_transferencia: #TR-101)
    N->>N: UPDATE transferencia_stock SET estado = 'EN_TRANSITO', fecha_despacho = NOW()
    N->>BDB: Notificación Push / WebSocket ("Mercadería en camino: 50 unid. desde Suc. A")
    end

    rect rgb(255, 245, 238)
    Note over N,SB: Interludio Logístico (Transporte / Flete)
    BDB-->>SB: UI Alerta en terminal destino: "Recepción Pendiente: 50 unid. en camino desde Suc. A"
    end

    rect rgb(240, 255, 240)
    Note over N,SB: FASE 2: Recepción Física y Cierre en Sucursal Destino
    SB->>SB: Llega el transporte. Operario cuenta físicamente la mercadería recibida.

    alt Recepción Conforme (50 unidades íntegras)
        SB->>BDB: Confirma recepción completa (50 unidades)
        BDB->>BDB: Transacción Local: UPDATE producto_sucursal SET stock_fisico = stock_fisico + 50 WHERE id_sucursal = 'Suc-B'
        BDB->>N: Sync Push: Evento 'RECEPCION_CONFIRMADA' (estado: 'COMPLETADA', cantidad_recibida: 50)
        N->>N: UPDATE transferencia_stock SET estado = 'COMPLETADA', fecha_recepcion = NOW()
        N-->>Admin: Notificación Web: "Transferencia #TR-101 COMPLETADA exitosamente"
    else Discrepancia por Faltante / Rotura (Ej: 45 unidades sanas, 5 dañadas)
        SB->>BDB: Declara recepción parcial (45 unidades, motivo: "5 unidades dañadas en transporte")
        BDB->>BDB: Transacción Local: UPDATE producto_sucursal SET stock_fisico = stock_fisico + 45 WHERE id_sucursal = 'Suc-B'
        BDB->>N: Sync Push: Evento 'RECEPCION_DISCREPANCIA' (estado: 'DISCREPANCIA', cantidad_recibida: 45, faltante: 5)
        N->>N: UPDATE transferencia_stock SET estado = 'DISCREPANCIA', fecha_recepcion = NOW()
        N->>N: INSERT INTO auditoria (tabla_afectada, id_registro_afectado, accion, motivo, valor_anterior, valor_nuevo) VALUES ('TRANSFERENCIA_STOCK', #TR-101, 'DISCREPANCIA_TRANSFERENCIA', 'Diferencia en recepción física de transferencia', '{"despachadas": 50}', '{"recibidas": 45, "faltante": 5}')
        N-->>Admin: Alerta urgente en Panel Web para resolución administrativa y reclamo logístico
    end
    end
```

---

## Especificaciones y Reglas de Negocio (Trazabilidad PAT)

### 1. Precondición de Conectividad Dual (Handshake Obligatorio - Resolución C-24)
- **Principio Rector:** A diferencia de las ventas presenciales en mostrador (que son 100% *offline-first* para no demorar la fila de clientes), las transferencias entre sucursales involucran movimiento de activos físicos entre dos puntos geográficos distintos y son orquestadas exclusivamente por el **Administrador Global desde el Panel Web**.
- **Validación Previa en Nube:** El backend verifica en `SUCURSAL.en_linea` que tanto el nodo origen como el nodo destino mantengan conectividad activa mediante sus WebSockets/Heartbeats vigentes.
- **Rechazo Atómico (HTTP 409 Conflict):** Si la sucursal de origen o la de destino están desconectadas, el sistema rechaza la solicitud de creación con código HTTP 409 Conflict (o 503 Service Unavailable, conforme a RFC 9110, ERS RF-16 y Escenario 8). Esto indica que la solicitud choca con el estado operativo offline del nodo destino, garantizando que no existan órdenes huérfanas en el limbo ni mercadería despachada hacia locales incomunicados que no puedan recibirla.

### 2. Ciclo de Vida de la Transferencia (Máquina de 4 Estados)
1. `PENDIENTE_DESPACHO`: Orden creada en la Nube y notificada a la Sucursal Origen. El stock aún reside físicamente en Origen.
2. `EN_TRANSITO`: El operario de Origen empaquetó y confirmó el despacho físico. El stock se descuenta en la base local de Origen (`stock_fisico = stock_fisico - cantidad`) y la mercadería viaja en el transporte.
3. `COMPLETADA`: El operario de Destino recibió el 100% de los bultos conformes. El stock se incrementa en la base local de Destino (`stock_fisico = stock_fisico + cantidad_recibida`).
4. `DISCREPANCIA`: Se detectaron diferencias físicas (rotura, extravío o robo en transporte). Destino ingresa a stock únicamente lo recibido en buen estado y el sistema genera una alerta en `AUDITORIA` para intervención del Administrador.

### 3. Reglas de Inmutabilidad Logística
- **Sin Re-enrutamiento Físico:** Una vez que la transferencia pasa a `EN_TRANSITO`, no se permite re-enrutar la carga a una tercera sucursal C. Toda redistribución requiere cerrar formalmente la recepción en B y generar una nueva orden de B a C.
- **Deducción e Incremento Desacoplados:** El origen descuenta existencias al momento fáctico del despacho; el destino suma existencias únicamente al momento fáctico de la recepción y conteo en depósito, impidiendo duplicidad o stocks fantasmas durante el trayecto.
