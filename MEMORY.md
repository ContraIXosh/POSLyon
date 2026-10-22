# 🧠 MEMORY.md — Estado de Construcción y Continuidad Multi-OS (Fedora ↔ Windows)

> **Propósito:** Este archivo es la memoria persistente del proyecto **POSLyon**. Permite retomar el trabajo exactamente donde se dejó al cambiar entre **Fedora Linux** y **Windows**, manteniendo el registro de los módulos construidos, la trazabilidad documental y el próximo paso inmediato.

---

## 📍 Estado Actual del Proyecto

- **Última actualización:** 2026-10-22
- **Fase Actual:** **Nivel 0 — Núcleo de Dominio Puro (`libs/domain-core`)**
- **Último Paso Completado:** **Paso 0 y Sub-módulo 0.1** — Infraestructura del Monorepo (`package.json`, `tsconfig.base.json`, `docker-compose.yml`), configuración Git Multi-OS (`.gitattributes`, `.gitignore`), Agente/Skill de Trazabilidad Educativa (`.agents/skills/mentor-trazabilidad-sdd/SKILL.md`), Constantes Globales (`comodin.constants.ts`) y Enums de la Máquina de Estados Ortogonal de Venta (`EstadoGeneral`, `EstadoLogistico`, `EstadoFinanciero`).
- **Documento de Trazabilidad Generado:** [`docs/trazabilidad/01-monorepo-y-nucleo-estados-pos.md`](file:///home/ContraIXosh/Documents/POSLyon/docs/trazabilidad/01-monorepo-y-nucleo-estados-pos.md)

---

## 🗺️ Tablero de Progreso (De lo Más Desacoplado a lo Más Acoplado)

### 🧱 Nivel 0: Núcleo de Dominio Puro (`libs/domain-core`) — *Cero Acoplamiento*
- [x] **0.1.** Infraestructura Monorepo + Constantes Canónicas (`UUID_ARTICULO_COMODIN`, `UUID_SYSTEM_BOT`) + Enums de Estados de Venta (`EstadoGeneral`, `EstadoLogistico`, `EstadoFinanciero`). *(Trazabilidad: `01-monorepo-y-nucleo-estados-pos.md`)*
- [ ] **0.2.** Resto de Enums de Dominio (Cuentas Corrientes, Devoluciones, Inventario/Reconciliación, Proveedores/Recepción y Sincronización/Auditoría).
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
- **Paso 0.2:** Implementar el resto de los **Enums de Dominio** en `libs/domain-core/src/enums/` (Cuentas Corrientes, Devoluciones, Inventario/Reconciliación, Proveedores/Recepción y Sincronización/Auditoría), explicar cada uno de 0 a 100 y registrar su trazabilidad en `docs/trazabilidad/02-enums-dominio-modulos.md`.
- **Repositorio GitHub:** Pendiente de vincular URL remota (`git remote add origin <URL>`) cuando el usuario nos comparta el link del repositorio vacío.
