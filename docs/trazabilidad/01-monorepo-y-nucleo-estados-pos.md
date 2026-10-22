# 🧭 Reporte de Trazabilidad e Ingeniería: 01 — Infraestructura Monorepo, Constantes de Dominio y Máquina de Estados Ortogonal de Venta

> **Fecha:** 2026-10-22  
> **Nivel de Acoplamiento:** Nivel 0 — Núcleo de Dominio Puro (`libs/domain-core`, Acoplamiento Eferente $C_e = 0$)  
> **Estado:** Implementado y Verificado

---

## 1. 🔗 Matriz de Trazabilidad Bidireccional (De la Especificación al Código)

| Requisito (ERS) | Entidad / Campo (ERD) | Diagrama UML (Secuencia / Estado) | File-Level Spec | Archivo y Símbolo Implementado |
| :--- | :--- | :--- | :--- | :--- |
| **Arquitectura General (Sección 2.1)** — Monorepo Local-First + Backend Cloud | Todas las entidades (Base compartida de tipos) | Topología de Planes (`plan_arquitectura_planes_sucursal.md` §3.1) | `Especificaciones de implementación y código POSLyon` (§1 Plano de Archivos) | [`package.json`](file:///home/ContraIXosh/Documents/POSLyon/package.json), [`tsconfig.base.json`](file:///home/ContraIXosh/Documents/POSLyon/tsconfig.base.json), [`libs/domain-core/package.json`](file:///home/ContraIXosh/Documents/POSLyon/libs/domain-core/package.json) |
| **RF-12** (Venta Rápida / Artículo Comodín) y **RF-13** (Reconciliación) | `PRODUCTO_GLOBAL.id` (PK UUIDv4) y `VENTA_DETALLE.id_producto` (FK UUIDv4) | `Diagrama de Actividad_ Resolución de Creación Offline_ El _Producto Comodín_.md` | `File-Level Specs_ Módulo Inventario...` (§1 `comodin.constants.ts`) | [`comodin.constants.ts`](file:///home/ContraIXosh/Documents/POSLyon/libs/domain-core/src/constants/comodin.constants.ts) (`UUID_ARTICULO_COMODIN`) |
| **RF-07** (Alerta Post-Sync) y **RF-02** (Auditoría Automática) | `AUDITORIA.id_usuario` (FK UUIDv4) | `Diagrama de Secuencia Flujo de Sincronización Local-First...md` | `File-Level Specs_ Módulo Inventario...` (§1 `comodin.constants.ts`) | [`comodin.constants.ts`](file:///home/ContraIXosh/Documents/POSLyon/libs/domain-core/src/constants/comodin.constants.ts) (`UUID_SYSTEM_BOT`) |
| **RF-03** (Reserva Dinámica y Propagación LAN / Cloud) | `VENTA.estado_general` (`string`) | `Diagrama de Máquina de Estados de Venta.md` y `Ciclo de Vida del Carrito.md` | `File-Level Specs_ Módulo Core POS.md` (§0a `estado-general.enum.ts`) | [`estado-general.enum.ts`](file:///home/ContraIXosh/Documents/POSLyon/libs/domain-core/src/enums/estado-general.enum.ts) (`EstadoGeneral`) |
| **RF-02 / Regla C-11** (Bloqueo Estricto de Cobro en Estado Incompleto) | `VENTA.estado_logistico` (`string`) | `Diagrama de Máquina de Estados de Venta.md` (Sub-máquina Logística) | `File-Level Specs_ Módulo Core POS.md` (§0b `estado-logistico.enum.ts`) | [`estado-logistico.enum.ts`](file:///home/ContraIXosh/Documents/POSLyon/libs/domain-core/src/enums/estado-logistico.enum.ts) (`EstadoLogistico`) |
| **RF-05** (Pagos Mixtos) y **RF-07** (Ventas Fiadas) | `VENTA.estado_financiero` (`string`) | `Diagrama de Secuencia de Flujo de Pago Mixto (Abono Rápido + Fiado).md` | `File-Level Specs_ Módulo Core POS.md` (§0c `estado-financiero.enum.ts`) | [`estado-financiero.enum.ts`](file:///home/ContraIXosh/Documents/POSLyon/libs/domain-core/src/enums/estado-financiero.enum.ts) (`EstadoFinanciero`) |

---

## 2. 🎓 Cátedra de Ingeniería de Sistemas (Explicación de 0 a 100)

### 2.1. ¿Qué es el Acoplamiento Eferente ($C_e$) y por qué empezamos por `libs/domain-core`?
En Arquitectura de Software (según Robert C. Martin en *Clean Architecture*), los paquetes de un sistema se miden por dos métricas de acoplamiento y dos principios rectores:
- **Principio de Dependencias Acíclicas (ADP - Acyclic Dependencies Principle):** El grafo de dependencias entre paquetes no puede tener ciclos.
- **Principio de Dependencias Estables (SDP - Stable Dependencies Principle):** Los módulos que cambian con frecuencia deben depender de los módulos más estables.
- **Acoplamiento Eferente ($C_e$):** Cuántos otros paquetes necesita este módulo para funcionar.
- **Acoplamiento Aferente ($C_a$):** Cuántos otros paquetes del sistema dependen de este módulo.

Comenzamos por [`libs/domain-core`](file:///home/ContraIXosh/Documents/POSLyon/libs/domain-core/src/index.ts) y específicamente por sus **Constantes y Enums Canónicos** porque tienen **$C_e = 0$ (cero dependencias externas)**. No saben si la base de datos es PostgreSQL o SQLite, ni si la interfaz es Postman, React o una app móvil.
- **❌ El Mal Diseño (Enfoque Novato):** Crear carpetas separadas `backend/` y `frontend/`, y copiar/pegar las mismas enumeraciones e interfaces en ambos proyectos. Cuando alguien agrega un estado en el backend y olvida actualizar el frontend, el sistema falla silenciosamente en producción (violación del principio **DRY — Don't Repeat Yourself**).
- **✅ El Diseño de Ingeniería (Monorepo con NPM Workspaces + Path Aliases):** Declarando `"workspaces": ["libs/*", "apps/*"]` en [`package.json`](file:///home/ContraIXosh/Documents/POSLyon/package.json) y `"@poslyon/domain-core": ["libs/domain-core/src/index.ts"]` en [`tsconfig.base.json`](file:///home/ContraIXosh/Documents/POSLyon/tsconfig.base.json), tanto el servidor en la nube como la caja local importan desde `@poslyon/domain-core` como una única fuente de verdad verificada en tiempo de compilación.

---

### 2.2. Anatomía Técnica: Patrones, Principios SOLID, Anti-Patrones y Estándares

#### A. ¿Por qué existe `UUID_ARTICULO_COMODIN = '00000000-0000-0000-0000-000000000000'`? ([`comodin.constants.ts`](file:///home/ContraIXosh/Documents/POSLyon/libs/domain-core/src/constants/comodin.constants.ts))
Imagina que un cliente llega a la caja con un producto nuevo que el proveedor entregó hace 5 minutos y todavía nadie cargó en el sistema (**Requisito RF-12: Venta Rápida / Artículo Comodín**).
- **❌ El Mal Diseño (Enfoque Novato):** Hacer que la columna `id_producto` en la tabla `VENTA_DETALLE` permita valores nulos (`NULLABLE`).
  - *¿Por qué es peligroso?* Porque debilita la **Integridad Referencial Relacional** (Modelo Relacional de E. F. Codd). Si un programador escribe un reporte contable con `SELECT ... FROM venta_detalle INNER JOIN producto_global ON ...`, todas las filas donde `id_producto IS NULL` **desaparecen silenciosamente** del cálculo de recaudación a menos que todos recuerden usar `LEFT JOIN` en cada consulta SQL del sistema. Además, en varios motores SQL, los índices sobre valores `NULL` se comportan de manera inconsistente.
- **✅ El Diseño de Ingeniería (Patrón *Special Case* de Martin Fowler + RFC 4122 Nil UUID):**
  - El estándar internacional de identificadores universales (**IETF RFC 4122**, sección 4.1.7) reserva formalmente el UUID de 128 bits en cero (`00000000-0000-0000-0000-000000000000`) como **Nil UUID**.
  - Aplicando el patrón *Special Case / Null Object* a nivel de base de datos, insertamos en la tabla maestra `PRODUCTO_GLOBAL` un registro real e inmutable con ese ID exacto ("Artículo Comodín / Venta Rápida").
  - **Resultado:** La columna `VENTA_DETALLE.id_producto` mantiene su restricción estricta `NOT NULL` con `FOREIGN KEY`, ningún `INNER JOIN` pierde ventas, y el módulo de Reconciliación (`RF-13`) encuentra instantáneamente todos los productos huérfanos haciendo `WHERE id_producto = '00000000-0000-0000-0000-000000000000'`.
  - De igual forma, `UUID_SYSTEM_BOT = '00000000-0000-0000-0000-000000000001'` permite que la tabla `AUDITORIA` mantenga `id_usuario NOT NULL` incluso cuando una alerta forense es disparada automáticamente por un proceso desatendido (como un exceso de límite de crédito detectado post-sincronización en `RF-07`).

#### B. Descomposición Ortogonal de Estados (Teoría de Autómatas y Harel Statecharts) en `VENTA`
Observa los tres archivos enum que creamos:
1. [`EstadoGeneral`](file:///home/ContraIXosh/Documents/POSLyon/libs/domain-core/src/enums/estado-general.enum.ts): `BORRADOR` | `CONFIRMADA` | `CANCELADA` | `DESCARTADO`
2. [`EstadoLogistico`](file:///home/ContraIXosh/Documents/POSLyon/libs/domain-core/src/enums/estado-logistico.enum.ts): `A_PREPARAR` | `PREPARANDO` | `CONTROLANDO` | `INCOMPLETO` | `LISTO_PARA_COBRAR` | `ENTREGADO`
3. [`EstadoFinanciero`](file:///home/ContraIXosh/Documents/POSLyon/libs/domain-core/src/enums/estado-financiero.enum.ts): `PENDIENTE` | `PAGADO` | `FIADO` | `PARCIAL`

- **❌ El Mal Diseño (Enfoque Novato — Autómata Finito Plano con Explosión Combinatoria):**
  - Crear una única columna `estado` en la tabla `VENTA`.
  - *¿Por qué colapsa?* En **Teoría de Autómatas**, cuando una entidad posee dimensiones de comportamiento concurrentes e independientes (su validez en base de datos, dónde está físicamente la mercadería y cómo se pagó), unificarlas en un solo Autómata Finito Determinista (AFD) plano obliga a construir el **producto cartesiano** de los estados: $4 \times 6 \times 4 = 96$ estados combinados (`CONFIRMADA_ENTREGADO_FIADO`, `CONFIRMADA_ENTREGADO_PARCIAL`, `BORRADOR_INCOMPLETO_PENDIENTE`, etc.). Cualquier condicional `if` se vuelve inmanejable.
- **✅ El Diseño de Ingeniería (Regiones Ortogonales / Harel Statecharts):**
  - David Harel introdujo los **Statecharts con Regiones Ortogonales (AND-states)** para resolver exactamente este problema en sistemas reactivos. Separamos el estado de la venta en **3 máquinas de estado ortogonales**:
    - El motor de sincronización solo evalúa `EstadoGeneral` (solo viajan a la nube `CONFIRMADA` y `CANCELADA`; `BORRADOR` y `DESCARTADO` son 100% locales).
    - El bloqueo de caja por faltante físico (**Regla C-11**) solo evalúa `EstadoLogistico` (`if (estado_logistico === EstadoLogistico.INCOMPLETO) throw ...`).
    - El libro mayor de Cuenta Corriente solo evalúa `EstadoFinanciero` (`FIADO` o `PARCIAL`).

#### C. ¿Por qué [`tsconfig.base.json`](file:///home/ContraIXosh/Documents/POSLyon/tsconfig.base.json) activa `emitDecoratorMetadata` y `experimentalDecorators`? (Type Erasure vs. Reflexión)
En [`tsconfig.base.json`](file:///home/ContraIXosh/Documents/POSLyon/tsconfig.base.json#L8-L9) configuramos:
```json
"emitDecoratorMetadata": true,
"experimentalDecorators": true
```
- **Fundamento de Compiladores:** TypeScript aplica por defecto **Borrado de Tipos (*Type Erasure*)**: cuando compila `.ts` a `.js`, todas las interfaces y tipos desaparecen porque el motor V8 de Node.js solo entiende JavaScript.
- Sin embargo, en nuestro backend utilizaremos **Metaprogramación Declarativa y Reflexión en Tiempo de Ejecución (*Runtime Reflection*)** a través de decoradores (`@IsUUID()`, `@Column()`, `@Injectable()`).
- Al activar `experimentalDecorators` y `emitDecoratorMetadata`, el compilador de TypeScript inyecta metadatos de tipos en el código JavaScript resultante (`Reflect.metadata`), permitiendo que **NestJS** resuelva el contenedor de **Inversión de Control (IoC)**, que **TypeORM** mapee columnas a PostgreSQL y que **class-validator** rechace payloads inválidos en Postman automáticamente.

---

### 2.3. Bitácora de Decisiones Arquitectónicas (ADR)
- **Componente / Archivos:** `libs/domain-core/src/constants/comodin.constants.ts` y `libs/domain-core/src/enums/estado-*.enum.ts`
- **Requisito SDD Vinculado:** `File-Level Specs: Módulo Core POS` (§0a, §0b, §0c) y `Módulo Inventario` (§1).
- **Decisión Tomada:** Uso de `string enums` explícitos (`BORRADOR = 'BORRADOR'`) en TypeScript en lugar de `numeric enums` por defecto (`0, 1, 2`).
- **Alternativas Descartadas y Justificación Técnica:**
  - *Alternativa A (Enums numéricos de TypeScript `enum Estado { BORRADOR, CONFIRMADA }`):* Descartado. En TypeScript, un enum sin valor asignado compila a enteros (`0, 1, 2`). Si mañana alguien inserta un estado nuevo en el medio de la lista, todos los números se desplazan y las filas históricas guardadas en PostgreSQL y SQLite cambiarían de significado silenciosamente (corrupción semántica de datos). Además, al inspeccionar un JSON en Postman o una tabla SQL, leer `"CONFIRMADA"` es auto-documentado, mientras que leer `1` es opaco.
  - *Alternativa B (Strings literales sueltos sin Enum):* Descartado. Sin un `enum` nominal compartido, un error de tipeo como `'CONFIRNADA'` pasaría inadvertido hasta fallar en producción.
- **Fundamento Teórico de Sistemas:** Tipado Fuerte Estático, Descomposición Ortogonal de Autómatas Finitos (Harel Statecharts), Estándar IETF RFC 4122 (Nil UUID) e Integridad Referencial Relacional (Codd).
- **Riesgo / Trade-off Aceptado:** Los `VARCHAR` ocupan algunos bytes más en almacenamiento que un `SMALLINT` en SQL, pero en PostgreSQL/SQLite moderno y con compresión Brotli en el transporte HTTP, el costo es despreciable frente a la ganancia crítica en legibilidad forense (`AUDITORIA`) e inmunidad ante refactorizaciones.
