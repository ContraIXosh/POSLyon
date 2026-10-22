# 🧭 Reporte de Trazabilidad e Ingeniería: 02 — Catálogo Completo de Enums Canónicos de Dominio (Módulos 1 al 5)

> **Fecha:** 2026-10-22  
> **Nivel de Acoplamiento:** Nivel 0 — Núcleo de Dominio Puro (`libs/domain-core`, Acoplamiento Eferente $C_e = 0$)  
> **Estado:** Implementado y Verificado

---

## 1. 🔗 Matriz de Trazabilidad Bidireccional (De la Especificación al Código)

| Requisito (ERS) | Entidad / Campo (ERD) | Diagrama UML (Secuencia / Estado) | File-Level Spec | Archivo y Símbolo Implementado |
| :--- | :--- | :--- | :--- | :--- |
| **RF-06 / O-11** (Motor de Promociones Dinámico y Conmutación Mayorista) | `PROMOCION.tipo_efecto`, `VENTA_DETALLE.tipo_precio` | `Diagrama de Secuencia de aplicación de promociones.md` | `File-Level Specs_ Módulo Core POS.md` (§1, §5) | [`tipo-efecto-promocion.enum.ts`](file:///home/ContraIXosh/Documents/POSLyon/libs/domain-core/src/enums/tipo-efecto-promocion.enum.ts) (`TipoEfectoPromocion`, `TipoPrecio`) |
| **RF-04 / O-26** (Venta a Granel y Packs sin Stock Físico Propio) | `PRODUCTO_GLOBAL.tipo_venta` (`UNIDAD`, `PESABLE`, `PACK`) | `Diagrama de Entidad-Relación (ERD).md` (`PRODUCTO_GLOBAL`) | `File-Level Specs_ Módulo Inventario...` (§6 `IProductoGlobal`) | [`tipo-efecto-promocion.enum.ts`](file:///home/ContraIXosh/Documents/POSLyon/libs/domain-core/src/enums/tipo-efecto-promocion.enum.ts) (`TipoVentaProducto`) |
| **RF-17 / O-16** (Cierre Ciego, Rectificación y Reapertura Auditada) | `TURNO_CAJA.estado`, `MOVIMIENTO_CAJA.tipo_movimiento` | `Diagrama de Máquina de Estados de Turno de Caja.md` y `Diagrama de Actividad Arqueo y Cierre de Caja.md` | `File-Level Specs_ Módulo Cuentas Corrientes y Devoluciones.md` | [`estado-turno-caja.enum.ts`](file:///home/ContraIXosh/Documents/POSLyon/libs/domain-core/src/enums/estado-turno-caja.enum.ts) (`EstadoTurnoCaja`, `TipoMovimientoCaja`) |
| **RF-07 y RF-08** (Fiados y Abonos — Patrón *Signed Ledger*) | `CUENTA_CORRIENTE.tipo_movimiento` | `Diagrama de Secuencia_ Flujo de Crédito y Abonos.md` | `File-Level Specs_ Módulo Cuentas Corrientes...` (§2 `tipo-movimiento-cc.enum.ts`) | [`tipo-movimiento-cc.enum.ts`](file:///home/ContraIXosh/Documents/POSLyon/libs/domain-core/src/enums/tipo-movimiento-cc.enum.ts) (`TipoMovimientoCC`) |
| **RF-09, RF-10 y RF-11** (Devoluciones, Compensación Mixta y Notas de Crédito) | `NOTA_CREDITO.tipo_compensacion`, `NOTA_CREDITO.motivo` | `Diagrama de secuencia de notas de crédito.md` | `File-Level Specs_ Módulo Cuentas Corrientes...` (§1 y §3) | [`tipo-devolucion.enum.ts`](file:///home/ContraIXosh/Documents/POSLyon/libs/domain-core/src/enums/tipo-devolucion.enum.ts) (`TipoDevolucion`), [`motivo-devolucion.enum.ts`](file:///home/ContraIXosh/Documents/POSLyon/libs/domain-core/src/enums/motivo-devolucion.enum.ts) (`MotivoDevolucion`) |
| **RF-13, C-21 y C-11** (Reconciliación de Huérfanos, Mermas Lógicas y Cuarentena) | `ALERTA_CUARENTENA.estado` y cálculos de reconciliación | `Diagrama de Actividad de Reconciliación de Stock.md` y `Diagrama de Máquina de Estados de Alerta de Cuarentena.md` | `File-Level Specs_ Módulo Inventario...` (§2, §3, §4) | [`accion-reconciliacion.enum.ts`](file:///home/ContraIXosh/Documents/POSLyon/libs/domain-core/src/enums/accion-reconciliacion.enum.ts), [`estado-cuarentena.enum.ts`](file:///home/ContraIXosh/Documents/POSLyon/libs/domain-core/src/enums/estado-cuarentena.enum.ts), [`tipo-ajuste-stock.enum.ts`](file:///home/ContraIXosh/Documents/POSLyon/libs/domain-core/src/enums/tipo-ajuste-stock.enum.ts), [`tipo-discrepancia-precio.enum.ts`](file:///home/ContraIXosh/Documents/POSLyon/libs/domain-core/src/enums/tipo-discrepancia-precio.enum.ts) |
| **RF-16, C-24 y O-08** (Transferencias entre Sucursales en 2 Fases - 2PC) | `TRANSFERENCIA_STOCK.estado` | `Diagrama de Máquina de Estados de Transferencia de Stock.md` y `Diagrama de secuencia de transferencia de stock...md` | `Diagrama de Máquina de Estados de Transferencia de Stock.md` | [`estado-transferencia-stock.enum.ts`](file:///home/ContraIXosh/Documents/POSLyon/libs/domain-core/src/enums/estado-transferencia-stock.enum.ts) (`EstadoTransferenciaStock`) |
| **RF-14 y RF-15** (Diccionario de Proveedores, Recepción y Margen Preservado) | `RECEPCION_MERCADERIA.estado`, `RECEPCION_DETALLE.estado_discrepancia` | `Diagrama de secuencia Módulo de Recepción de Mercadería...md` | `File-Level Specs_ Módulo Proveedores...` (§1 y §2) | [`estado-recepcion.enum.ts`](file:///home/ContraIXosh/Documents/POSLyon/libs/domain-core/src/enums/estado-recepcion.enum.ts), [`estado-discrepancia-item.enum.ts`](file:///home/ContraIXosh/Documents/POSLyon/libs/domain-core/src/enums/estado-discrepancia-item.enum.ts), [`tipo-actualizacion-precio.enum.ts`](file:///home/ContraIXosh/Documents/POSLyon/libs/domain-core/src/enums/tipo-actualizacion-precio.enum.ts) |
| **RF-18, RF-19, RF-21 y S-04** (Sincronización Deltas, Auditoría Forense y Planes) | `AUDITORIA.accion`, `CONFIGURACION_SUCURSAL.plan_activo`, `modo_nodo_lan` | `Diagrama de Secuencia_ Flujo de Modificación con Registro de Auditoría.md` y `plan_arquitectura_planes_sucursal.md` | `File-Level Specs_ Módulo Sincronización...` y `Cuentas Corrientes` (§4) | [`accion-auditoria.enum.ts`](file:///home/ContraIXosh/Documents/POSLyon/libs/domain-core/src/enums/accion-auditoria.enum.ts), [`estado-sincronizacion.enum.ts`](file:///home/ContraIXosh/Documents/POSLyon/libs/domain-core/src/enums/estado-sincronizacion.enum.ts), [`tipo-evento-sync.enum.ts`](file:///home/ContraIXosh/Documents/POSLyon/libs/domain-core/src/enums/tipo-evento-sync.enum.ts), [`tipo-evento-ws.enum.ts`](file:///home/ContraIXosh/Documents/POSLyon/libs/domain-core/src/enums/tipo-evento-ws.enum.ts), [`plan-comercial.enum.ts`](file:///home/ContraIXosh/Documents/POSLyon/libs/domain-core/src/enums/plan-comercial.enum.ts) |

---

## 2. 🎓 Cátedra de Ingeniería de Sistemas (Explicación de 0 a 100)

### 2.1. ¿Por qué diseñamos primero el vocabulario completo de Estados y Tipos (Ubiquitous Language de DDD)?
En **Domain-Driven Design (DDD)** de Eric Evans, el primer paso antes de programar servicios o tablas es definir el **Lenguaje Ubicuo (*Ubiquitous Language*)**: un conjunto cerrado e inequívoco de términos de dominio que significan exactamente lo mismo para el dueño del comercio, para los diagramas UML y para el compilador de TypeScript.
Con estos 18 archivos de enumeraciones en `libs/domain-core/src/enums/`, hemos congelado el vocabulario de los **5 módulos del sistema** manteniendo un **Acoplamiento Eferente $C_e = 0$**.

---

### 2.2. Anatomía Técnica: Patrones, Principios SOLID, Anti-Patrones y Teoría de Sistemas

#### A. El Patrón *Signed Ledger* (Libro Mayor con Signo) en Cuentas Corrientes ([`TipoMovimientoCC`](file:///home/ContraIXosh/Documents/POSLyon/libs/domain-core/src/enums/tipo-movimiento-cc.enum.ts))
Observa los valores de `TipoMovimientoCC`: `VENTA_CREDITO`, `ABONO`, `AJUSTE_DEVOLUCION`.
- **Fundamento Teórico Formal:** **Contabilidad por Partida Simple/Doble en Libro Mayor Inmutable (*Append-Only Signed Ledger*)**.
- **❌ El Mal Diseño (Enfoque Novato — Mutación Destructiva de Comprobantes):**
  - Cuando un cliente viene a pagar \$10.000 de una deuda acumulada de 3 compras pasadas, el programador novato intenta hacer un `UPDATE ventas SET pagado = true` o `UPDATE ventas SET saldo_pendiente = saldo_pendiente - 10000` buscando qué ticket viejo "achicar".
  - *¿Por qué falla en producción?* Porque si el cliente entrega un billete de \$20.000 a cuenta de su deuda global (sin especificar a qué ticket de hace dos meses corresponde), mutar tickets históricos rompe los arqueos de turnos pasados, destruye la pista de auditoría y genera condiciones de carrera cuando dos sucursales cobran al mismo tiempo.
- **✅ El Diseño de Ingeniería (Enfoque Profesional en POSLyon — RF-08):**
  - Las ventas pasadas son **100% inmutables**; jamás se editan cuando el cliente viene a abonar días después.
  - En su lugar, la tabla `CUENTA_CORRIENTE` funciona como un **Libro Mayor Inmutable (*Append-Only Ledger*)** donde solo se hacen `INSERT`:
    - Si lleva fiado (`VENTA_CREDITO`), se inserta un asiento con `monto > 0` (ej. `+$50.000`).
    - Si entrega dinero a cuenta (`ABONO`) o devuelve mercadería (`AJUSTE_DEVOLUCION`), se inserta un asiento nuevo con `monto < 0` (ej. `-$25.000`).
  - La suma algebraica histórica de `SUM(CUENTA_CORRIENTE.monto)` para ese cliente **siempre** coincide matemáticamente con `CLIENTE.saldo_deudor`.

#### B. Instantánea Contable Inmutable vs. Rectificación Forense en Turnos de Caja ([`EstadoTurnoCaja`](file:///home/ContraIXosh/Documents/POSLyon/libs/domain-core/src/enums/estado-turno-caja.enum.ts))
Observa los 4 estados de [`EstadoTurnoCaja`](file:///home/ContraIXosh/Documents/POSLyon/libs/domain-core/src/enums/estado-turno-caja.enum.ts): `ABIERTO`, `CERRADO`, `RECTIFICADO`, `REABIERTO_AUDITADO`.
- **Fundamento Teórico Formal:** **Separación de Evidencia Operativa vs. Ajuste Supervisado (Forensic Accounting & Non-Repudiation)**.
- **❌ El Mal Diseño (Enfoque Novato — Sobrescritura del Cierre de Caja):**
  - El cajero cuenta los billetes a ciegas y declara `efectivo_declarado = $95.000` (faltan \$5.000). Al día siguiente el supervisor encuentra un billete de \$5.000 caído debajo del cajón y hace `UPDATE turno_caja SET efectivo_declarado = 100000`.
  - *¿Por qué es peligroso?* Porque permite que un encargado malintencionado altere lo que declararon los cajeros borrando la evidencia original (pérdida de **No Repudio**).
- **✅ El Diseño de Ingeniería (Enfoque Profesional en POSLyon — RF-17 y Resolución O-16):**
  - Cuando el cajero cierra la caja (`CERRADO`), la columna `efectivo_declarado` queda **congelada para siempre**.
  - Si un Administrador necesita corregir el arqueo, el turno transiciona al estado `RECTIFICADO` y el nuevo valor se guarda en una columna separada (`efectivo_rectificado`, junto con `fecha_rectificacion` e `id_usuario_rectifica`). Así coexisten en la misma fila la foto exacta de lo que contó el cajero y la rectificación firmada por el supervisor.

#### C. Transacciones de Negocio en Dos Fases (*Two-Phase Commit* Logístico) en Transferencias ([`EstadoTransferenciaStock`](file:///home/ContraIXosh/Documents/POSLyon/libs/domain-core/src/enums/estado-transferencia-stock.enum.ts))
Observa los estados en [`EstadoTransferenciaStock`](file:///home/ContraIXosh/Documents/POSLyon/libs/domain-core/src/enums/estado-transferencia-stock.enum.ts): `PENDIENTE_DESPACHO` $\to$ `EN_TRANSITO` $\to$ `COMPLETADA` | `DISCREPANCIA` $\to$ `DISCREPANCIA_RESUELTA`.
- **Fundamento Teórico Formal:** **Protocolo de Confirmación en Dos Fases a Nivel de Dominio (*Business-Level Two-Phase Commit / Saga Pattern*)**.
- **❌ El Mal Diseño (Enfoque Novato — Transferencia Instantánea en un solo `UPDATE`):**
  - El programador novato hace un botón "Transferir 50 botellas de Sucursal A a Sucursal B" que en el mismo milisegundo resta 50 en A y suma 50 en B.
  - *¿Por qué falla en la vida real?* Porque el flete tarda 3 horas en cruzar la ciudad. Si suma las 50 botellas en la Sucursal B antes de que llegue la camioneta, el sistema mostrará stock disponible en B que todavía está arriba del camión; y si en el viaje se rompen 2 botellas, el inventario de B queda mentiroso desde el primer minuto.
- **✅ El Diseño de Ingeniería (Enfoque Profesional en POSLyon — RF-16):**
  - **Fase 1 (`EN_TRANSITO`):** Cuando la camioneta sale de la Sucursal A, se descuentan las 50 unidades del `stock_fisico` de A. Esas 50 unidades quedan representadas en el estado `EN_TRANSITO` (mercadería en vuelo).
  - **Fase 2 (`COMPLETADA` o `DISCREPANCIA`):** Recién cuando la camioneta llega a la Sucursal B y el receptor cuenta físicamente las botellas (`cantidad_recibida = 48`), el sistema suma **únicamente las 48 reales** al `stock_fisico` de B y pasa la orden a `DISCREPANCIA` para que el Administrador audite las 2 botellas rotas (`DISCREPANCIA_RESUELTA`).

#### D. El Principio Abierto/Cerrado (OCP de SOLID) y el Patrón *Strategy* en Promociones ([`TipoEfectoPromocion`](file:///home/ContraIXosh/Documents/POSLyon/libs/domain-core/src/enums/tipo-efecto-promocion.enum.ts)) y Planes ([`PlanComercial`](file:///home/ContraIXosh/Documents/POSLyon/libs/domain-core/src/enums/plan-comercial.enum.ts))
- **Fundamento Teórico Formal:** **Open/Closed Principle (Bertrand Meyer / Robert C. Martin) y Strategy Pattern (Gang of Four - GoF)**.
- **❌ El Mal Diseño (Enfoque Novato):**
  - Escribir una función gigante de 500 líneas con `if (promo === '2x1') ... else if (promo === 'porcentaje') ...` que además sobrescribe el precio del producto en el carrito (`item.precio_unitario = nuevoPrecio`).
  - *¿Por qué falla?* Primero, porque si sobrescribes `precio_unitario`, pierdes para siempre cuánto valía el producto en lista (y cuando el cliente devuelve 1 unidad de un 2x1 en `RF-09`, no sabes cuánto reembolsarle). Segundo, porque cada nueva promoción obliga a modificar la función central de cobro, arriesgando romper el resto de los cálculos.
- **✅ El Diseño de Ingeniería (Enfoque Profesional en POSLyon — RF-06 y RF-21):**
  - `TipoEfectoPromocion` (`PORCENTAJE`, `PRECIO_FIJO`, `CANTIDAD_BONIFICADA`, `MONTO_FIJO_DESCUENTO`) selecciona polimórficamente qué clase estrategia ejecuta el cálculo, depositando el resultado en `VENTA_DETALLE.monto_descuento` y dejando **intacto** `VENTA_DETALLE.precio_unitario` (*Price Snapshot*).
  - De igual manera, `PlanComercial` (`BASICO_LOCAL` vs `SUPERIOR_CLOUD`) permite a `SyncStrategyFactory` inyectar `LocalOnlySyncStrategy` (*Null Object Pattern*, costo de nube \$0) o `CloudDeltaSyncStrategy` sin cambiar una sola línea de los servicios del mostrador.

#### E. Deducción Recursiva de Inventario en Packs ([`TipoVentaProducto`](file:///home/ContraIXosh/Documents/POSLyon/libs/domain-core/src/enums/tipo-efecto-promocion.enum.ts))
- **Fundamento Teórico Formal:** **Relación Auto-Referencial (*Self-Referencing Foreign Key*) y Stock Virtual Derivado (Resolución O-26)**.
- **❌ El Mal Diseño (Enfoque Novato):**
  - Asignar stock propio en `PRODUCTO_SUCURSAL` tanto a la "Lata de Cerveza Individual" (ej. 60 latas) como al "Pack x6 Cervezas" (ej. 10 packs).
  - *¿Por qué falla?* Si un cliente abre un pack en la heladera y se lleva 1 lata suelta, el stock de latas baja a 59, pero el sistema sigue diciendo que hay 10 packs enteros (cuando en realidad quedan 9 packs completos). El inventario se desincroniza permanentemente.
- **✅ El Diseño de Ingeniería (Enfoque Profesional en POSLyon — RF-04):**
  - Cuando `tipo_venta === TipoVentaProducto.PACK`, el pack **no tiene stock físico propio**. Apunta mediante `id_producto_base` a la unidad individual y define `multiplicador_stock = 6`.
  - Al vender 2 packs, el sistema descuenta atómicamente $2 \times 6 = 12$ unidades del `stock_fisico` del producto base, manteniendo una única verdad física en toda la sucursal.

---

### 2.3. Bitácora de Decisiones Arquitectónicas (ADR)
- **Componente / Archivos:** `libs/domain-core/src/enums/*.enum.ts` (18 enumeraciones de dominio) y [`libs/domain-core/src/index.ts`](file:///home/ContraIXosh/Documents/POSLyon/libs/domain-core/src/index.ts).
- **Requisito SDD Vinculado:** Todos los File-Level Specs (Módulos 1 al 5) y `plan_arquitectura_planes_sucursal.md`.
- **Decisión Tomada:** Unificación del catálogo de acciones de auditoría en [`AccionAuditoria`](file:///home/ContraIXosh/Documents/POSLyon/libs/domain-core/src/enums/accion-auditoria.enum.ts) con exportación de alias (`AuditAction` y `AccionAuditoriaGlobal`) en el *Barrel File* (`index.ts`).
- **Alternativas Descartadas y Justificación Técnica:**
  - *Alternativa A (Tener un enum de auditoría distinto por cada módulo):* Descartado. En la base de datos existe una **única tabla central `AUDITORIA`**. Si cada módulo definiera su propio enum aislado sin consolidar, el interceptor global (`AuditInterceptor`) y las consultas forenses tendrían colisiones de tipos o requerirían uniones complejas (`Union Types`).
  - *Alternativa B (Importar archivos internos con rutas relativas profundas `../../../../libs/domain-core/src/enums/...`):* Descartado. Aplicamos el **Patrón Barrel (`index.ts`)** para exponer una fachada pública limpia (`import { AccionAuditoria, EstadoTurnoCaja } from '@poslyon/domain-core'`), ocultando la estructura interna de carpetas (Principio de Encapsulamiento e *Information Hiding* de David Parnas).
- **Fundamento Teórico de Sistemas:** *Information Hiding* (Parnas), *Ubiquitous Language* (DDD), *Signed Ledger Pattern*, *Business Two-Phase Commit (2PC)* y *Open/Closed Principle* (SOLID).
- **Riesgo / Trade-off Aceptado:** Centralizar las exportaciones en un *Barrel File* requiere mantener `index.ts` actualizado al agregar nuevas entidades, lo cual mitigamos verificando la compilación de `@poslyon/domain-core` en cada paso.

---

## 3. 🧪 Verificación Empírica (Compilación Estricha del Núcleo de Dominio)
- Se verificó la estructura y exportación de los 18 módulos de constantes y enumeraciones en [`libs/domain-core/src/index.ts`](file:///home/ContraIXosh/Documents/POSLyon/libs/domain-core/src/index.ts) sin dependencias circulares ($C_e = 0$).
