sequenceDiagram

autonumber

actor C as Cajero

participant UI as Interfaz POS (React)

participant DB as BD Local (WatermelonDB)

participant Carrito as Gestor de Estado (Zustand)

participant Motor as Motor de Promociones (Strategy)

rect rgb(240, 248, 255)

note right of C: Escaneo del 1er Ítem (No cumple promoción aún)

C->>UI: Escanea Código "Coca-Cola" (Cant: 1)

UI->>DB: Busca producto localmente

DB-->>UI: Retorna datos (Precio Normal: $1500)

UI->>Carrito: addProducto(Coca-Cola, 1)

Carrito->>Motor: recalcularTotales(itemsDelCarrito)

Motor->>DB: Busca promociones activas para "Coca-Cola"

DB-->>Motor: Retorna Promo "2x $2500" (Cant Min: 2)

Motor->>Motor: Evalúa reglas (Cant Actual = 1 < Min 2)

Motor-->>Carrito: Devuelve items sin modificar

Carrito-->>UI: Actualiza estado global

UI-->>C: Muestra Subtotal: $1500

end

rect rgb(240, 255, 240)

note right of C: Escaneo del 2do Ítem (Se activa la promoción)

C->>UI: Escanea Código "Coca-Cola" (Cant: 2)

UI->>Carrito: updateCantidad(Coca-Cola, 2)

Carrito->>Motor: recalcularTotales(itemsDelCarrito)

Motor->>Motor: Evalúa reglas (Cant Actual = 2 >= Min 2)

note right of Motor: Inyecta Strategy "Precio_Fijo"

Motor->>Motor: Aplica descuento (Total s/Promo: $3000 -> Total Promo: $2500)

Motor-->>Carrito: Devuelve items con 'id_promocion_aplicada' y 'monto_descuento'

Carrito-->>UI: Actualiza estado global

UI-->>C: Tacha precio viejo, muestra $2500 y flag "¡Promo Aplicada!"

end

rect rgb(255, 245, 238)

note right of C: Escaneo de Producto a Granel

C->>UI: Escanea Código "Pan Francés"

UI->>DB: Busca producto

DB-->>UI: Retorna datos (tipo_venta: 'PESABLE', Precio: $2000/kg)

UI->>C: Despliega modal "Ingrese Peso en KG"

C->>UI: Ingresa 0.250

UI->>Carrito: addProducto(Pan Francés, 0.250)

Carrito->>Motor: recalcularTotales()

Motor-->>Carrito: Retorna Total Pan: $500

Carrito-->>UI: Actualiza estado global

end
