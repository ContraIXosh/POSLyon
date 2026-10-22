# Diagrama de Máquina de Estados: Ciclo de Vida de Alerta de Cuarentena

Este diagrama formaliza el ciclo de vida de la entidad `ALERTA_CUARENTENA`, vinculando la detección de faltantes durante la preparación guiada de pedidos en terminal móvil con la resolución forense en mostrador/depósito conforme a **ERS RF-03**, **RF-13**, **RF-19** y la resolución arquitectónica **C-23**.

```mermaid
stateDiagram-v2
    [*] --> PENDIENTE: Embalador reporta faltante en estante durante preparación guiada (LAN)

    note right of PENDIENTE
        Disparador:
        - Carrito pasa a INCOMPLETO
        - Se crea ALERTA_CUARENTENA con cantidad_faltante
        Side Effects:
        - Pone en cuarentena lógica el producto en la sucursal
        - Notifica al Encargado/Administrador en el Panel Web
    end note

    PENDIENTE --> MERMA_CONFIRMADA: Encargado constata ausencia física real (rotura, vencimiento o robo)
    note right of MERMA_CONFIRMADA
        Guardas:
        - id_usuario_resuelve autenticado
        - Inspección física negativa
        Side Effects (Resolución C-23):
        - Deducción proporcional exacta:
          stock_fisico = stock_fisico - cantidad_faltante
        - Libera el remanente legítimo de la cuarentena
        - Asienta AUDITORIA ('MERMA_FISICA_CONFIRMADA')
        - Asienta fecha_resolucion = NOW()
    end note

    PENDIENTE --> FALSA_ALARMA: Encargado halla el producto traspapelado o en otra góndola
    note right of FALSA_ALARMA
        Guardas:
        - id_usuario_resuelve autenticado
        - Conteo físico positivo
        Side Effects:
        - NO modifica stock_fisico (el stock existía)
        - Libera el producto de la cuarentena a disponible
        - Asienta AUDITORIA ('FALSA_ALARMA_CUARENTENA')
        - Asienta fecha_resolucion = NOW()
    end note

    MERMA_CONFIRMADA --> [*]
    FALSA_ALARMA --> [*]
```

## Reglas de Negocio del Flujo de Cuarentena

1. **Aislamiento por Sucursal (C-22 y C-23):** La alerta y su eventual merma aplican exclusivamente a `PRODUCTO_SUCURSAL` del local emisor (`WHERE id_producto = :id AND id_sucursal = :sucursal`).
2. **Deducción No Destructiva (C-23):** Se prohíbe terminantemente "ajustar a 0" las existencias si faltaban menos unidades de las que figuraban en el sistema (ej. si el sistema marcaba 10 y faltaron 2, el stock se ajusta a 8, preservando las 8 unidades reales encontradas).
3. **Auditoría Forense Obligatoria:** Tanto la confirmación de merma como la falsa alarma exigen registrar al usuario responsable y un motivo textual explicativo en la tabla `AUDITORIA`.
