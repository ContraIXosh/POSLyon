# 🧠 MEMORY.md — Estado de Construcción y Continuidad Multi-OS (Fedora ↔ Windows)

> **Propósito:** Este archivo es la memoria persistente del proyecto **POSLyon**. Permite retomar el trabajo exactamente donde se dejó al cambiar entre **Fedora Linux** y **Windows**, manteniendo el registro de los módulos construidos, la trazabilidad documental y el próximo paso inmediato.

---

## 📍 Estado Actual del Proyecto

- **Última actualización:** 2026-10-23 (Windows)
- **Repositorio Remoto GitHub:** `https://github.com/ContraIXosh/POSLyon` (Rama `main`)
- **Fase Actual:** **Nivel 0 Completado al 100% (`libs/domain-core`)** $\to$ Listo para iniciar **Nivel 1 (`apps/backend-cloud`)**
- **Últimos Pasos Completados:**
  - **Sub-módulo 0.4:** Catálogo completo de **16 DTOs con Validaciones Declarativas** (`class-validator` y `class-transformer`), decorador customizado `@IsUUIDOrNil()` (`libs/domain-core/src/validators/is-uuid-or-nil.decorator.ts`, Resolución S-03) y suite unitaria de validación (`13/13` tests aprobados).
  - **Sub-módulo 0.5:** **Servicios Puros de Dominio y Reglas Matemáticas** (`libs/domain-core/src/rules/` y `libs/domain-core/src/services/`): `MargenPreciosDomainService` (RF-15 / O-17), `DevolucionesDomainService` (RF-09 / RF-10 / C-01..C-04 / O-15 / O-19 / S-08 / S-09), `ReconciliacionDomainService` (RF-13 / C-18 / C-21 / C-23 / O-27), `RelojMonotonoGuard` (S-10 / C-13 / C-14), `ArqueoCiegoDomainService` (RF-17 / O-23), `validarMargenCredito` y `calcularMergeAditivoOCC` (RF-07 / RF-08 / C-10), `validarPuedeCobrar` y `calcularDescuentoStockPack` (C-11 / C-12 / O-26), junto con la **Suite de Tests Unitarios Nivel 1 en Jest** (`32/32` tests aprobados en total, `95.57%` de cobertura de líneas).
- **Documentos de Trazabilidad Generados (`docs/trazabilidad/`):**
  1. [`docs/trazabilidad/01-monorepo-y-nucleo-estados-pos.md`](file:///d:/Contr/Archivos/POSLyon-Monolitico/docs/trazabilidad/01-monorepo-y-nucleo-estados-pos.md) *(Anti-Patrón Novato vs. Ingeniería Profesional, RFC 4122 Nil UUID, Harel Statecharts y Type Erasure)*.
  2. [`docs/trazabilidad/02-enums-dominio-modulos.md`](file:///d:/Contr/Archivos/POSLyon-Monolitico/docs/trazabilidad/02-enums-dominio-modulos.md) *(Signed Ledger, Cierre Ciego vs. Rectificación Forense, Two-Phase Commit 2PC, Strategy Pattern y Packs)*.
  3. [`docs/trazabilidad/03-interfaces-contratos-dominio.md`](file:///d:/Contr/Archivos/POSLyon-Monolitico/docs/trazabilidad/03-interfaces-contratos-dominio.md) *(Zero-Cost Abstractions en interfaces vs clases, Price Snapshotting en VentaDetalle, Invariancia de Esquema N=1 en planes comerciales, Preservación Automática de Margen Bruto y Desacoplamiento Temporal en Devoluciones)*.
  4. [`docs/trazabilidad/04-dtos-y-validaciones-declarativas.md`](file:///d:/Contr/Archivos/POSLyon-Monolitico/docs/trazabilidad/04-dtos-y-validaciones-declarativas.md) *(Clases DTO vs Interfaces ante Type Erasure, Metaprogramación con `Reflect.metadata`, Anatomía de Bits RFC 4122 en `@IsUUIDOrNil`, Hidratación de Árboles JSON con `@ValidateNested` + `@Type`, Validación Polimórfica `@ValidateIf` e Idempotencia O-22)*.
  5. [`docs/trazabilidad/05-servicios-puros-y-reglas-dominio.md`](file:///d:/Contr/Archivos/POSLyon-Monolitico/docs/trazabilidad/05-servicios-puros-y-reglas-dominio.md) *(Arquitectura Functional Core / Imperative Shell, Prevención de Arbitraje Promocional RF-09, Compensación Mixta RF-10, Ecuación de Reconciliación C-18 y Doble Nivel de Mermas C-21, Conmutatividad del Merge Aditivo OCC C-10 y Reloj Monótono de Hardware + High Watermark S-10)*.

---

## 🗺️ Tablero de Progreso (De lo Más Desacoplado a lo Más Acoplado)

### 🧱 Nivel 0: Núcleo de Dominio Puro (`libs/domain-core`) — *Cero Acoplamiento (100% COMPLETADO)*
- [x] **0.1.** Infraestructura Monorepo + Constantes Canónicas (`UUID_ARTICULO_COMODIN`, `UUID_SYSTEM_BOT`) + Enums de Estados de Venta (`EstadoGeneral`, `EstadoLogistico`, `EstadoFinanciero`). *(Trazabilidad: `01-monorepo-y-nucleo-estados-pos.md`)*
- [x] **0.2.** Resto de Enums de Dominio (Cuentas Corrientes, Devoluciones, Inventario/Reconciliación, Turnos de Caja, Transferencias 2PC, Proveedores/Recepción y Sincronización/Auditoría/Planes). *(Trazabilidad: `02-enums-dominio-modulos.md`)*
- [x] **0.3.** Interfaces de Contratos Inmutables (`IVenta`, `IVentaDetalle`, `IConfiguracionSucursal`, `IProductoGlobal`, `IProductoSucursal`, `ICliente`, `ICuentaCorriente`, `IAuditoria`, `ISyncEngineStrategy`, etc.). *(Trazabilidad: `03-interfaces-contratos-dominio.md`)*
- [x] **0.4.** DTOs con Validaciones Declarativas (`class-validator` y `class-transformer`), decorador `@IsUUIDOrNil()` (S-03) + Pruebas Unitarias de Validación (`13/13` aprobadas). *(Trazabilidad: `04-dtos-y-validaciones-declarativas.md`)*
- [x] **0.5.** Servicios Puros de Dominio (Cálculo de Margen Preservado, Fórmulas de Reembolso Neto Promocional RF-09 y Compensación Mixta RF-10, Deducción de Stock en Reconciliación RF-13, Guardas de Reloj Monótono S-10 y Arqueo Ciego RF-17) + Suite de Tests Unitarios Nivel 1 (`jest`, `32/32` tests en verde, `95.57%` cobertura). *(Trazabilidad: `05-servicios-puros-y-reglas-dominio.md`)*

### ⚙️ Nivel 1: Infraestructura Base Backend (`apps/backend-cloud`)
- [ ] **1.1.** Bootstrap de NestJS + Conexión a PostgreSQL (Docker) con TypeORM + Validación Global (`ValidationPipe`) + Seed de Identidades de Sistema (`UUID_ARTICULO_COMODIN` y `UUID_SYSTEM_BOT` - S-03) + Endpoint de Healthcheck para probar en Postman.
- [ ] **1.2.** Entidad e Interceptor Transversal de Auditoría (`AUDITORIA`, `AuditContextInterceptor`, `AuditoriaService.ejecutarTransaccionAuditada` C-25/C-26, `OccExceptionFilter` HTTP 409).

### 🏢 Nivel 2: Módulos Maestros (Bajo Acoplamiento)
- [ ] **2.1.** Módulo Sucursales y `CONFIGURACION_SUCURSAL` (Reglas de Negocio JSONB, Feature Toggles y Planes).
- [ ] **2.2.** Módulo Seguridad, Usuarios (`USUARIO`, `USUARIO_SUCURSAL`) y Permisos Granulares (`PERMISO`, `USUARIO_PERMISO`, Bypass Dueño RF-20).
- [ ] **2.3.** Módulo Catálogo e Inventario Base (`CATEGORIA`, `PRODUCTO_GLOBAL`, `CODIGO_BARRA`, `PRODUCTO_SUCURSAL`).

### 💰 Nivel 3: Módulos Operativos y Financieros (Acoplamiento Medio)
- [ ] **3.1.** Módulo Turnos de Caja, Movimientos y Arqueo Ciego (`TURNO_CAJA`, `MOVIMIENTO_CAJA`, `METODO_PAGO`).
- [ ] **3.2.** Módulo Clientes y Cuentas Corrientes (`CLIENTE`, `CUENTA_CORRIENTE` — Patrón *Signed Ledger* y Abonos RF-08).
- [ ] **3.3.** Módulo Proveedores, Diccionario de Alias y Recepción de Mercadería (`PROVEEDOR`, `DICCIONARIO_PROVEEDOR`, `RECEPCION_MERCADERIA`).

### 🚀 Nivel 4: Módulos Orquestadores Transaccionales (Alto Acoplamiento)
- [ ] **4.1.** Módulo Core POS y Motor de Promociones (`VENTA`, `VENTA_DETALLE`, `PAGO_VENTA`, `PROMOCION` con Patrón *Strategy* y Snapshots).
- [ ] **4.2.** Módulo Devoluciones y Notas de Crédito (`NOTA_CREDITO`, `NOTA_CREDITO_DETALLE`, Compensación Mixta RF-10).
- [ ] **4.3.** Módulo Reconciliación de Códigos Huérfanos (`RF-13`), Cuarentena de Stock y Transferencias entre Sucursales (2PC).
- [ ] **4.4.** Módulo Sincronización Local-First (`SYNC_CURSOR`, Pull/Push Deltas con Cursores ISO-8601 y Resolución de Conflictos OCC).

---

## 💻 Guía Rápida al Cambiar de Sistema Operativo (Fedora ↔ Windows)

1. **Traer últimos cambios de GitHub:**
   ```bash
   git pull origin main
   ```
2. **Compilar y correr la suite de tests del Núcleo de Dominio:**
   ```bash
   npm run build:domain
   npm run test:domain
   ```
3. **Levantar Base de Datos PostgreSQL (cuando estemos en Nivel 1+):**
   ```bash
   npm run db:up
   ```
4. **Indicación para Gemini al abrir nueva sesión en otro OS:**
   > *"Hola Gemini, lee `MEMORY.md` y el último documento en `docs/trazabilidad/` para retomar desde donde dejamos."*

---

## 🎯 Próximo Paso Inmediato
- **Paso 1.1:** Iniciar el **Nivel 1 (`apps/backend-cloud`)** — Crear el proyecto NestJS dentro del workspace, conectar a PostgreSQL (Docker) mediante TypeORM, configurar el `ValidationPipe` global consumiendo `@poslyon/domain-core`, implementar el seed idempotente de identidades de sistema (`system-entities.seed.ts` - Resolución S-03), exponer el endpoint `/api/health` para verificar en Postman y documentar en `docs/trazabilidad/06-bootstrap-backend-y-conexion-postgres.md`.
