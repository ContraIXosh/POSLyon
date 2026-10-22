# Diagrama de Máquina de Estados: Ciclo de Vida del Carrito y Preparación

## 1. Propósito Arquitectónico

Este diagrama documenta todos los estados posibles por los que transiciona un carrito/pedido de venta desde que se escanea el primer producto en mostrador hasta su cobro definitivo y entrega física.

Garantiza:
1. **Flujo Guiado de Preparación y Control (Modo Focus / Highlight):** Para evitar distracciones o errores ante interrupciones, la UI resalta visualmente el producto activo y opaca el resto mientras el preparador o controlador valida ítem por ítem con el botón "OK".
2. **Doble Instancia Opcional (Preparación + Control):** Soporta tanto la preparación directa de pocos artículos como la revisión en dos etapas (preparador y posterior controlador en distintos dispositivos móviles vía LAN WebSocket).
3. **Bloqueo Incondicional en `INCOMPLETO` (Resolución C-11):** Si se detecta un faltante físico, el carrito pasa a `INCOMPLETO` y **deshabilita estrictamente el botón de cobro / finalización**. Es obligatorio regularizar el carrito en mostrador (ajustando la cantidad o eliminando el ítem) antes de poder cobrar, impidiendo sobrecobros al cliente o ventas fantasmas.
4. **Ventas Rápidas de Mostrador (*Fast-Path Checkout*):** Si la compra es pequeña o el cajero atiende de inmediato sin requerir embalador móvil, puede presionar "Cobrar" directamente desde `A_PREPARAR` o durante el proceso, sin obligatoriedad de pasar por cada fase previa.
5. **Garbage Collection con Ventana Deslizante (Resoluciones C-13 y C-14):** La reserva de stock (`stock_reservado`) expira universalmente para cualquier pedido en `estado_general = 'BORRADOR'` cuyo tiempo de inactividad supere `ttl_carrito_minutos` (obtenido de `CONFIGURACION_SUCURSAL.reglas_negocio`). Cada mutación activa en el pedido renueva la fecha de expiración, liberando el inventario automáticamente ante abandono.

---

## 2. Diagrama de Estados (Mermaid.js)

```mermaid
stateDiagram-v2
    direction TB

    [*] --> A_Preparar: Cajero inicia venta / Crea VENTA (estado_general = 'BORRADOR', estado_logistico = 'A_PREPARAR')

    state A_Preparar {
        [*] --> Cargando_Items
        Cargando_Items --> Cargando_Items: Escaneo / Modificación de ítem (+Stock Reservado / Snapshots de precio)
    }

    %% Transiciones desde A_Preparar
    A_Preparar --> Preparando: Clic "Preparar" (Operador abre pedido en celular vía WebSocket)
    A_Preparar --> Listo_Para_Cobrar: Venta Rápida (Cajero omite preparación guiada en mostrador)
    A_Preparar --> Descartado: Cajero descarta carrito borrador / Timeout GC

    state Preparando {
        [*] --> Focus_Item_Activo
        Focus_Item_Activo --> Focus_Item_Activo: Clic "OK" (Cantidad completa hallada -> Highlight salta al siguiente ítem)
    }

    %% Detección de Faltante en Preparación
    Preparando --> Incompleto: Clic "Incompleto" en algún ítem (Se ingresa cant. física hallada opcional)

    %% Finalización de Preparación
    Preparando --> Controlando: Todos los ítems "OK" + Clic "Controlar" (Segunda revisión por otro celular/operador)
    Preparando --> Listo_Para_Cobrar: Todos los ítems "OK" + Clic "Finalizar" (Omite control por ser pocos ítems)
    Preparando --> Listo_Para_Cobrar: Venta Rápida (Cajero decide cobrar inmediatamente)

    state Controlando {
        [*] --> Focus_Control_Item
        Focus_Control_Item --> Focus_Control_Item: Clic "OK" en verificación guiada de cada artículo
    }

    %% Detección de Faltante en Control
    Controlando --> Incompleto: Clic "Incompleto" durante la segunda revisión
    Controlando --> Listo_Para_Cobrar: Todos los ítems verificados "OK" + Clic "Finalizar Control"
    Controlando --> Listo_Para_Cobrar: Venta Rápida (Cobro directo de urgencia)

    %% Estado de Bloqueo Estricto (C-11)
    state Incompleto {
        [*] --> Alerta_Discrepancia_Activa
        note right of Incompleto
            BLOQUEO ESTRICTO DE COBRO:
            El botón de cobro / finalizar
            permanece DESHABILITADO.
            No se permite cobrar en este estado.
        end note
    }

    Incompleto --> A_Preparar: Regularizar carrito en mostrador (Ajusta cantidad física o borra ítem)
    Incompleto --> Descartado: Cliente desiste de la compra ante el faltante

    %% Expiración Universal por Garbage Collection (C-13 / C-14)
    Preparando --> Descartado: Timeout GC (Abandono de preparación móvil)
    Controlando --> Descartado: Timeout GC (Abandono de control de calidad)
    Incompleto --> Descartado: Timeout GC (Sin regularizar tras ventana TTL)
    Listo_Para_Cobrar --> Descartado: Timeout GC (Cliente no se presenta a pagar)

    %% Transición a Cobro y Entrega
    Listo_Para_Cobrar --> Entregado: Cobro procesado exitosamente (estado_general = 'CONFIRMADA', estado_logistico = 'ENTREGADO')
    Listo_Para_Cobrar --> A_Preparar: Cliente solicita agregar más artículos antes de pagar

    %% Efectos secundarios (Side Effects)
    Entregado --> [*]: Side Effects: (-Stock Físico), (-Stock Reservado), Dispara Push Delta a Nube
    Descartado --> [*]: Side Effects: (-Stock Reservado), Stock Físico intacto, sin dinero en caja (100% Local)
```

---

## 3. Especificación Detallada de Cada Estado

### 1. `A_PREPARAR` (Carga y Edición en Mostrador)
- **Definición:** Estado inicial del carrito en la terminal de mostrador mientras se escanean los productos o se cargan artículos pesables.
- **Efectos en Stock:** Cada ítem agregado aplica *Soft Allocation* incrementando `PRODUCTO_SUCURSAL.stock_reservado`.
- **Salidas Válidas:**
  - `PREPARANDO`: Si el pedido se deriva a un embalador o preparador móvil con celular.
  - `LISTO_PARA_COBRAR`: Atajo de venta rápida para clientes en mostrador.
  - `DESCARTADO`: Si el cliente se retira o expira el temporizador de reserva (*Garbage Collection*). Libera `stock_reservado` sin tocar `stock_fisico`.

### 2. `PREPARANDO` (Recorrido Guiado con Focus / Highlight)
- **Definición:** El preparador abre el pedido en su celular o terminal portátil. La interfaz aplica una máscara visual (*highlight* sobre el primer ítem, opacando el resto de la pantalla) para orientar el recorrido físico en góndola.
- **Mecánica:**
  - Si el operador encuentra la cantidad total requerida, presiona **"OK"**. La UI marca el ítem como conforme y traslada automáticamente el *focus* al siguiente producto.
  - Si encuentra mercadería insuficiente o faltante, presiona **"Incompleto"**.
- **Salidas Válidas:**
  - `CONTROLANDO`: Cuando todos los ítems tienen "OK" y se solicita un segundo control cruzado.
  - `LISTO_PARA_COBRAR`: Cuando todos los ítems tienen "OK" y se finaliza la preparación directamente (o por atajo de venta rápida).
  - `INCOMPLETO`: Al presionar "Incompleto" en cualquier artículo.

### 3. `CONTROLANDO` (Segunda Revisión Guiada Opcional)
- **Definición:** Instancia de verificación independiente donde el mismo operador o un compañero revisa físicamente lo embalado antes de entregarlo a la caja.
- **Mecánica:** Idéntica a la preparación guiada con *highlight* producto por producto.
- **Salidas Válidas:**
  - `LISTO_PARA_COBRAR`: Al finalizar el control con 100% de ítems OK.
  - `INCOMPLETO`: Si el controlador detecta que un producto falta o está dañado.

### 4. `INCOMPLETO` (Bloqueo Estricto por Faltante Físico - Regla C-11)
- **Definición:** El pedido presenta una discrepancia entre lo demandado y la existencia real en salón.
- **Invariante de Seguridad:** **El sistema prohíbe terminantemente cobrar o emitir ticket en este estado.** El botón "Cobrar" permanece deshabilitado tanto en el celular como en la caja de mostrador.
- **Resolución:** El cajero debe modificar el carrito en mostrador:
  - Si el cliente acepta llevar la cantidad encontrada (ej. 4 de 5), se actualiza el renglón a 4 unidades.
  - Si no desea el ítem, se elimina del pedido.
  - Al guardar la rectificación, el carrito regresa a `A_PREPARAR`, recalculando el total y liberando el bloqueo de cobro.

### 5. `LISTO_PARA_COBRAR` (Embalaje Concluido)
- **Definición:** Toda la mercadería requerida está en bolsa / mostrador debidamente verificada.
- **Salidas Válidas:**
  - `ENTREGADO`: Al cobrar y confirmarse la venta en caja (`estado_general = 'CONFIRMADA'`).
  - `A_PREPARAR`: Si el cliente en mostrador decide agregar productos de último momento.

### 6. `ENTREGADO` (Cierre Operativo y Contable)
- **Definición:** Venta consumada, cobrada bajo el turno activo de caja (`TURNO_CAJA.id`) y entregada al cliente.
- **Efectos Secundarios:**
  - Decremento definitivo de `stock_fisico` y liberación de `stock_reservado`.
  - Inserción de métodos de pago en `PAGO_VENTA`.
  - Encolamiento para sincronización asíncrona hacia la nube (Push Delta).
