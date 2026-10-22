# Diagrama de Secuencia: Módulo de Recepción de Mercadería y Control de Proveedores

Este diagrama detalla la interacción entre el Cajero/Operario, la Interfaz de Usuario, el Motor de Diccionario de Proveedores y la Persistencia Local/Cloud, formalizando las transiciones de estado de la recepción (`BORRADOR → EN_REVISION → CONFIRMADA`), el aprendizaje automático de alias y el registro de discrepancias con el enum tipado `EstadoDiscrepanciaItem`, en estricta subsanación de los hallazgos **O-12** y **O-17**.

```mermaid
sequenceDiagram
    autonumber
    actor C as Cajero / Operario
    participant UI as Interfaz de Recepción
    participant D as Diccionario Proveedor (Local)
    participant BDL as BD Local (SQLite WatermelonDB)
    participant N as Nube Central (PostgreSQL)

    C->>UI: Ingresa comprobante de proveedor (Excel / Carga Manual / Remito)
    UI->>BDL: INSERT INTO recepcion_mercaderia (estado: 'BORRADOR')
    
    C->>UI: Inicia proceso de verificación y conteo físico
    UI->>BDL: UPDATE recepcion_mercaderia SET estado = 'EN_REVISION'

    loop Para cada renglón de la Factura / Remito
        UI->>D: Busca coincidencia con "nombre_en_factura"
        
        alt Producto Mapeado Encontrado
            D-->>UI: Retorna id_producto interno
        else Producto Nuevo / No Mapeado
            D-->>UI: NULL (Sin coincidencia)
            UI->>C: Solicita vincular con producto existente del catálogo
            C->>UI: Selecciona el producto real del local ('uuid-prod')
            UI->>D: Registra nuevo alias en DICCIONARIO_PROVEEDOR
            Note over UI,D: Aprendizaje Automático: Próximas facturas se mapearán automáticamente
        end

        UI->>UI: Compara Precio Costo Actual vs. Precio Facturado
        alt El costo aumentó / cambió
            UI->>C: Alerta: "Variación de costo detectada. Precio sugerido calculado para mantener margen"
            C->>UI: Confirma o ajusta flag aplicar_precio_sugerido
        end

        UI->>UI: Compara cantidad_declarada vs. cantidad_recibida (conteo físico)
        alt Discrepancia de cantidad o calidad
            UI->>C: Clasifica renglón con EstadoDiscrepanciaItem:<br/>'CONFORME' | 'FALTANTE' | 'SOBRANTE' | 'RECHAZADO_CALIDAD'
            C->>UI: Ingresa motivo de observación y cantidad real aceptada
        end
        
        UI->>BDL: INSERT INTO recepcion_mercaderia_detalle (cantidad_declarada, cantidad_recibida, estado_discrepancia, ...)
    end

    C->>UI: Clic en "Confirmar Recepción de Mercadería"
    UI->>BDL: BEGIN TRANSACTION (SQLite)
    UI->>BDL: 1. UPDATE recepcion_mercaderia SET estado = 'CONFIRMADA', fecha_completado = NOW()
    UI->>BDL: 2. UPDATE producto_sucursal SET stock_fisico = stock_fisico + cantidad_recibida, precio_costo = nuevo_costo
    opt Si aplicar_precio_sugerido = true
        UI->>BDL: 3. UPDATE producto_sucursal SET precio_minorista = precio_venta_sugerido
        UI->>BDL: 4. INSERT INTO auditoria ('CAMBIO_PRECIO_POR_RECEPCION')
    end
    UI->>BDL: COMMIT TRANSACTION
    BDL-->>UI: Mercadería asentada localmente en stock y precios actualizados en mostrador

    Note over BDL,N: Sincronización Asíncrona (Background Sync)
    BDL->>N: Sincroniza remito confirmado, movimientos de stock, auditoría y nuevo diccionario
    N-->>BDL: 200 OK
```

## Reglas de Transición y Trazabilidad

1. **Ciclo de Estados Formal (O-17):** La recepción inicia en `BORRADOR` al pre-cargar o abrir el comprobante. Al comenzar la revisión física de bultos transiciona a `EN_REVISION`. Al confirmarse el ingreso pasa a `CONFIRMADA` (impactando stock exclusivamente por `cantidad_recibida`), o a `RECHAZADA` si la carga se devuelve íntegramente al transportista sin modificar existencias.
2. **Enum de Discrepancias Tipado:** Cada renglón de `RECEPCION_MERCADERIA_DETALLE` se tipa estrictamente mediante `EstadoDiscrepanciaItem`:
   - `CONFORME`: Cantidad recibida idéntica a lo declarado y en óptimo estado.
   - `FALTANTE`: Se recibieron menos unidades que las facturadas.
   - `SOBRANTE`: Llegaron más unidades que las declaradas.
   - `RECHAZADO_CALIDAD`: Mercadería dañada, vencida o en mal estado rechazada al transportista (no ingresa al inventario vendible).
