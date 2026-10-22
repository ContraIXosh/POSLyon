# Diagrama de Secuencia: Gestión de Productos entre Sucursales — Escenario 2 (Clonación Masiva a Nueva Sucursal)

> **Alcance por Plan Comercial (ERS RF-15 y RF-21):** `[Exclusivo Plan Superior — plan_activo = 'SUPERIOR_CLOUD' y feature_toggles.catalogo_multisucursal = true]`. Habilita la apertura de nuevas franquicias o sucursales ($N \ge 2$) heredando el catálogo maestro existente en `PRODUCTO_GLOBAL` con `stock_fisico = 0`.

```mermaid
sequenceDiagram

autonumber

actor A as Administrador
participant F as Frontend (React)
participant B as Backend (NestJS)
participant DB as Base de Datos (PostgreSQL)

Note over A, F: Vista "Asignación Masiva a Sucursal 2"

A->>F: Selecciona 8 productos de la grilla
A->>F: Elige "Heredar Precios de Sucursal 1" y Stock "0"
A->>F: Clic en "Asignar Productos"

Note over F: Payload: Array de Asignaciones

F->>B: POST /sucursales/2/productos-masivos {<br/> items: [<br/>  { id_producto: 'uuid-1', precio: 1500, stock: 0 },<br/>  { id_producto: 'uuid-2', precio: 2000, stock: 0 }<br/>  // ... 6 más<br/> ]<br/>}

Note over B, DB: TRANSACCIÓN ATÓMICA MASIVA (Bulk Insert)

B->>DB: BEGIN TRANSACTION;

Note over B, DB: Para optimizar rendimiento, se usa un solo INSERT múltiple

B->>DB: INSERT INTO PRODUCTO_SUCURSAL <br/> (id_sucursal, id_producto, precio_minorista, stock_fisico) VALUES <br/> (2, 'uuid-1', 1500, 0),<br/> (2, 'uuid-2', 2000, 0),<br/> ... ;

B->>DB: COMMIT;

DB-->>B: OK (8 Rows affected)
B-->>F: 200 OK (Asignación Exitosa)
F-->>A: Muestra mensaje de éxito y vacía grilla
```
