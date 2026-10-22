# Diagrama de Actividad: Reconciliación de Stock y Cuarentena de Faltantes

Este diagrama modela el flujo de trabajo desacoplado para la detección de productos faltantes durante la preparación de pedidos en tienda, la contención del carrito para evitar cobros erróneos, y la resolución administrativa de alertas de cuarentena distinguiendo entre **Merma Física Confirmada** y **Falsa Alarma** (Resolución C-23, ERS RF-14 y RF-21).
- **En Plan Básico (`BASICO_LOCAL`):** La resolución administrativa se ejecuta directamente en `pos-desktop` sobre SQLite local y se difunde a las demás cajas y móviles de la tienda vía LAN.
- **En Plan Superior (`SUPERIOR_CLOUD`):** Además de la actualización local, el delta de resolución y su auditoría se sincronizan hacia PostgreSQL Cloud.

```mermaid
flowchart TD
    classDef alerta fill:#ffcccc,stroke:#ff0000,stroke-width:2px;
    classDef accion fill:#e1f5fe,stroke:#03a9f4,stroke-width:1px;
    classDef auto fill:#f3e5f5,stroke:#9c27b0,stroke-width:1px;
    classDef decision fill:#fff9c4,stroke:#fbc02d,stroke-width:2px;

    subgraph Movil["App Móvil (Embalador / Preparador)"]
        A(["Busca producto en estantería"]) --> B{"¿Se encuentra la<br/>cantidad requerida?"}
        B -- Sí --> C["Marca ítem como OK en preparación"]
        B -- No --> D["Presiona 'Reportar Faltante'<br/>(declara cantidad_faltante)"]:::accion
    end

    subgraph MotorPOS["Motor POS Local y Gestión de Estado"]
        D --> E["Pasa estado de Carrito a 'INCOMPLETO'<br/>(Bloquea botón de cobro - Regla C-11)"]:::auto
        E --> F["Emite notificación WebSockets a terminal de Caja"]:::auto
        E --> G["Inserta registro en ALERTA_CUARENTENA<br/>(estado: 'PENDIENTE', cantidad_faltante)"]:::alerta
    end

    subgraph Caja["Punto de Venta y Gestión Administrativa (POS Desktop / Panel Admin)"]
        F -.-> H["Cajero visualiza alerta en pantalla"]
        H --> I["Cajero regulariza en mostrador:<br/>ajusta cantidad entregada o descarta ítem"]:::accion
        I --> J["Carrito transiciona a LISTO_PARA_COBRAR<br/>y cajero finaliza el cobro con el cliente"]:::auto
        
        G -.-> K["Administrador abre panel de Alertas de Cuarentena"]
        K --> L{"Inspección en góndola / depósito:<br/>¿Se localizó físicamente el producto?"}:::decision
        
        L -- "Sí, falsa alarma" --> M["Marca alerta como 'FALSA_ALARMA'<br/>(error de búsqueda u orden en góndola)"]:::accion
        L -- "No, es merma física real" --> N["Marca alerta como 'MERMA_CONFIRMADA'<br/>(Resolución C-23: deduce cantidad faltante)"]:::accion
    end

    subgraph Resolucion["Resolución de Inventario y Sincronización (LAN / Cloud)"]
        M --> O["Levanta Cuarentena y restaura disponibilidad<br/>(stock_fisico permanece inalterado)"]:::auto
        N --> P["Aplica deducción de merma:<br/>stock_fisico = stock_fisico - cantidad_faltante"]:::auto
        P --> Q["Registra auditoría 'RESOLUCION_CUARENTENA'<br/>(motivo: Merma física confirmada)"]:::auto
        M --> S["Registra auditoría 'RESOLUCION_CUARENTENA'<br/>(motivo: Falsa alarma por hallazgo posterior)"]:::auto
        Q --> T["Propaga delta a Cluster LAN (Plan Básico)<br/>y a PostgreSQL Cloud (Plan Superior)"]:::auto
        S --> T
        O --> T
    end
```

---

## Especificaciones y Reglas de Negocio (Trazabilidad PAT)

### 1. Resolución Matemática de la Merma en Cuarentena (Resolución C-23)
- **El Problema del "Ajuste a 0":** Fijar el inventario en cero (`stock_fisico = 0`) ante un reporte de faltante es una práctica destructiva e incorrecta. Si el sistema registraba 10 unidades en stock, un cliente solicitó 2 unidades y el preparador no las halló, la discrepancia probada es de 2 unidades, no de 10. Forzar el stock a cero provocaría la pérdida contable de las 8 unidades restantes que bien podrían estar ubicadas en un pasillo secundario, en depósito o en exhibición.
- **Fórmula Universal y Correcta:**
  $$\text{stock\_fisico} = \text{stock\_fisico} - \text{cantidad\_faltante}$$
  De esta forma:
  - Si el stock registrado era 10 y faltaron 2: $10 - 2 = 8$.
  - Si el stock registrado era 2 y faltaron 2: $2 - 2 = 0$.
  - Si el administrador inspecciona toda la sucursal y constata que el estante está 100% desabastecido, puede ejecutar complementariamente un `AJUSTE_STOCK` a 0 con su debida justificación forense.

### 2. Tratamiento de Falsas Alarmas (Ruta B)
- Cuando el producto es hallado con posterioridad (por ejemplo, detrás de otra marca o mal ordenado por un cliente):
  - El `stock_fisico` **no se modifica** (nunca se había descontado).
  - La reserva temporal del pedido original ya había sido descartada al momento en que el cajero regularizó la venta frente al mostrador.
  - La alerta transiciona a `FALSA_ALARMA`, quedando registrada en `AUDITORIA` para proveer métricas operativas (detección de problemas recurrentes de ordenamiento o capacitación en góndola).
