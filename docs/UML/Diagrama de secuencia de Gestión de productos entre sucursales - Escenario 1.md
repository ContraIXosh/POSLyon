# Diagrama de Secuencia: Gestión de Productos entre Sucursales — Escenario 1 (Alta de Producto)

> **Alcance y Comportamiento por Plan Comercial (ERS RF-21):**
> - **En Plan Básico (`BASICO_LOCAL`, $N = 1$, `catalogo_multisucursal = false`):** El formulario en `pos-desktop` oculta los checkboxes de selección de sucursales. Al guardar, ejecuta esta misma transacción atómica (`BEGIN ... COMMIT`) directamente sobre SQLite local insertando en `PRODUCTO_GLOBAL` y auto-asignando la única sucursal local en `PRODUCTO_SUCURSAL`.
> - **En Plan Superior (`SUPERIOR_CLOUD`, $N \ge 1$, `catalogo_multisucursal = true`):** Se despliega la grilla de selección y propagación de precios entre múltiples sucursales contra PostgreSQL (`backend-cloud`), como se ilustra a continuación.

```mermaid
sequenceDiagram

autonumber

actor A as Administrador
participant F as Frontend (React)
participant B as Backend (NestJS / SQLite Local)
participant DB as Base de Datos (PostgreSQL / SQLite)

A->>F: Llena Datos Base (Coca-Cola)
A->>F: Tilda "Sucursal 1" y "Sucursal 2"
A->>F: Define Precio S1 ($1000) y Precio S2 ($1200)

Note over F: El Frontend arma un único Payload JSON

F->>B: POST /productos {<br/> global: { nombre: 'Coca-Cola', id_categoria: 5 },<br/> sucursales: [<br/>  { id_suc_fk: 1, precio: 1000, stock: 50 },<br/>  { id_suc_fk: 2, precio: 1200, stock: 0 }<br/> ]<br/>}

Note over B, DB: TRANSACCIÓN ATÓMICA DE CREACIÓN

B->>DB: BEGIN TRANSACTION;
B->>DB: 1. INSERT INTO PRODUCTO_GLOBAL (nombre, id_categoria) <br/> VALUES ('Coca-Cola', 5) RETURNING id;
DB-->>B: Retorna UUID generado (ej: 'uuid-999')

Note over B, DB: El Backend itera el array de sucursales

B->>DB: 2. INSERT INTO PRODUCTO_SUCURSAL (id_sucursal, id_producto, precio_minorista, stock_fisico) <br/> VALUES (1, 'uuid-999', 1000, 50);
B->>DB: 3. INSERT INTO PRODUCTO_SUCURSAL (id_sucursal, id_producto, precio_minorista, stock_fisico) <br/> VALUES (2, 'uuid-999', 1200, 0);
B->>DB: COMMIT;

DB-->>B: OK
B-->>F: 201 Created
```
