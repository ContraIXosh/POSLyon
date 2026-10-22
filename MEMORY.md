# 🧠 MEMORY.md — Estado de Construcción y Continuidad Multi-OS (Fedora ↔ Windows)

> **Propósito:** Este archivo es la memoria persistente del proyecto **POSLyon**. Permite retomar el trabajo exactamente donde se dejó al cambiar entre **Fedora Linux** y **Windows**, manteniendo el registro de los módulos construidos, la trazabilidad documental y el próximo paso inmediato.

---

## 📍 Estado Actual del Proyecto

- **Última actualización:** 2026-10-22
- **Repositorio Remoto GitHub:** `https://github.com/ContraIXosh/POSLyon` (Rama `main`)
- **Fase Actual:** **Nivel 0 — Núcleo de Dominio Puro (`libs/domain-core`)**
- **Último Paso Completado:** **Sub-módulo 0.2** — Catálogo completo de 18 Enums Canónicos de Dominio (`libs/domain-core/src/enums/`) cubriendo Core POS, Promociones, Turnos de Caja, Cuentas Corrientes (*Signed Ledger*), Devoluciones, Inventario/Reconciliación, Cuarentena, Transferencias 2PC, Proveedores/Recepción, Sincronización, Auditoría Forense y Planes Comerciales.
- **Documentos de Trazabilidad Generados:**
  1. [`docs/trazabilidad/01-monorepo-y-nucleo-estados-pos.md`](file:///home/ContraIXosh/Documents/POSLyon/docs/trazabilidad/01-monorepo-y-nucleo-estados-pos.md) *(Actualizado con contraste Anti-Patrón Novato vs. Ingeniería Profesional, RFC 4122, Teoría de Autómatas / Harel Statecharts y Type Erasure)*.
  2. [`docs/trazabilidad/02-enums-dominio-modulos.md`](file:///home/ContraIXosh/Documents/POSLyon/docs/trazabilidad/02-enums-dominio-modulos.md) *(Incluye cátedra completa sobre Signed Ledger, Cierre Ciego vs. Rectificación Forense, Two-Phase Commit Logístico 2PC, Strategy Pattern y Deducción Recursiva de Packs)*.

---

## 🗺️ Tablero de Progreso (De lo Más Desacoplado a lo Más Acoplado)

### 🧱 Nivel 0: Núcleo de Dominio Puro (`libs/domain-core`) — *Cero Acoplamiento*
- [x] **0.1.** Infraestructura Monorepo + Constantes Canónicas (`UUID_ARTICULO_COMODIN`, `UUID_SYSTEM_BOT`) + Enums de Estados de Venta (`EstadoGeneral`, `EstadoLogistico`, `EstadoFinanciero`). *(Trazabilidad: `01-monorepo-y-nucleo-estados-pos.md`)*
- [x] **0.2.** Resto de Enums de Dominio (Cuentas Corrientes, Devoluciones, Inventario/Reconciliación, Turnos de Caja, Transferencias 2PC, Proveedores/Recepción y Sincronización/Auditoría/Planes). *(Trazabilidad: `02-enums-dominio-modulos.md`)*
- [ ] **0.3.** Interfaces de Contratos Inmutables (`IVenta`, `IVentaDetalle`, `IConfiguracionSucursal`, `IProductoGlobal`, `IProductoSucursal`, `ICliente`, `ICuentaCorriente`, `IAuditoria`, `ISyncEngineStrategy`, etc.).
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
- **Paso 0.3:** Implementar las **Interfaces de Contratos Inmutables (`libs/domain-core/src/interfaces/`)** que representan la forma exacta en memoria de cada tabla del ERD (incluyendo Snapshots de Precios, JSONB de Configuración, OCC `version`, Cursores de Sincronización y el puerto `ISyncEngineStrategy`), explicar la diferencia entre `interface` y `class` en TypeScript y crear `docs/trazabilidad/03-interfaces-contratos-dominio.md`.
