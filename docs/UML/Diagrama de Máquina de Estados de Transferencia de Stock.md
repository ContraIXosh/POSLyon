# Diagrama de Máquina de Estados: Ciclo de Vida de Transferencia de Stock

> **Alcance por Plan Comercial (ERS RF-16 y RF-21):** `[Exclusivo Plan Superior — plan_activo = 'SUPERIOR_CLOUD' y feature_toggles.transferencias_inter_sucursal = true]`. En el Plan Básico Monosucursal (`BASICO_LOCAL`, $N = 1$), la tabla `TRANSFERENCIA_STOCK` permanece vacía (0 filas) en SQLite local para preservar invariancia de esquema sin costo de almacenamiento.

Este diagrama modela el ciclo de vida riguroso de una transferencia física de stock entre sucursales (`TRANSFERENCIA_STOCK`), formalizando las transiciones de estado, condiciones de guarda y efectos colaterales (*Side Effects*) en cumplimiento estricto de **ERS RF-16**, **RNF-03**, y las resoluciones de arquitectura **C-24** (Handshake Dual Online) y **O-08** (Soporte Decimal y Cierre de Discrepancias).

```mermaid
stateDiagram-v2
    [*] --> PENDIENTE_DESPACHO: Handshake Dual exitoso (Origen y Destino ONLINE en Nube)

    PENDIENTE_DESPACHO --> CANCELADA: Administrador anula orden antes de salida física
    note right of CANCELADA
        Side Effects:
        - No modifica existencias en ninguna sucursal
        - Se inmutabiliza la orden
        - Registro forense en AUDITORIA
    end note

    PENDIENTE_DESPACHO --> EN_TRANSITO: Operario de Origen confirma despacho físico de bultos
    note right of EN_TRANSITO
        Guardas:
        - id_usuario_envia autenticado
        - Bultos y precinto validados
        Side Effects:
        - Descuento atómico en origen:
          stock_fisico = stock_fisico - cantidad_enviada (decimal)
        - Asienta fecha_envio = NOW()
        - Emite evento WebSocket a destino
    end note

    EN_TRANSITO --> COMPLETADA: Operario de Destino recibe físicamente conforme (cantidad_recibida == cantidad_enviada)
    note right of COMPLETADA
        Guardas:
        - id_usuario_recibe autenticado
        - Conteo físico idéntico a remito
        Side Effects:
        - Incremento atómico en destino:
          stock_fisico = stock_fisico + cantidad_recibida (decimal)
        - Asienta fecha_recepcion = NOW()
        - Orden finalizada exitosamente
    end note

    EN_TRANSITO --> DISCREPANCIA: Operario de Destino constata faltante, sobrante o rotura (cantidad_recibida != cantidad_enviada)
    note right of DISCREPANCIA
        Guardas:
        - id_usuario_recibe autenticado
        - motivo_discrepancia obligatorio
        Side Effects:
        - Incremento en destino sólo de lo recibido físicamente:
          stock_fisico = stock_fisico + cantidad_recibida
        - Asienta fecha_recepcion = NOW() y motivo_discrepancia
        - Alerta automática en AUDITORIA y panel central
    end note

    DISCREPANCIA --> DISCREPANCIA_RESUELTA: Administrador Global regulariza diferencia en Panel Nube
    note right of DISCREPANCIA_RESUELTA
        Guardas:
        - id_usuario_resuelve_discrepancia con permiso de Administrador
        - Dictamen administrativo y contable
        Side Effects:
        - Ajuste de reclamo logístico / merma de transporte
        - Asienta fecha_resolucion_discrepancia = NOW()
        - Orden cerrada e inmutable
    end note

    COMPLETADA --> [*]
    DISCREPANCIA_RESUELTA --> [*]
    CANCELADA --> [*]
```

## Reglas de Integridad y Transiciones

1. **Precondición Dual (C-24):** El estado `PENDIENTE_DESPACHO` únicamente puede generarse si la API central confirma que `SUCURSAL.en_linea = true` para ambas tiendas involucradas.
2. **Inexistencia de Re-enrutamiento:** Una orden `EN_TRANSITO` jamás puede cambiar de destino en vuelo. Si la carga física debe redirigirse a una tercera sucursal, primero debe completarse la recepción en destino y luego emitir una nueva orden.
3. **Precisión Decimal (O-08):** Todo cálculo de descuento e incremento en `PRODUCTO_SUCURSAL.stock_fisico` respeta el tipo de dato `decimal`, asegurando trazabilidad para productos a granel o pesables sin pérdida de precisión.
