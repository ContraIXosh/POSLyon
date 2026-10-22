sequenceDiagram

autonumber

actor A as Admin A (Corrientes)

actor B as Admin B (Resistencia)

participant API as Backend (NestJS)

participant DB as PostgreSQL (Nube)

note over A, DB: Ambos leen el mismo producto casi al mismo tiempo

A->>API: GET /productos/123

API->>DB: SELECT * FROM productos WHERE id=123

DB-->>API: Retorna { precio: 1000, version: 1 }

API-->>A: Muestra UI (Versión 1)

B->>API: GET /productos/123

API->>DB: SELECT * FROM productos WHERE id=123

DB-->>API: Retorna { precio: 1000, version: 1 }

API-->>B: Muestra UI (Versión 1)

note over A, DB: Admin A guarda sus cambios primero

A->>A: Modifica precio a 1200

A->>API: PUT /productos/123 { precio: 1200, version: 1 }

API->>DB: UPDATE productos SET precio=1200, version=version+1 WHERE id=123 AND version=1

DB-->>API: Rows affected: 1 (¡Éxito!)

API-->>A: 200 OK - Guardado Correctamente

note over B, DB: Admin B intenta guardar sobre datos obsoletos

B->>B: Modifica precio a 1500

B->>API: PUT /productos/123 { precio: 1500, version: 1 }

API->>DB: UPDATE productos SET precio=1500, version=version+1 WHERE id=123 AND version=1

DB-->>API: Rows affected: 0 (No encontró version=1)

API->>API: Detecta colisión (Rows == 0)

API-->>B: 409 Conflict - "El producto fue modificado por otro usuario"

B->>API: GET /productos/123 (Recarga los datos)

API-->>B: Retorna nuevo estado { precio: 1200, version: 2 }
