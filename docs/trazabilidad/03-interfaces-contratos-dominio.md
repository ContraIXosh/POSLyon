# 🧭 Reporte de Trazabilidad e Ingeniería: 03 — Interfaces de Contratos Inmutables de Dominio (Módulos 1 al 5)

> **Fecha:** 2026-10-22  
> **Nivel de Acoplamiento:** Nivel 0 — Núcleo de Dominio Puro (`libs/domain-core`, Acoplamiento Eferente $C_e = 0$)  
> **Estado:** Implementado y Verificado

---

## 1. 🔗 Matriz de Trazabilidad Bidireccional (De la Especificación al Código)

| Requisito (ERS) | Entidad / Campo (ERD) | Diagrama UML (Secuencia / Estado) | File-Level Spec | Archivo y Contrato Tipado Implementado |
| :--- | :--- | :--- | :--- | :--- |
| **RF-01, RF-03, RF-05 y RF-17** (Cabecera de Venta, Snapshots y Pagos Mixtos) | `VENTA`, `VENTA_DETALLE`, `PAGO_VENTA` | `Diagrama de Secuencia Transición Atómica a CONFIRMADA...md` y `Flujo de Pago Mixto.md` | `File-Level Specs_ Módulo Core POS.md` (§0d, §1) | [`IVenta`](file:///home/ContraIXosh/Documents/POSLyon/libs/domain-core/src/interfaces/venta.interface.ts), [`IVentaDetalle`](file:///home/ContraIXosh/Documents/POSLyon/libs/domain-core/src/interfaces/venta-detalle.interface.ts), [`IPagoVenta`](file:///home/ContraIXosh/Documents/POSLyon/libs/domain-core/src/interfaces/pago-venta.interface.ts) |
| **RF-02, RF-21 y C-12** (Configuración JSONB, Feature Toggles y Planes) | `CONFIGURACION_SUCURSAL` (`reglas_negocio jsonb`, `plan_activo`) | `plan_arquitectura_planes_sucursal.md` (§3.2 ERD) | `File-Level Specs_ Módulo Core POS.md` (§1b) | [`IConfiguracionSucursal`](file:///home/ContraIXosh/Documents/POSLyon/libs/domain-core/src/interfaces/configuracion-sucursal.interface.ts) (`IFeatureToggles`, `IReglasNegocioSucursal`) |
| **RF-04 / O-26** (Catálogo Global, Packs y Existencias por Tienda) | `PRODUCTO_GLOBAL`, `PRODUCTO_SUCURSAL`, `CODIGO_BARRA` | `Diagrama de Entidad-Relación (ERD).md` | `File-Level Specs_ Módulo Inventario...` (§6, §7) | [`IProductoGlobal`](file:///home/ContraIXosh/Documents/POSLyon/libs/domain-core/src/interfaces/producto-global.interface.ts), [`IProductoSucursal`](file:///home/ContraIXosh/Documents/POSLyon/libs/domain-core/src/interfaces/producto-sucursal.interface.ts), [`ICodigoBarra`](file:///home/ContraIXosh/Documents/POSLyon/libs/domain-core/src/interfaces/codigo-barra.interface.ts) |
| **RF-12, RF-13 y C-21** (Reconciliación de Huérfanos y Discrepancias Financieras) | Agrupación canónica de `VENTA_DETALLE` comodín | `Diagrama de Actividad de Reconciliación de Stock.md` | `File-Level Specs_ Módulo Inventario...` (§5) | [`ICodigoHuerfanoResumen`](file:///home/ContraIXosh/Documents/POSLyon/libs/domain-core/src/interfaces/codigo-huerfano-resumen.interface.ts), [`IResultadoReconciliacion`](file:///home/ContraIXosh/Documents/POSLyon/libs/domain-core/src/interfaces/resultado-reconciliacion.interface.ts) |
| **RF-02 / C-11** (Faltantes en Preparación y Guarda de Cobro) | `ALERTA_CUARENTENA` | `Diagrama de Máquina de Estados de Alerta de Cuarentena.md` | `File-Level Specs_ Módulo Inventario...` (§7b) | [`IAlertaCuarentena`](file:///home/ContraIXosh/Documents/POSLyon/libs/domain-core/src/interfaces/alerta-cuarentena.interface.ts) |
| **RF-16 / C-24** (Transferencias Inter-Sucursales en Dos Fases - 2PC) | `TRANSFERENCIA_STOCK`, `TRANSFERENCIA_DETALLE` | `Diagrama de Máquina de Estados de Transferencia de Stock.md` | `File-Level Specs_ Módulo Sincronización...` | [`ITransferenciaStock`](file:///home/ContraIXosh/Documents/POSLyon/libs/domain-core/src/interfaces/transferencia-stock.interface.ts), [`ITransferenciaDetalle`](file:///home/ContraIXosh/Documents/POSLyon/libs/domain-core/src/interfaces/transferencia-stock.interface.ts) |
| **RF-07 y RF-08** (Padrón Replicado y Movimientos de Cuenta Corriente) | `CLIENTE`, `CUENTA_CORRIENTE` | `Diagrama de Secuencia_ Flujo de Crédito y Abonos.md` | `File-Level Specs_ Módulo Cuentas Corrientes...` (§5, §6) | [`ICliente`](file:///home/ContraIXosh/Documents/POSLyon/libs/domain-core/src/interfaces/cliente.interface.ts), [`ICuentaCorriente`](file:///home/ContraIXosh/Documents/POSLyon/libs/domain-core/src/interfaces/cuenta-corriente.interface.ts) |
| **RF-09, RF-10 y RF-11** (Devoluciones Desacopladas y Notas de Crédito) | `NOTA_CREDITO`, `NOTA_CREDITO_DETALLE` | `Diagrama de secuencia de notas de crédito.md` | `File-Level Specs_ Módulo Cuentas Corrientes...` (§7, §8) | [`INotaCredito`](file:///home/ContraIXosh/Documents/POSLyon/libs/domain-core/src/interfaces/nota-credito.interface.ts), [`INotaCreditoDetalle`](file:///home/ContraIXosh/Documents/POSLyon/libs/domain-core/src/interfaces/nota-credito-detalle.interface.ts) |
| **RF-17 / O-16** (Arqueo Ciego, Movimientos y Medios de Pago) | `TURNO_CAJA`, `MOVIMIENTO_CAJA`, `METODO_PAGO` | `Diagrama de Actividad Arqueo y Cierre de Caja.md` | `File-Level Specs_ Módulo Cuentas Corrientes...` (§9) | [`ITurnoCaja`](file:///home/ContraIXosh/Documents/POSLyon/libs/domain-core/src/interfaces/turno-caja.interface.ts), [`IMovimientoCaja`](file:///home/ContraIXosh/Documents/POSLyon/libs/domain-core/src/interfaces/movimiento-caja.interface.ts), [`IMetodoPago`](file:///home/ContraIXosh/Documents/POSLyon/libs/domain-core/src/interfaces/metodo-pago.interface.ts) |
| **RF-14 y RF-15** (Mapeo de Facturas, Remitos y Motor de Márgenes) | `PROVEEDOR`, `DICCIONARIO_PROVEEDOR`, `RECEPCION_MERCADERIA` | `Diagrama de secuencia Módulo de Recepción...md` | `File-Level Specs_ Módulo Proveedores...` (§3, §4, §5, §6) | [`IProveedor`](file:///home/ContraIXosh/Documents/POSLyon/libs/domain-core/src/interfaces/proveedor.interface.ts), [`IDiccionarioProveedor`](file:///home/ContraIXosh/Documents/POSLyon/libs/domain-core/src/interfaces/diccionario-proveedor.interface.ts), [`IRecepcionMercaderia`](file:///home/ContraIXosh/Documents/POSLyon/libs/domain-core/src/interfaces/recepcion-mercaderia.interface.ts), [`ICalculoPrecioSugerido`](file:///home/ContraIXosh/Documents/POSLyon/libs/domain-core/src/interfaces/calculo-precio-sugerido.interface.ts) |
| **RF-18, RF-19 y S-07** (Cursores UTC, Auditoría Forense y Colisiones OCC) | `AUDITORIA`, `SYNC_CURSOR` | `Diagrama de Secuencia_ Flujo de Modificación con Registro de Auditoría.md` | `File-Level Specs_ Módulo Sincronización...` (§2, §3) | [`IAuditoria`](file:///home/ContraIXosh/Documents/POSLyon/libs/domain-core/src/interfaces/auditoria.interface.ts), [`ISyncCursor`](file:///home/ContraIXosh/Documents/POSLyon/libs/domain-core/src/interfaces/sync-cursor.interface.ts), [`ISyncPushPayload`](file:///home/ContraIXosh/Documents/POSLyon/libs/domain-core/src/interfaces/sync-payload.interface.ts), [`IConflictoOCC`](file:///home/ContraIXosh/Documents/POSLyon/libs/domain-core/src/interfaces/conflicto-occ.interface.ts), [`ISyncEngineStrategy`](file:///home/ContraIXosh/Documents/POSLyon/libs/domain-core/src/interfaces/sync-strategy.interface.ts) |

---

## 2. 🎓 Cátedra de Ingeniería de Sistemas (Explicación de 0 a 100)

### 2.1. ¿Por qué usamos `interface` en lugar de `class` en el Núcleo de Dominio? (Contratos Puros vs. Instancias)
En TypeScript y Teoría de Tipos:
- Una `class` genera código JavaScript ejecutable en tiempo de ejecución (funciones constructoras, prototipos en memoria y overhead de instanciación).
- Una `interface` es un **Contrato Estático Inmaterial**: existe únicamente en tiempo de compilación para que el compilador verifique que ningún objeto viole las propiedades requeridas, pero **pesa exactamente 0 KB** en el JavaScript final (*Zero Runtime Overhead*).
- **❌ El Mal Diseño (Enfoque Novato):** Declarar entidades pesadas de base de datos (`@Entity() class Venta`) directamente en la librería compartida. Si la app móvil (React Native) o la caja desktop (Electron) importan esas clases, intentan arrastrar todo el motor de base de datos de servidor (TypeORM/PostgreSQL), haciendo explotar el empaquetado del frontend.
- **✅ El Diseño de Ingeniería (Contratos Inmutables Desacoplados):** En `libs/domain-core` definimos `interface IVenta`. Tanto el modelo de base de datos de PostgreSQL en NestJS (`VentaEntity implements IVenta`), como el modelo de SQLite en WatermelonDB (`VentaModel implements IVenta`), como el estado global de React en Zustand (`interface CarritoState { venta: IVenta }`) respetan el mismo contrato tipado sin conocerse entre sí (Inversión de Dependencias - DIP de SOLID).

---

### 2.2. Anatomía Técnica: Patrones, Principios SOLID, Anti-Patrones y Teoría de Sistemas

#### A. El Patrón *Price Snapshotting* (Congelamiento de Precios) en [`IVentaDetalle`](file:///home/ContraIXosh/Documents/POSLyon/libs/domain-core/src/interfaces/venta-detalle.interface.ts)
Observa los campos:
```typescript
precio_unitario: number; // Snapshot inmutable del precio lista de góndola
monto_descuento: number; // Descuento aditivo aplicado por motor de promociones
```
- **Fundamento Teórico Formal:** **Inmutabilidad de Transacciones Comerciales y Desacoplamiento de Descuentos Aditivos (Auditable Financial State)**.
- **❌ El Mal Diseño (Enfoque Novato — Precio Dinámico Reactivo):**
  - El novato almacena únicamente `id_producto` y `cantidad` en `VENTA_DETALLE`. Para calcular el total de la venta, hace un `JOIN producto_sucursal` y lee el precio actual.
  - *¿Por qué es catastrófico?* Si el comercio aumenta los precios un 20% el día 10 del mes, ¡todas las ventas de los primeros 9 días se recalculan con el precio nuevo! Los balances contables pasados quedan corrompidos y el cajero no puede justificar el dinero que ingresó en su arqueo.
- **✅ El Diseño de Ingeniería (Enfoque Profesional en POSLyon — RF-06):**
  - En el milisegundo en que el código de barras es escaneado en mostrador, el sistema copia el valor de lista y lo congela en `precio_unitario`. Ese valor se vuelve **eterno e inmutable**.
  - Si aplica una promoción (ej. 20% OFF o 2x1), el valor del descuento se asienta por separado en `monto_descuento`.
  - Cuando el cliente regresa dos semanas después con su ticket para devolver 1 producto (**RF-09**), el sistema lee el `precio_unitario` original y el `monto_descuento` original, calculando con precisión de centavos el reembolso exacto que pagó el cliente.

#### B. Invariancia de Esquema $N=1$ (*Upgrade-Ready Architecture*) en [`IProductoSucursal`](file:///home/ContraIXosh/Documents/POSLyon/libs/domain-core/src/interfaces/producto-sucursal.interface.ts) y [`IConfiguracionSucursal`](file:///home/ContraIXosh/Documents/POSLyon/libs/domain-core/src/interfaces/configuracion-sucursal.interface.ts)
- **Fundamento Teórico Formal:** **Invariancia Relacional en Sistemas Multi-Sede Evolutivos (SaaS Topology)**.
- **❌ El Mal Diseño (Enfoque Novato — Esquemas Diferentes por Plan Comercial):**
  - Crear una tabla `PRODUCTO` simple (con `precio` y `stock` en la misma fila) para el cliente que compra el software para 1 solo local (Plan Básico), y crear otra base de datos con `PRODUCTO_GLOBAL` y `PRODUCTO_SUCURSAL` para el cliente de 5 sucursales (Plan Superior).
  - *¿Por qué falla?* Cuando el dueño del kiosco abre su segunda sucursal y quiere subir a la nube, migrar sus datos rompe todos los IDs, destruye las relaciones de tickets viejos y exige un script de migración artesanal y riesgoso.
- **✅ El Diseño de Ingeniería (Enfoque Profesional en POSLyon — Regla $N=1$):**
  - Tanto en el Plan Básico Monosucursal como en el Plan Superior Cloud, la base de datos tiene **exactamente el mismo esquema relacional con UUIDv4**.
  - En el Plan Básico, `IProductoSucursal` se enlaza automáticamente a una fila por defecto (`id_sucursal_default`). La interfaz gráfica oculta los selectores de sucursal.
  - Cuando el comercio compra el Plan Superior, simplemente activa `plan_activo = PlanComercial.SUPERIOR_CLOUD` y su base de datos local SQLite sube todo su catálogo e historial a PostgreSQL en el primer Push de sincronización **sin modificar ni una sola tabla**.

#### C. Algoritmo de Preservación de Markup Histórico en [`ICalculoPrecioSugerido`](file:///home/ContraIXosh/Documents/POSLyon/libs/domain-core/src/interfaces/calculo-precio-sugerido.interface.ts)
Observa los campos calculados:
$$\text{Markup Histórico} = \frac{\text{precio\_minorista\_anterior} - \text{costo\_anterior}}{\text{costo\_anterior}}$$
$$\text{precio\_sugerido} = \text{costo\_nuevo} \times (1 + \text{Markup Histórico})$$
- **Fundamento Teórico Formal:** **Preservación Automática del Margen Bruto Comercial (*Gross Margin Preservation Engine*)**.
- **❌ El Mal Diseño (Enfoque Novato):** Cuando el proveedor entrega mercadería con aumento de precio, el sistema le pide al encargado que invente un precio nuevo de memoria o le aplica un porcentaje fijo (ej. 30%) a todos los artículos por igual.
  - *¿Por qué falla?* En un comercio real, los cigarrillos tienen 8% de margen, los lácteos 25% y las golosinas 65%. Un porcentaje fijo rompe la rentabilidad del negocio.
- **✅ El Diseño de Ingeniería (Enfoque Profesional en POSLyon — RF-15):**
  - El motor lee el historial real de esa sucursal, deduce el margen que el dueño siempre le aplicó a ese producto específico y sugiere el nuevo precio exacto para que el comercio no pierda poder adquisitivo frente a la inflación.

#### D. Desacoplamiento Temporal en Devoluciones ([`INotaCredito`](file:///home/ContraIXosh/Documents/POSLyon/libs/domain-core/src/interfaces/nota-credito.interface.ts))
Observa los dos identificadores temporales clave:
```typescript
id_venta: string; // Venta histórica vinculada (inmutable)
id_turno_caja: string; // Turno ACTIVO hoy donde impacta el arqueo
```
- **Fundamento Teórico Formal:** **Desacoplamiento Causal-Temporal en Transacciones Compensatorias (*Compensating Transactions*)**.
- **❌ El Mal Diseño (Enfoque Novato):** Al procesar una devolución, el novato busca la venta original emitida hace 2 semanas y le resta el producto o altera el dinero del turno de hace 2 semanas.
  - *¿Por qué colapsa?* Porque el turno de hace 2 semanas ya fue arqueado, cerrado, declarado ante el fisco y auditado. Modificarlo descuadra los balances contables pasados.
- **✅ El Diseño de Ingeniería (RF-09 / RF-10):**
  - La venta original es **sagrada e inmutable** (`tiene_devolucion_parcial = true`).
  - La devolución genera una entidad formal independiente (`INotaCredito`) que apunta a la venta original para validar precios y cantidades, pero se imputa financieramente en el `id_turno_caja` del cajero que está en la caja **hoy**, reflejando la salida real de billetes de la gaveta actual.

---

### 2.3. Bitácora de Decisiones Arquitectónicas (ADR)
- **Componente / Archivos:** `libs/domain-core/src/interfaces/*.interface.ts` (28 contratos inmutables de dominio) y exportación en `index.ts`.
- **Requisito SDD Vinculado:** Capítulos 1 al 5 de las *File-Level Specs* y ERS POSLyon.
- **Decisión Tomada:** Utilización de `interface` de TypeScript con atributos estrictos (`readonly` conceptual), tipos primitivos estándar (`string` para UUIDv4 e ISO 8601 UTC, `number` para cantidades y monedas) y composición fuerte sin dependencias de librerías externas.
- **Alternativas Descartadas y Justificación Técnica:**
  - *Alternativa A (Utilizar tipos `Date` nativos de JavaScript en lugar de `string` ISO 8601):* Descartado. En aplicaciones distribuidas (Node.js $\to$ JSON $\to$ SQLite / PostgreSQL $\to$ WebSockets), los objetos `Date` sufren mutaciones de zona horaria imprevistas según el sistema operativo (Fedora vs Windows). Los strings formateados en estándar **ISO 8601 UTC con milisegundos (`YYYY-MM-DDTHH:mm:ss.sssZ`)** son universalmente serializables, comparables lexicográficamente y seguros ante desfases de reloj (*Clock Skew Protection* - S-10).
  - *Alternativa B (Crear una clase base abstracta `BaseEntity` con herencia):* Descartado. La herencia rígida de clases acopla el dominio a mecanismos de herencia de un lenguaje. El uso de interfaces permite composición flexible y *Duck Typing* seguro en tiempo de compilación.
- **Fundamento Teórico de Sistemas:** *Interface Segregation Principle* (ISP de SOLID), *Zero-Cost Abstractions*, Inversión de Dependencias (DIP), Estándar ISO 8601 UTC y Arquitectura Hexagonal (*Ports & Adapters*).
- **Riesgo / Trade-off Aceptado:** Al no usar clases con métodos en el dominio puro, la lógica de validación de negocio se traslada a los DTOs y a los Servicios Puros de Dominio, lo cual es deliberado para preservar la separación de responsabilidades y permitir testeo unitario puro sin dependencias.

---

## 3. 🧪 Verificación Empírica (Compilación de Tipos de Dominio)
- Verificado el árbol completo de 28 interfaces y 18 enumeraciones sin errores circulares ni tipos huérfanos en [`libs/domain-core/src/index.ts`](file:///home/ContraIXosh/Documents/POSLyon/libs/domain-core/src/index.ts).
