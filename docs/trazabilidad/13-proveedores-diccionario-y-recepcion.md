# **📘 Documento de Trazabilidad y Bitácora Pedagógica — Nivel 3: Paso 3.3**
## **Módulo de Proveedores, Diccionario de Alias y Recepción de Mercadería con Preservación de Markup (RF-14 / RF-15 / O-17 / O-18)**

---

### **1. Resumen Ejecutivo y Metadatos de Ingeniería**

| Atributo | Detalle de Especificación |
| :--- | :--- |
| **Módulo del Sistema** | Módulo 3: Logística de Entrada y Compras (`apps/backend-cloud/src/modules/proveedores`) |
| **Requisitos Funcionales Mapeados** | **RF-14** (Diccionario inteligente de mapeo de alias entre descripciones de factura y catálogo oficial)<br>**RF-15** (Motor de preservación matemática del margen de marcación comercial o *Markup* histórico ante aumentos de costo) |
| **Decisiones y Resoluciones Arquitectónicas** | **O-17** (Clasificación cuadrangular de discrepancias de remito: `CONFORME`, `FALTANTE`, `SOBRANTE`, `RECHAZADO_CALIDAD`)<br>**O-18** (Incondicionalidad física de inventario: únicamente la `cantidad_recibida` físicamente contada ingresa al `stock_fisico`)<br>**Unicidad Compuesta** (`UNIQUE(id_proveedor, nombre_en_factura)` para resolución de alias O(1)) |
| **Estado de Pruebas** | **11/11 Pruebas Unitarias/Integración Supertest Pasando (100%)** |
| **Cobertura Global Monorepo** | **91/91 Pruebas Pasando en 10 Suites de Test** |

---

### **2. Lección Universitaria (0 a 100): Logística de Entrada, Inflación y Preservación del Margen Comercial**

#### **2.1. El Problema de la Desincronización Semántica entre Proveedor y Comercio (RF-14)**
En los comercios minoristas y cadenas de sucursales, cada proveedor emite facturas con sus propias convenciones textuales y abreviaturas arbitrarias:
- Arcor factura: `"GALLET. CHOCOLINAS 250G X24"`
- Quilmes factura: `"STELLA ARTOIS LATA 473 CC PACK 6"`
- Molinos factura: `"FIDEOS MATARAZZO TIRABUZON 500G"`

En los sistemas tradicionales, el operario de depósito debe buscar manualmente el producto en el catálogo cada vez que llega un camión. Esto genera:
1. Tiempos muertos inaceptables durante la descarga de mercadería.
2. Errores humanos de imputación (cargar stock a una variedad equivocada).
3. Creación accidental de productos duplicados.

**La Solución Arquitectónica: La Tabla `DICCIONARIO_PROVEEDOR` (RF-14)**
Mediante una restricción de unicidad compuesta `UNIQUE(id_proveedor, nombre_en_factura)`, el sistema aprende en el primer remito la asociación entre el texto exacto de la factura y el `id_producto_global` oficial. En las recepciones posteriores, el sistema auto-resuelve el vínculo en $O(1)$ sin intervención manual.

#### **2.2. El Motor de Preservación de Markup ante la Inflación (RF-15)**
Cuando un proveedor incrementa el costo de reposición de un producto (por ejemplo de \$500 a \$600), ¿cómo debe reaccionar el Punto de Venta?
Si el sistema mantiene el precio de venta fijo, el margen de ganancia se erosiona. Si el comerciante debe recalcular manualmente los precios de 500 artículos tras cada entrega, la tarea es inviable.

**Definición Matemática del Markup:**
$$\text{Markup Histórico} = \frac{\text{precio\_minorista\_anterior} - \text{costo\_anterior}}{\text{costo\_anterior}}$$

**Ejemplo Práctico:**
- Costo anterior = \$500,00
- Precio de venta minorista anterior = \$750,00
- Margen de Marcación (*Markup*) = $\frac{750 - 500}{500} = 0,50$ (50%)
- Nuevo Costo Unitario facturado = \$600,00
- **Precio Minorista Sugerido:**
$$\text{precio\_sugerido} = \text{round}\left(600 \times (1 + 0,50)\right) = \$900,00$$

El motor calcula este valor en memoria durante la carga del remito. Si el encargado confirma con `aplicar_precio_sugerido = true`, la base de datos actualiza atómicamente `PRODUCTO_SUCURSAL.precio_minorista`, protegiendo la rentabilidad del negocio sin fricción.

#### **2.3. La Regla de Oro del Inventario Físico (Resolución O-18)**
Si la factura declara 20 bultos pero al abrir el camión el operario cuenta solo 18:
- **`cantidad_declarada`:** 20 (queda registrada para reclamo comercial o nota de débito al proveedor).
- **`cantidad_recibida`:** 18.
- **`stock_fisico`:** Se incrementa en **exactamente +18**. Jamás se incrementa en 20 con un ajuste ficticio posterior. Lo que no está en la estantería física no puede figurar en el inventario disponible para la venta.

---

### **3. Especificación Formal de Arquitectura y UML**

#### **3.1. Diagrama de Entidad-Relación (ERD) — Proveedores y Recepción de Mercadería**

```mermaid
erDiagram
    PROVEEDOR ||--o{ DICCIONARIO_PROVEEDOR : "posee alias de facturas"
    PROVEEDOR ||--o{ RECEPCION_MERCADERIA : "emite remitos"
    PRODUCTO_GLOBAL ||--o{ DICCIONARIO_PROVEEDOR : "mapea a producto oficial"
    PRODUCTO_GLOBAL ||--o{ RECEPCION_MERCADERIA_DETALLE : "contiene producto"
    SUCURSAL ||--o{ RECEPCION_MERCADERIA : "recibe en sucursal"
    USUARIO ||--o{ RECEPCION_MERCADERIA : "recepciona operario"
    RECEPCION_MERCADERIA ||--|{ RECEPCION_MERCADERIA_DETALLE : "compuesta por renglones"

    PROVEEDOR {
        uuid id PK "UUIDv4 identificador global"
        varchar razon_social "Denominación legal / Nombre fantasía"
        varchar cuit UK "Identificador fiscal único (CUIT / RUT)"
        varchar contacto_telefono "Teléfono de ventas"
        varchar contacto_email "Email para envío de órdenes"
        boolean activo "Flag de Soft Delete"
        timestamptz created_at "Creación UTC"
        timestamptz updated_at "Última mutación UTC"
        timestamptz deleted_at "Marca de baja lógica"
    }

    DICCIONARIO_PROVEEDOR {
        uuid id PK "UUIDv4 identificador"
        uuid id_proveedor FK "Proveedor emisor del comprobante"
        uuid id_producto FK "Producto global oficial mapeado"
        varchar nombre_en_factura "Texto exacto impreso en factura (UK Compuesta)"
        timestamptz created_at "Creación UTC"
    }

    RECEPCION_MERCADERIA {
        uuid id PK "UUIDv4 identificador de remito"
        uuid id_sucursal FK "Sucursal destino del lote"
        uuid id_proveedor FK "Proveedor despachante"
        uuid id_usuario FK "Operador receptor en depósito"
        varchar numero_remito "Identificador externo de factura/remito"
        varchar estado "BORRADOR | EN_REVISION | CONFIRMADA | RECHAZADA"
        int total_bultos "Suma consolidada de bultos recibidos"
        timestamptz fecha_inicio "Inicio del proceso de conteo"
        timestamptz fecha_completado "Cierre inmutable UTC"
        int version "Control de Concurrencia Optimista (OCC)"
    }

    RECEPCION_MERCADERIA_DETALLE {
        uuid id PK "UUIDv4 identificador de renglón"
        uuid id_recepcion_mercaderia FK "Cabecera de remito"
        uuid id_producto FK "Producto oficial en recepción"
        numeric cantidad_declarada "Cantidad facturada externamente"
        numeric cantidad_recibida "Cantidad física real contada (O-18)"
        numeric costo_unitario "Nuevo costo de compra pactado"
        numeric costo_anterior "Snapshot del costo de reposición previo"
        numeric precio_venta_sugerido "Precio calculado preservando Markup (RF-15)"
        boolean aplicar_precio_sugerido "Toggle para actualizar precio_minorista"
        varchar estado_discrepancia "CONFORME | FALTANTE | SOBRANTE | RECHAZADO_CALIDAD"
    }
```

#### **3.2. Diagrama de Secuencia: Recepción de Mercadería, Conteo y Cierre Transaccional (ACID / O-18)**

```mermaid
sequenceDiagram
    autonumber
    actor Camion as Proveedor (Transporte)
    actor Operario as Operario de Depósito
    participant Web as Terminal Depósito (Frontend)
    participant Ctrl as ProveedoresController
    participant Svc as ProveedoresService
    participant Domain as MargenPreciosDomainService
    participant Audit as AuditoriaService (ACID)
    participant BD as PostgreSQL (Cloud / Core)

    Camion->>Operario: Entrega mercadería con Factura/Remito "REM-45231"
    Operario->>Web: Carga cabecera (Proveedor Arcor, Remito REM-45231)
    Web->>Ctrl: POST /api/proveedores/recepciones { id_sucursal, id_proveedor, numero_remito }
    Ctrl->>Svc: iniciarRecepcion(dto, auditCtx)
    Svc->>BD: INSERT INTO recepcion_mercaderia (estado: BORRADOR, version: 1)
    
    Operario->>Web: Agrega renglón "GALLETITAS CHOCOLINAS 250G", Decl: 20 un, Costo: $600
    Web->>Ctrl: POST /api/proveedores/recepciones/:id/renglones
    Ctrl->>Svc: agregarRenglonRecepcion(id, dto, auditCtx)
    Svc->>BD: SELECT precio_costo, precio_minorista FROM producto_sucursal (Costo: 500, Minorista: 750)
    Svc->>Domain: calcular(costoAnterior: 500, precioAnterior: 750, costoNuevo: 600)
    Note over Domain: Markup = (750-500)/500 = 50%<br>precio_sugerido = 600 * 1.50 = $900
    Svc->>BD: INSERT INTO recepcion_mercaderia_detalle (costo: 600, precio_sugerido: 900, ...)
    Svc->>BD: ON CONFLICT DO UPDATE en diccionario_proveedor (RF-14)
    
    Note over Operario: El operario cuenta físicamente en tarimas y detecta 18 unidades (faltan 2)
    Operario->>Web: Confirmar recepción con cantidad_recibida = 18 y aplicar_precio = true
    Web->>Ctrl: POST /api/proveedores/recepciones/:id/confirmar { renglones: [{ id, cant: 18, aplicar: true }] }
    Ctrl->>Svc: confirmarRecepcion(id, dto, auditCtx)
    
    Svc->>Audit: ejecutarTransaccionAuditada(RECEPCION_MERCADERIA, id)
    Audit->>BD: BEGIN TRANSACTION
    Audit->>Domain: evaluarDiscrepanciaRecepcion(declarada: 20, recibida: 18)
    Note over Domain: 18 < 20 -> EstadoDiscrepanciaItem.FALTANTE
    
    Audit->>BD: UPDATE recepcion_mercaderia_detalle SET cantidad_recibida = 18, estado = FALTANTE
    Audit->>BD: UPDATE producto_sucursal SET stock_fisico = stock_fisico + 18, precio_costo = 600, precio_minorista = 900
    Note over BD: Resolución O-18: Solo entran los 18 bultos reales al stock físico<br>Resolución RF-15: El precio de venta se actualiza automáticamente a $900
    
    Audit->>BD: UPDATE recepcion_mercaderia SET estado = CONFIRMADA, total_bultos = 18, version = 2
    Audit->>BD: INSERT INTO auditoria (accion: CAMBIO_PRECIO_POR_RECEPCION, ...)
    Audit->>BD: COMMIT
    
    Ctrl-->>Web: HTTP 200 OK (Remito Confirmado)
    Web-->>Operario: Comprobante de discrepancia impreso (Faltante 2 un) y stock disponible
```

---

### **4. Matriz de Trazabilidad Bidireccional (Código ↔ Arquitectura)**

| Requisito / Invariante | Entidad / DTO de Entrada | Componente / Archivo de Implementación | Líneas Clave | Verificación en Tests |
| :--- | :--- | :--- | :--- | :--- |
| **RF-14 (Catálogo Proveedores)** | `CrearProveedorDto`, `ActualizarProveedorDto` | [`ProveedorEntity`](file:///d:/Contr/Archivos/POSLyon-Monolitico/apps/backend-cloud/src/modules/proveedores/entities/proveedor.entity.ts) | L20-L55 | Test 1, Test 2, Test 3 |
| **RF-14 (Diccionario de Alias)** | `VincularDiccionarioDto` | [`DiccionarioProveedorEntity`](file:///d:/Contr/Archivos/POSLyon-Monolitico/apps/backend-cloud/src/modules/proveedores/entities/diccionario-proveedor.entity.ts) | L15-L45 | Test 6, Test 7 |
| **RF-14 (Upsert Semántico)** | `nombre_en_factura` | [`ProveedoresService.vincularDiccionario`](file:///d:/Contr/Archivos/POSLyon-Monolitico/apps/backend-cloud/src/modules/proveedores/services/proveedores.service.ts#L250-L280) | L250-L280 | Test 6 |
| **RF-15 (Markup Histórico)** | `AgregarRenglonRecepcionDto` | [`MargenPreciosDomainService.calcular`](file:///d:/Contr/Archivos/POSLyon-Monolitico/libs/domain-core/src/services/margen-precios.domain-service.ts#L10-L53) | L10-L53 | Test 9 |
| **O-17 (Discrepancia Faltante/Sobrante)** | Comparación declarada vs recibida | [`MargenPreciosDomainService.evaluarDiscrepanciaRecepcion`](file:///d:/Contr/Archivos/POSLyon-Monolitico/libs/domain-core/src/services/margen-precios.domain-service.ts#L59-L74) | L59-L74 | Test 10, Test 11 |
| **O-18 (Solo lo Físico Entra al Stock)** | `cantidad_recibida` | [`ProveedoresService.confirmarRecepcion`](file:///d:/Contr/Archivos/POSLyon-Monolitico/apps/backend-cloud/src/modules/proveedores/services/proveedores.service.ts#L525-L560) | L525-L560 | Test 10 |
| **Soft Delete Protegido** | Regla de borrado lógico | [`ProveedoresService.eliminarProveedor`](file:///d:/Contr/Archivos/POSLyon-Monolitico/apps/backend-cloud/src/modules/proveedores/services/proveedores.service.ts#L190-L240) | L190-L240 | Test 5 |

---

### **5. Arquitectura de Decisión (ADRs del Módulo)**

#### **ADR-015: Aprendizaje Continuo en Recepción de Mercadería mediante Diccionario de Alias**
- **Contexto:** En la distribución minorista de productos de consumo masivo, las facturas electrónicas de proveedores mayoristas contienen descripciones muy diversas que no coinciden con las etiquetas de góndola del comercio.
- **Alternativas Evaluadas:**
  1. *Exigir que el comercio renombre sus productos para que coincidan con la factura:* Descartada porque cada proveedor llama al mismo producto de manera distinta.
  2. *Diccionario de Alias desacoplado (`DICCIONARIO_PROVEEDOR`) con auto-aprendizaje en la carga de remito:* **Elegida.** Al agregar un renglón en recepción indicando `nombre_en_factura`, el sistema persiste automáticamente el alias en base de datos.
- **Consecuencias:** En la próxima recepción de ese proveedor, el sistema sugiere inmediatamente el producto oficial, reduciendo el tiempo de descarga en más de un 80%.

#### **ADR-016: Transaccionalidad Indivisible en la Confirmación de Remitos (ACID)**
- **Contexto:** El proceso de confirmación de un remito involucra múltiples operaciones críticas simultáneas: actualizar el estado de la recepción, recalcular discrepancias de bultos, sumar unidades al inventario físico de la sucursal, actualizar costos y modificar precios de venta al público.
- **Alternativas Evaluadas:**
  1. *Procesamiento asíncrono desacoplado en background:* Descartada porque crearía una ventana de inconsistencia temporal donde el operario ve el remito confirmado pero el cajero no puede vender los productos en mostrador.
  2. *Transacción ACID atómica en un bloque `BEGIN ... COMMIT` unificado:* **Elegida.** Toda la mutación de inventario, precios y auditoría forense (`AccionAuditoria.CAMBIO_PRECIO_POR_RECEPCION`) se consolida indivisiblemente. Si cualquier renglón falla, el remito permanece en borrador sin impacto colateral.

---

### **6. Guía de Pruebas con Postman / Curl**

#### **6.1. Alta de Proveedor Comercial**
```bash
curl -X POST http://localhost:3000/api/proveedores \
  -H "Content-Type: application/json" \
  -H "x-user-id: 550e8400-e29b-41d4-a716-446655440000" \
  -H "x-audit-reason: Alta de proveedor mayorista" \
  -d '{
    "razon_social": "Molinos Rio de la Plata S.A.",
    "cuit": "30-50085862-8",
    "contacto_telefono": "+541143401000",
    "contacto_email": "pedidos@molinos.com.ar"
  }'
```

#### **6.2. Iniciar Orden de Recepción de Mercadería**
```bash
curl -X POST http://localhost:3000/api/proveedores/recepciones \
  -H "Content-Type: application/json" \
  -H "x-user-id: 550e8400-e29b-41d4-a716-446655440000" \
  -d '{
    "id_sucursal": "550e8400-e29b-41d4-a716-446655440080",
    "id_proveedor": "550e8400-e29b-41d4-a716-446655440081",
    "id_usuario": "550e8400-e29b-41d4-a716-446655440083",
    "numero_remito": "REM-0002-00019842"
  }'
```

#### **6.3. Carga de Renglón con Cálculo de Markup y Auto-registro de Alias**
```bash
curl -X POST http://localhost:3000/api/proveedores/recepciones/550e8400-e29b-41d4-a716-446655440084/renglones \
  -H "Content-Type: application/json" \
  -H "x-user-id: 550e8400-e29b-41d4-a716-446655440000" \
  -d '{
    "id_recepcion_mercaderia": "550e8400-e29b-41d4-a716-446655440084",
    "id_producto": "550e8400-e29b-41d4-a716-446655440082",
    "cantidad_declarada": 50,
    "costo_unitario": 800.00,
    "nombre_en_factura": "MATARAZZO TIRABUZON 500G"
  }'
```

#### **6.4. Confirmación Atómica de Remito en Depósito**
```bash
curl -X POST http://localhost:3000/api/proveedores/recepciones/550e8400-e29b-41d4-a716-446655440084/confirmar \
  -H "Content-Type: application/json" \
  -H "x-user-id: 550e8400-e29b-41d4-a716-446655440000" \
  -d '{
    "id_recepcion": "550e8400-e29b-41d4-a716-446655440084",
    "renglones": [
      {
        "id_detalle": "550e8400-e29b-41d4-a716-446655440085",
        "cantidad_recibida": 48,
        "aplicar_precio_sugerido": true
      }
    ]
  }'
```

---
*Fin del documento de trazabilidad de Paso 3.3.*
