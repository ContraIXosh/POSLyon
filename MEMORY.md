# 🧠 MEMORY.md — Estado de Construcción y Continuidad Multi-OS (Fedora ↔ Windows)

> **Propósito:** Este archivo es la memoria persistente del proyecto **POSLyon**. Permite retomar el trabajo exactamente donde se dejó al cambiar entre **Fedora Linux** y **Windows**, manteniendo el registro de los módulos construidos, la trazabilidad documental y el próximo paso inmediato.

---

## 📍 Estado Actual del Proyecto

- **Última actualización:** 2026-10-23 (Windows)
- **Repositorio Remoto GitHub:** `https://github.com/ContraIXosh/POSLyon` (Rama `main`)
- **Fase Actual:** **Nivel 0 y Nivel 1 Completados al 100%** · **Nivel 2 (Módulos Maestros) Completado al 100%** $\to$ Listo para iniciar **Nivel 3 (Módulos Operativos y Financieros)**
- **Últimos Pasos Completados:**
  - **Sub-módulo 1.2:** **Módulo Transversal de Auditoría e Inmutabilidad** (`AuditoriaEntity` con snapshots JSONB, `AuditContextInterceptor` capturando metadata HTTP y motivo, `AuditoriaService.ejecutarTransaccionAuditada` con atomicidad ACID incondicional C-25/C-26 y `OccExceptionFilter` transformando colisiones a HTTP 409 Conflict). *(Trazabilidad: `07-auditoria-transaccional-y-occ.md`)*.
  - **Sub-módulo 2.1:** **Módulo Sucursales y `CONFIGURACION_SUCURSAL`** (Invariancia de esquema $N=1$ RF-21, relación One-to-One, reglas comerciales y feature toggles en JSONB, política de stock permisivo `UNIVERSAL_PERMISIVO` C-12, alta atómica auditada y Soft Delete). *(Trazabilidad: `08-modulo-sucursales-y-configuracion.md`)*.
  - **Sub-módulo 2.2:** **Módulo Seguridad, Usuarios y Control PBAC** (Capacidades atómicas `PERMISO`, Grafo Acíclico Dirigido DAG de dependencias RF-20, Bypass irrestricto del Dueño `es_dueno = true`, asignaciones por sucursal `USUARIO_SUCURSAL` y `USUARIO_PERMISO`, derivación segura de contraseñas con `scrypt` KDF y `PermisosGuard`). *(Trazabilidad: `09-seguridad-usuarios-y-permisos-pbac.md`)*.
  - **Sub-módulo 2.3:** **Módulo Catálogo e Inventario Base** (Desacoplamiento ontológico central `PRODUCTO_GLOBAL` vs. físico por tienda `PRODUCTO_SUCURSAL`, códigos de barra 1:N `CODIGO_BARRA`, ajuste manual permisivo de existencias con soporte de negativos C-12, control OCC y endpoints de búsqueda por código de barra). *(Trazabilidad: `10-catalogo-e-inventario-base.md`)*.
  - **Suite Automatizada de Pruebas Monorepo:** **`7 Test Suites Passed`, `62 Tests Passed`** (`100%` en verde en Jest + Supertest).
- **Documentos de Trazabilidad Generados (`docs/trazabilidad/`):**
  1. [`docs/trazabilidad/01-monorepo-y-nucleo-estados-pos.md`](file:///d:/Contr/Archivos/POSLyon-Monolitico/docs/trazabilidad/01-monorepo-y-nucleo-estados-pos.md) *(Anti-Patrón Novato vs. Ingeniería Profesional, RFC 4122 Nil UUID, Harel Statecharts y Type Erasure)*.
  2. [`docs/trazabilidad/02-enums-dominio-modulos.md`](file:///d:/Contr/Archivos/POSLyon-Monolitico/docs/trazabilidad/02-enums-dominio-modulos.md) *(Signed Ledger, Cierre Ciego vs. Rectificación Forense, Two-Phase Commit 2PC, Strategy Pattern y Packs)*.
  3. [`docs/trazabilidad/03-interfaces-contratos-dominio.md`](file:///d:/Contr/Archivos/POSLyon-Monolitico/docs/trazabilidad/03-interfaces-contratos-dominio.md) *(Zero-Cost Abstractions en interfaces vs clases, Price Snapshotting en VentaDetalle, Invariancia de Esquema N=1 en planes comerciales, Preservación Automática de Margen Bruto y Desacoplamiento Temporal en Devoluciones)*.
  4. [`docs/trazabilidad/04-dtos-y-validaciones-declarativas.md`](file:///d:/Contr/Archivos/POSLyon-Monolitico/docs/trazabilidad/04-dtos-y-validaciones-declarativas.md) *(Clases DTO vs Interfaces ante Type Erasure, Metaprogramación con `Reflect.metadata`, Anatomía de Bits RFC 4122 en `@IsUUIDOrNil`, Hidratación de Árboles JSON con `@ValidateNested` + `@Type`, Validación Polimórfica `@ValidateIf` e Idempotencia O-22)*.
  5. [`docs/trazabilidad/05-servicios-puros-y-reglas-dominio.md`](file:///d:/Contr/Archivos/POSLyon-Monolitico/docs/trazabilidad/05-servicios-puros-y-reglas-dominio.md) *(Arquitectura Functional Core / Imperative Shell, Prevención de Arbitraje Promocional RF-09, Compensación Mixta RF-10, Ecuación de Reconciliación C-18 y Doble Nivel de Mermas C-21, Conmutatividad del Merge Aditivo OCC C-10 y Reloj Monótono de Hardware + High Watermark S-10)*.
  6. [`docs/trazabilidad/06-bootstrap-backend-y-conexion-postgres.md`](file:///d:/Contr/Archivos/POSLyon-Monolitico/docs/trazabilidad/06-bootstrap-backend-y-conexion-postgres.md) *(Inversión de Control IoC e Inyección de Dependencias en NestJS, Seguridad Perimetral contra Mass Assignment con `whitelist` y `forbidNonWhitelisted`, Zona Horaria UTC estricta `-c timezone=UTC` O-25, Seed Transaccional Idempotente S-03 y Degradación Elegante ante Docker Offline)*.
  7. [`docs/trazabilidad/07-auditoria-transaccional-y-occ.md`](file:///d:/Contr/Archivos/POSLyon-Monolitico/docs/trazabilidad/07-auditoria-transaccional-y-occ.md) *(Snapshots forenses JSONB inmutables, regla de indivisibilidad atómica C-25/C-26 en `AuditoriaService.ejecutarTransaccionAuditada`, captura HTTP con `AuditContextInterceptor` y normalización HTTP 409 Conflict con `OccExceptionFilter`)*.
  8. [`docs/trazabilidad/08-modulo-sucursales-y-configuracion.md`](file:///d:/Contr/Archivos/POSLyon-Monolitico/docs/trazabilidad/08-modulo-sucursales-y-configuracion.md) *(Invariancia de esquema N=1, extensibilidad JSONB sin mutaciones DDL, One-to-One cascading, política permisiva C-12, alta atómica auditada y Soft Delete)*.
  9. [`docs/trazabilidad/09-seguridad-usuarios-y-permisos-pbac.md`](file:///d:/Contr/Archivos/POSLyon-Monolitico/docs/trazabilidad/09-seguridad-usuarios-y-permisos-pbac.md) *(Permission-Based Access Control PBAC vs roles enlatados, Grafo Acíclico Dirigido DAG de dependencias de permisos, Bypass Dueño RF-20 en `PermisosGuard`, KDF scrypt con salt y Soft Delete)*.
  10. [`docs/trazabilidad/10-catalogo-e-inventario-base.md`](file:///d:/Contr/Archivos/POSLyon-Monolitico/docs/trazabilidad/10-catalogo-e-inventario-base.md) *(Desacoplamiento ontológico central `PRODUCTO_GLOBAL` vs existencias/precios por sucursal `PRODUCTO_SUCURSAL`, códigos de barra 1:N `CODIGO_BARRA`, política permisiva C-12 con `stock_fisico < 0`, control OCC y auditoría forense)*.

---

## 🗺️ Tablero de Progreso (De lo Más Desacoplado a lo Más Acoplado)

### 🧱 Nivel 0: Núcleo de Dominio Puro (`libs/domain-core`) — *Cero Acoplamiento (100% COMPLETADO)*
- [x] **0.1.** Infraestructura Monorepo + Constantes Canónicas (`UUID_ARTICULO_COMODIN`, `UUID_SYSTEM_BOT`) + Enums de Estados de Venta (`EstadoGeneral`, `EstadoLogistico`, `EstadoFinanciero`). *(Trazabilidad: `01-monorepo-y-nucleo-estados-pos.md`)*
- [x] **0.2.** Resto de Enums de Dominio (Cuentas Corrientes, Devoluciones, Inventario/Reconciliación, Turnos de Caja, Transferencias 2PC, Proveedores/Recepción y Sincronización/Auditoría/Planes). *(Trazabilidad: `02-enums-dominio-modulos.md`)*
- [x] **0.3.** Interfaces de Contratos Inmutables (`IVenta`, `IVentaDetalle`, `IConfiguracionSucursal`, `IProductoGlobal`, `IProductoSucursal`, `ICliente`, `ICuentaCorriente`, `IAuditoria`, `ISyncEngineStrategy`, etc.). *(Trazabilidad: `03-interfaces-contratos-dominio.md`)*
- [x] **0.4.** DTOs con Validaciones Declarativas (`class-validator` y `class-transformer`), decorador `@IsUUIDOrNil()` (S-03) + Pruebas Unitarias de Validación (`13/13` aprobadas). *(Trazabilidad: `04-dtos-y-validaciones-declarativas.md`)*
- [x] **0.5.** Servicios Puros de Dominio (Cálculo de Margen Preservado, Fórmulas de Reembolso Neto Promocional RF-09 y Compensación Mixta RF-10, Deducción de Stock en Reconciliación RF-13, Guardas de Reloj Monótono S-10 y Arqueo Ciego RF-17) + Suite de Tests Unitarios Nivel 1 (`jest`, `32/32` tests en verde, `95.57%` cobertura). *(Trazabilidad: `05-servicios-puros-y-reglas-dominio.md`)*

### ⚙️ Nivel 1: Infraestructura Base Backend (`apps/backend-cloud`) — *(100% COMPLETADO)*
- [x] **1.1.** Bootstrap de NestJS + Conexión a PostgreSQL (Docker) con TypeORM (`-c timezone=UTC`) + Validación Global (`ValidationPipe`) + Seed de Identidades de Sistema (`UUID_ARTICULO_COMODIN` y `UUID_SYSTEM_BOT` - S-03) + Endpoint de Healthcheck y Laboratorio DTO/Dominio para probar en Postman. *(Trazabilidad: `06-bootstrap-backend-y-conexion-postgres.md`)*
- [x] **1.2.** Entidad e Interceptor Transversal de Auditoría (`AUDITORIA`, `AuditContextInterceptor`, `AuditoriaService.ejecutarTransaccionAuditada` C-25/C-26, `OccExceptionFilter` HTTP 409). *(Trazabilidad: `07-auditoria-transaccional-y-occ.md`)*

### 🏢 Nivel 2: Módulos Maestros — *(100% COMPLETADO)*
- [x] **2.1.** Módulo Sucursales y `CONFIGURACION_SUCURSAL` (Reglas de Negocio JSONB, Feature Toggles, Invariancia N=1 RF-21 y Soft Delete). *(Trazabilidad: `08-modulo-sucursales-y-configuracion.md`)*
- [x] **2.2.** Módulo Seguridad, Usuarios (`USUARIO`, `USUARIO_SUCURSAL`) y Permisos Granulares (`PERMISO`, `USUARIO_PERMISO`, Grafo DAG y Bypass Dueño RF-20). *(Trazabilidad: `09-seguridad-usuarios-y-permisos-pbac.md`)*
- [x] **2.3.** Módulo Catálogo e Inventario Base (`CATEGORIA`, `PRODUCTO_GLOBAL`, `CODIGO_BARRA`, `PRODUCTO_SUCURSAL`, Stock Permisivo C-12). *(Trazabilidad: `10-catalogo-e-inventario-base.md`)*

### 💰 Nivel 3: Módulos Operativos y Financieros (Acoplamiento Medio)
- [ ] **3.1.** Módulo Turnos de Caja, Movimientos y Arqueo Ciego (`TURNO_CAJA`, `MOVIMIENTO_CAJA`, `METODO_PAGO` — RF-17 / O-23).
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
2. **Compilar y correr la suite de tests completa:**
   ```bash
   npm run build
   npm test
   ```
3. **Levantar Base de Datos PostgreSQL:**
   ```bash
   npm run db:up
   ```
4. **Indicación para Gemini al abrir nueva sesión en otro OS:**
   > *"Hola Gemini, lee `MEMORY.md` y el último documento en `docs/trazabilidad/` para retomar desde donde dejamos."*

---

## 🎯 Próximo Paso Inmediato
- **Paso 3.1:** Iniciar el **Nivel 3 (Módulos Operativos y Financieros)** — Implementar el **Módulo Turnos de Caja, Movimientos y Arqueo Ciego** (`TURNO_CAJA`, `MOVIMIENTO_CAJA`, `METODO_PAGO`, Arqueo Ciego obligatorio RF-17 / O-23 consumiendo `ArqueoCiegoDomainService`, validación de turnos abiertos para ventas POS y documento `docs/trazabilidad/11-turnos-caja-y-arqueo-ciego.md`).
