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

### 2.1. ¿Qué construimos y por qué en este orden? (Métrica de Estabilidad e Independencia)
En Ingeniería de Software (según Robert C. Martin en *Clean Architecture*), los paquetes de un sistema se miden por dos métricas de acoplamiento:
- **Acoplamiento Eferente ($C_e$):** Cuántos otros paquetes necesita este módulo para funcionar.
- **Acoplamiento Aferente ($C_a$):** Cuántos otros paquetes del sistema dependen de este módulo.

Comenzamos por `libs/domain-core` y específicamente por sus **Constantes y Enums Canónicos** porque tienen **$C_e = 0$ (cero dependencias externas)**. No importan NestJS, ni PostgreSQL, ni React, ni SQLite. Son **reglas puras del negocio expresadas en tipos**.

### 2.2. Anatomía Técnica: Patrones, Principios SOLID y Lenguaje

1. **Monorepo con NPM Workspaces ([`package.json`](file:///home/ContraIXosh/Documents/POSLyon/package.json)) y Path Aliases ([`tsconfig.base.json`](file:///home/ContraIXosh/Documents/POSLyon/tsconfig.base.json)):**
   - **Problema que resuelve:** Si el Backend (NestJS) y el Frontend (Electron/React) estuvieran en carpetas desconectadas, tendrías que copiar y pegar los mismos `enum` e `interface` en ambos lados. Cuando alguien agrega un estado en el backend y olvida copiarlo al frontend, el sistema falla en producción (violación del principio **DRY — Don't Repeat Yourself**).
   - **Cómo funciona:** Declarando `"workspaces": ["libs/*", "apps/*"]` en el `package.json` raíz y `"@poslyon/domain-core": ["libs/domain-core/src/index.ts"]` en `tsconfig.base.json`, tanto el servidor en la nube como la caja local importan desde `@poslyon/domain-core` como si fuera una librería oficial instalada de internet, con verificación en tiempo de compilación.

2. **Patrón *Special Case / Null Object* a Nivel de Clave Primaria (`UUID_ARTICULO_COMODIN`):**
   - **Problema que resuelve:** Cuando un cajero escanea una galletita nueva cuyo código de barras aún no fue cargado en la base de datos (`RF-12`), el sistema igual debe poder registrar la venta en `VENTA_DETALLE`. Si permitiéramos `id_producto = NULL` en la tabla `VENTA_DETALLE`, perderíamos la restricción `NOT NULL` de la clave foránea y todas las consultas SQL `INNER JOIN producto_global` descartarían silenciosamente esas ventas.
   - **Solución de Ingeniería:** Reservamos el **Nil UUID** del estándar RFC 4122 (`00000000-0000-0000-0000-000000000000`). En la base de datos existe una fila real en `PRODUCTO_GLOBAL` con ese UUID ("Artículo Comodín / Venta Rápida"). Así, la integridad referencial (`FOREIGN KEY NOT NULL`) jamás se rompe y las consultas de reconciliación (`RF-13`) encuentran todas las ventas huérfanas buscando exactamente por ese UUID indexado.

3. **Descomposición Ortogonal de Máquinas de Estado (Harel Statecharts):**
   - **Problema que resuelve (Explosión Combinatoria de Estados):** Un error muy común al diseñar una tabla `VENTA` es poner una sola columna `estado`. Pero en la vida real una venta tiene tres dimensiones independientes:
     - *Validez transaccional:* ¿Es un borrador, está confirmada, cancelada o descartada? (`EstadoGeneral` = 4 valores).
     - *Estado físico de la mercadería:* ¿Se está preparando, controlando, está incompleta, lista para cobrar o entregada? (`EstadoLogistico` = 6 valores).
     - *Situación del dinero:* ¿Está pendiente, pagada al contado, fiada o con pago mixto parcial? (`EstadoFinanciero` = 4 valores).
   - Si intentáramos meter todo en un solo `enum`, tendríamos un producto cartesiano de $4 \times 6 \times 4 = 96$ estados combinados (`CONFIRMADA_ENTREGADO_FIADO`, `CONFIRMADA_ENTREGADO_PARCIAL`, etc.), imposible de mantener.
   - **Solución:** Separamos el estado en **3 vectores ortogonales** (`EstadoGeneral`, `EstadoLogistico`, `EstadoFinanciero`). Cada servicio valida únicamente la dimensión que le compete (por ejemplo, la guarda `C-11` solo verifica `estado_logistico !== EstadoLogistico.INCOMPLETO` antes de cobrar).

### 2.3. Bitácora de Decisiones Arquitectónicas (ADR)
- **Componente / Archivos:** `libs/domain-core/src/constants/comodin.constants.ts` y `libs/domain-core/src/enums/estado-*.enum.ts`
- **Requisito SDD Vinculado:** `File-Level Specs: Módulo Core POS` (§0a, §0b, §0c) y `Módulo Inventario` (§1).
- **Decisión Tomada:** Uso de `string enums` explícitos (`BORRADOR = 'BORRADOR'`) en TypeScript en lugar de `numeric enums` por defecto (`0, 1, 2`).
- **Alternativas Descartadas y Justificación Técnica:**
  - *Alternativa A (Enums numéricos de TypeScript `enum Estado { BORRADOR, CONFIRMADA }`):* Descartado. En TypeScript, un enum sin valor asignado compila a enteros (`0, 1, 2`). Si mañana alguien inserta un estado nuevo en el medio de la lista, todos los números se corren y las filas históricas guardadas en PostgreSQL y SQLite cambiarían de significado silenciosamente.Además, al inspeccionar un JSON en Postman o una tabla SQL, leer `"CONFIRMADA"` es auto-documentado, mientras que leer `1` es ambiguo.
  - *Alternativa B (Strings sueltos sin Enum):* Descartado. Sin un `enum` compartido, un error de tipeo como `'CONFIRNADA'` pasaría inadvertido hasta fallar en ejecución.
- **Fundamento Teórico de Sistemas:** Tipado Fuerte Estático, Descomposición Ortogonal de Autómatas Finitos (Harel Statecharts) e Integridad Referencial Relacional (Codd).
- **Riesgo / Trade-off Aceptado:** Los `string` ocupan algunos bytes más en disco que un `SMALLINT` en SQL, pero en PostgreSQL/SQLite moderno y con compresión Brotli en el transporte HTTP, el impacto es despreciable frente a la ganancia crítica en legibilidad forense (`AUDITORIA`) e inmunidad ante reordenamiento de código.
