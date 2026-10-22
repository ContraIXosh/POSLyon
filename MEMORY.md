# 🧠 MEMORY.md — Estado de Construcción y Continuidad Multi-OS (Fedora ↔ Windows)

> **Propósito:** Este archivo es la memoria persistente del proyecto **POSLyon**. Permite retomar el trabajo exactamente donde se dejó al cambiar entre **Fedora Linux** y **Windows**, manteniendo el registro de los módulos construidos, la trazabilidad documental y el próximo paso inmediato.

---

## 📍 Estado Actual del Proyecto

- **Última actualización:** 2026-10-22
- **Repositorio Remoto GitHub:** `https://github.com/ContraIXosh/POSLyon` (Rama `main` sincronizada)
- **Fase Actual:** **Nivel 0 — Núcleo de Dominio Puro (`libs/domain-core`)**
- **Último Paso Completado:** **Sub-módulo 0.3** — Conjunto completo de 28 Interfaces de Contratos Inmutables de Dominio (`libs/domain-core/src/interfaces/`) cubriendo todos los módulos (Venta, Snapshots, Reglas JSONB y Feature Toggles, Packs, Catálogo Global, Existencias por Sucursal, Reconciliación de Huérfanos, Cuarentena, Transferencias 2PC, Signed Ledger de Cuentas Corrientes, Devoluciones y Notas de Crédito, Arqueo Ciego de Caja, Diccionario de Proveedores, Preservación de Margen Sugerido, Auditoría Forense con Snapshots y Sincronización Local-First por Cursores).
- **Documentos de Trazabilidad Generados:**
  1. [`docs/trazabilidad/01-monorepo-y-nucleo-estados-pos.md`](file:///home/ContraIXosh/Documents/POSLyon/docs/trazabilidad/01-monorepo-y-nucleo-estados-pos.md) *(Anti-Patrón Novato vs. Ingeniería Profesional, RFC 4122 Nil UUID, Harel Statecharts y Type Erasure)*.
  2. [`docs/trazabilidad/02-enums-dominio-modulos.md`](file:///home/ContraIXosh/Documents/POSLyon/docs/trazabilidad/02-enums-dominio-modulos.md) *(Signed Ledger, Cierre Ciego vs. Rectificación Forense, Two-Phase Commit 2PC, Strategy Pattern y Packs)*.
  3. [`docs/trazabilidad/03-interfaces-contratos-dominio.md`](file:///home/ContraIXosh/Documents/POSLyon/docs/trazabilidad/03-interfaces-contratos-dominio.md) *(Zero-Cost Abstractions en interfaces vs clases, Price Snapshotting en VentaDetalle, Invariancia de Esquema N=1 en planes comerciales, Preservación Automática de Margen Bruto y Desacoplamiento Temporal en Devoluciones)*.

---

## 🗺️ Tablero de Progreso (De lo Más Desacoplado a lo Más Acoplado)

### 🧱 Nivel 0: Núcleo de Dominio Puro (`libs/domain-core`) — *Cero Acoplamiento*
- [x] **0.1.** Infraestructura Monorepo + Constantes Canónicas (`UUID_ARTICULO_COMODIN`, `UUID_SYSTEM_BOT`) + Enums de Estados de Venta (`EstadoGeneral`, `EstadoLogistico`, `EstadoFinanciero`). *(Trazabilidad: `01-monorepo-y-nucleo-estados-pos.md`)*
- [x] **0.2.** Resto de Enums de Dominio (Cuentas Corrientes, Devoluciones, Inventario/Reconciliación, Turnos de Caja, Transferencias 2PC, Proveedores/Recepción y Sincronización/Auditoría/Planes). *(Trazabilidad: `02-enums-dominio-modulos.md`)*
- [x] **0.3.** Interfaces de Contratos Inmutables (`IVenta`, `IVentaDetalle`, `IConfiguracionSucursal`, `IProductoGlobal`, `IProductoSucursal`, `ICliente`, `ICuentaCorriente`, `IAuditoria`, `ISyncEngineStrategy`, etc.). *(Trazabilidad: `03-interfaces-contratos-dominio.md`)*
- [ ] **0.4.** DTOs con Validaciones Declarativas (`class-validator` y `class-transformer`) + Pruebas Unitarias de Validación.
- [ ] **0.5.** Servicios Puros de Dominio (Cálculo de Margen Preservado, Fórmulas de Reembolso Neto Promocional RF-09, Deducción de Stock en Reconciliación RF-13, Guardas de Reloj Monótono S-10) + Suite de Tests Unitarios Nivel 1 (`jest`).

### ⚙️ Nivel 1: Infraestructura Base Backend (`apps/backend-cloud`)
- [ ] **1.1.** Bootstrap de NestJS + Conexión a PostgreSQL (Docker) con TypeORM + Endpoint de Healthcheck para probar en Postman.
- [ ] **1.2.** Entidad e Interceptor Transversal de Auditoría (`AUDITORIA`, `AuditInterceptor`, `OccExceptionFilter` HTTP 409).

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
2. **Verificar que los saltos de línea estén limpios (gracias a `.gitattributes`):**
   ```bash
   git status
   ```
3. **Levantar Base de Datos PostgreSQL (cuando estemos en Nivel 1+):**
   ```bash
   npm run db:up
   ```
4. **Indicación para Gemini al abrir nueva sesión en otro OS:**
   > *"Hola Gemini, lee `MEMORY.md` y el último documento en `docs/trazabilidad/` para retomar desde donde dejamos."*

---

## 🎯 Próximo Paso Inmediato
- **Paso 0.4:** Implementar los **DTOs con Validaciones Declarativas (`libs/domain-core/src/dtos/`)** (`CrearVentaDto`, `PagoItemDto`, `ReconciliarCodigoHuerfanoDto`, `CrearDevolucionDto`, `ItemDevolucionDto`, `RegistrarAbonoDto`, `ConfirmarRecepcionDto`, `SyncPushDto`), explicar el patrón DTO vs Interface, decoradores de `class-validator` y documentar en `docs/trazabilidad/04-dtos-y-validaciones-declarativas.md`.
