# Diagrama de Secuencia: Emisión de Notas de Crédito y Devoluciones

## 1. Propósito Arquitectónico

Este diagrama formaliza el flujo de devoluciones de mercadería y emisión de notas de crédito en cumplimiento estricto de **ERS RF-09**, **RF-10**, **RNF-03** y las resoluciones arquitectónicas **C-01**, **C-02**, **C-03**, **C-04** y **O-19**.

Garantiza:
1. **Validaciones Obligatorias de Backend Post-POST (Resolución O-19):** Las validaciones de negocio e integridad se ejecutan obligatoriamente en el servidor tras recibir el `POST /devoluciones`, desterrando el antipatrón de diagramarlas antes del envío HTTP o dentro de bloques opcionales.
2. **Control Anti-Doble Devolución (Resolución O-19):** El backend consulta el histórico de `NOTA_CREDITO_DETALLE` vinculadas a la venta para calcular la cantidad neta devoluble ($\text{devoluble} = \text{vendida} - \sum \text{devuelta\_previa}$), impidiendo que un producto sea devuelto más de una vez.
3. **Desacoplamiento Temporal de Caja (Resolución C-06):** El egreso de efectivo impacta en el `TURNO_CAJA` abierto hoy por el cajero que efectúa la devolución, preservando la inmutabilidad contable del turno en que se originó la venta pasada.
4. **Garantía de Reembolso Neto Promocional (Resolución C-04):** Si el producto se vendió con descuento o en combo, el importe a reintegrar deduce el descuento unitario proporcional, evitando devolver más dinero del efectivamente cobrado.

---

## 2. Diagrama de Secuencia (Mermaid.js)

```mermaid
sequenceDiagram
    autonumber

    actor C as Cajero
    participant F as Frontend (POS)
    participant B as Backend API (NestJS)
    participant BD as Base de Datos (PostgreSQL / SQLite)

    rect rgb(240, 248, 255)
    note over C, BD: FASE 1: Búsqueda, Cálculo de Saldos Devolubles y Selección
    C->>F: Ingresa Número de Ticket / ID de Venta original
    F->>B: GET /api/ventas/{id}/devolucion-disponible
    B->>BD: SELECT v.*, vd.*, COALESCE(SUM(ncd.cantidad), 0) as devuelto_acumulado<br/>FROM venta v<br/>JOIN venta_detalle vd ON vd.id_venta = v.id<br/>LEFT JOIN nota_credito_detalle ncd ON ncd.id_venta_detalle = vd.id<br/>WHERE v.id = :id GROUP BY v.id, vd.id
    BD-->>B: Retorna datos de venta y saldo neto disponible por renglón
    B-->>F: Retorna ítems con cantidad_maxima_devoluble = (cantidad - devuelto_acumulado)

    C->>F: Selecciona productos y cantidades a devolver (cant <= max_devoluble)

    alt Venta de Contado (Anónima / id_cliente es NULL)
        F->>F: Bloquea opciones en UI. Fuerza tipo_devolucion = 'EFECTIVO_CAJA'
        C->>F: Selecciona "Efectivo (Caja)"
    else Venta a Cliente Registrado con Cuenta Corriente
        alt saldo_deudor < monto_devolucion
            F->>F: Bloquea REDUCCION_DEUDA pura (RF-10)
            F-->>C: Notificación: Saldo deudor < Reembolso. Aplica compensación mixta.
            C->>F: Confirma Efectivo con amortización de deuda residual
        else saldo_deudor >= monto_devolucion
            F->>F: Habilita opciones: Efectivo o Reducción de Deuda
            C->>F: Selecciona Tipo de Devolución
        end
    end
    end

    rect rgb(255, 245, 238)
    note over C, B: FASE 2: Envío y Validaciones Obligatorias de Backend (Resolución O-19)
    C->>F: Clic en "Confirmar Devolución"
    F->>B: POST /api/devoluciones { id_venta, items_devueltos, tipo_devolucion }
    
    note over B: 1. Validación de Estado de Venta
    alt Venta no existe o estado_general != 'CONFIRMADA'
        B-->>F: 400 Bad Request { error: 'La venta no se encuentra confirmada' }
    end

    note over B: 2. Validación Anti-Doble Devolución (Acumulado Histórico)
    alt Algún ítem supera: (cantidad_vendida - cantidad_previamente_devuelta)
        B-->>F: 400 Bad Request { error: 'Cantidad solicitada supera el remanente devoluble del ítem' }
    end

    note over B: 3. Validación de Compatibilidad de Cliente
    alt id_cliente IS NULL AND tipo_devolucion != 'EFECTIVO_CAJA'
        B-->>F: 400 Bad Request { error: 'Venta anónima no admite compensación en cuenta corriente' }
    end
    end

    rect rgb(240, 255, 240)
    note over B, BD: FASE 3: Transacción Atómica ACID en Base de Datos
    B->>BD: BEGIN TRANSACTION
    
    note over B, BD: Paso A: Verificación de Turno de Caja Abierto Hoy
    B->>BD: SELECT id FROM turno_caja WHERE id_usuario = :cajero AND estado = 'ABIERTO'
    
    note over B, BD: Paso B: Inserción de Comprobante Fiscal de Devolución
    B->>BD: 1. INSERT INTO NOTA_CREDITO (id, id_venta, id_cliente, id_turno_caja: turno_actual.id, monto_total, ...)
    B->>BD: 2. INSERT INTO NOTA_CREDITO_DETALLE (x cada producto devuelto con monto_descuento neto prorrateado - RF-09)
    
    note over B, BD: Paso C: Actualización Inmutable de Venta y Stock
    B->>BD: 3. UPDATE VENTA SET tiene_devolucion_parcial = true WHERE id = :id_venta
    B->>BD: 4. UPDATE PRODUCTO_SUCURSAL SET stock_fisico = stock_fisico + cant_devuelta WHERE id_producto = :prod AND id_sucursal = :sucursal
    
    note over B, BD: Paso D: Compensación Financiera
    alt tipo_devolucion == 'EFECTIVO_CAJA'
        opt Si id_cliente != NULL y tiene saldo_deudor > 0 (RF-10 Compensación Mixta)
            B->>BD: 5a. UPDATE CLIENTE SET saldo_deudor = saldo_deudor - min(saldo_deudor, monto_total), version = version + 1
            B->>BD: 5b. INSERT INTO CUENTA_CORRIENTE (id_cliente, id_nota_credito, monto: -amortizado, tipo: 'AJUSTE_DEVOLUCION')
        end
        opt Si queda remanente para entregar en mano al cliente
            B->>BD: 5c. INSERT INTO MOVIMIENTO_CAJA (id_turno_caja: turno_actual.id, tipo: 'EGRESO', monto: remanente_efectivo)
        end
    else tipo_devolucion == 'REDUCCION_DEUDA'
        B->>BD: 5d. UPDATE CLIENTE SET saldo_deudor = saldo_deudor - monto_total, version = version + 1
        B->>BD: 5e. INSERT INTO CUENTA_CORRIENTE (id_cliente, id_nota_credito, monto: -monto_total, tipo: 'AJUSTE_DEVOLUCION')
    end

    B->>BD: COMMIT TRANSACTION
    BD-->>B: Transacción de Devolución Exitosa
    B-->>F: 201 Created { id_nota_credito, numero_comprobante }
    F-->>C: Muestra confirmación e imprime Comprobante de Nota de Crédito
    end
```

---

## 3. Puntos de Control y Reglas de Negocio

1. **Inmutabilidad del Snapshot Histórico:** La tabla `VENTA` jamás modifica sus totales ni borra filas de `VENTA_DETALLE`. Únicamente conmuta el flag booleano `tiene_devolucion_parcial = true` para auditoría contable.
2. **Trazabilidad de Descuentos (RF-09):** `NOTA_CREDITO_DETALLE.subtotal` calcula el valor efectivo desembolsado por el cliente, deduciendo la proporción de descuento de promociones de catálogo ([Resolución C-04](file:///d:/Contr/Downloads/POSLyon/auditoria_trazabilidad_poslyon.md#L39)).
3. **Caja Afectada:** Todo egreso de efectivo físico (`MOVIMIENTO_CAJA` de tipo 'EGRESO') se asocia indefectiblemente al `id_turno_caja` del cajero presente, garantizando que el arqueo de hoy cuadre con exactitud sin modificar la historia de turnos pasados.
