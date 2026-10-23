# 🧭 Reporte de Trazabilidad e Ingeniería: 05 — Servicios Puros de Dominio, Reglas Matemáticas y Suite Unitaria Nivel 1

> **Fecha:** 2026-10-23  
> **Nivel de Acoplamiento:** Nivel 0 — Núcleo de Dominio Puro (`libs/domain-core`, *Functional Core* con $C_e = 0$)  
> **Estado:** Implementado y Verificado (`32/32` tests unitarios en verde, `95.57%` de cobertura de líneas)

---

## 1. 🔗 Matriz de Trazabilidad Bidireccional (De la Especificación al Código)

| Requisito (ERS / PAT) | Entidad / Campo (ERD) | Diagrama UML (Secuencia / Estado) | File-Level Spec | Archivo y Símbolo Implementado |
| :--- | :--- | :--- | :--- | :--- |
| **RF-05, RF-07, RF-08 y C-10** (Validación de Cupo de Fiado sobre Delta y Merge Aditivo OCC Post-Sync) | `CLIENTE` (`limite_credito`, `saldo_deudor`, `version`), `CUENTA_CORRIENTE` (`monto`) | `Diagrama de Secuencia_ Flujo de Crédito y Abonos.md` y `Resolución de Conflicto OCC con Merge Aditivo.md` | `File-Level Specs_ Módulo Cuentas Corrientes...` (§12b `validar-margen-credito.ts`) | [`validar-margen-credito.rule.ts`](file:///d:/Contr/Archivos/POSLyon-Monolitico/libs/domain-core/src/rules/validar-margen-credito.rule.ts) (`validarMargenCredito`, `calcularMergeAditivoOCC`) |
| **RF-02, RF-04, C-11, C-12 y O-26** (Guarda de Cobro en `INCOMPLETO`, Stock Permisivo Universal y Packs) | `VENTA.estado_logistico`, `PRODUCTO_GLOBAL` (`id_producto_base`, `multiplicador_stock`), `PRODUCTO_SUCURSAL` | `Diagrama de Máquina de Estados de Venta.md` y `Diagrama de Entidad-Relación (ERD).md` | `File-Level Specs_ Módulo Core POS.md` (§3b, §3e, §3b-local) | [`guardas-venta-y-stock.rule.ts`](file:///d:/Contr/Archivos/POSLyon-Monolitico/libs/domain-core/src/rules/guardas-venta-y-stock.rule.ts) (`validarPuedeCobrar`, `validarDisponibilidadParaVenta`, `calcularDescuentoStockPack`, `calcularStockVirtualPack`) |
| **RF-15 y O-17** (Preservación Automática de Margen Histórico y Discrepancias en Remitos) | `PRODUCTO_SUCURSAL` (`precio_costo`, `precio_minorista`), `RECEPCION_MERCADERIA_DETALLE` | `Diagrama de secuencia Módulo de Recepción de Mercadería...md` (Secuencias #2 y #3) | `File-Level Specs_ Módulo Proveedores...` (§9 `margen-precios.service.ts`) | [`margen-precios.domain-service.ts`](file:///d:/Contr/Archivos/POSLyon-Monolitico/libs/domain-core/src/services/margen-precios.domain-service.ts) (`MargenPreciosDomainService.calcular`, `evaluarDiscrepanciaRecepcion`) |
| **RF-09, RF-10, C-01..C-04, O-15, O-19, S-08 y S-09** (Reembolso Neto Promocional, Compensación Mixta y Correlativo NC) | `NOTA_CREDITO`, `NOTA_CREDITO_DETALLE`, `CLIENTE`, `MOVIMIENTO_CAJA` | `Diagrama de secuencia de notas de crédito.md` | `File-Level Specs_ Módulo Cuentas Corrientes...` (§14 `devoluciones-local.service.ts`) | [`devoluciones.domain-service.ts`](file:///d:/Contr/Archivos/POSLyon-Monolitico/libs/domain-core/src/services/devoluciones.domain-service.ts) (`DevolucionesDomainService.calcularReembolsoNetoItem`, `calcularCompensacionFinanciera`, `esReintegrableAInventarioVendible`, `generarNumeroComprobanteNC`) |
| **RF-13, C-18, C-21, C-23 y O-27** (Fórmula de Stock Inicial en Reconciliación, Doble Nivel de Mermas y Cuarentena) | `PRODUCTO_SUCURSAL.stock_fisico`, `VENTA_DETALLE`, `ALERTA_CUARENTENA`, `AUDITORIA` | `Diagrama de secuencia de limpieza de productos de venta rápida.md` y `Diagrama de Actividad de Reconciliación de Stock.md` | `File-Level Specs_ Módulo Inventario...` (§10 `reconciliacion.service.ts`, §11 `cuarentena.service.ts`) | [`reconciliacion.domain-service.ts`](file:///d:/Contr/Archivos/POSLyon-Monolitico/libs/domain-core/src/services/reconciliacion.domain-service.ts) (`ReconciliacionDomainService.calcularStockInicialReconciliacion`, `evaluarDiscrepanciaPrecioRenglon`, `consolidarBalancesPorTurno`, `generarClaveAgrupamientoHuerfano`, `calcularStockPostCuarentena`) |
| **RF-02, RF-17, C-13, C-14, O-23 y S-10** (Protección contra Clock Skew Offline y Fórmula Canónica de Arqueo Ciego) | `VENTA.fecha_expiracion_reserva`, `TURNO_CAJA` (`efectivo_declarado`, `diferencia_caja`), `MOVIMIENTO_CAJA` | `Diagrama de Secuencia Proceso de Garbage Collection...md` y `Diagrama de Actividad Arqueo y Cierre de Caja.md` | `File-Level Specs_ Módulo Core POS.md` (§3f `garbage-collection.service.ts`) | [`reloj-y-arqueo.domain-service.ts`](file:///d:/Contr/Archivos/POSLyon-Monolitico/libs/domain-core/src/services/reloj-y-arqueo.domain-service.ts) (`RelojMonotonoGuard`, `ArqueoCiegoDomainService.calcularArqueoTurno`) |

---

## 2. 🎓 Cátedra de Ingeniería de Sistemas (Explicación de 0 a 100)

### 2.1. ¿Qué construimos y por qué aplicamos el patrón *Functional Core, Imperative Shell*?
Con el Paso 0.5 cerramos el **Nivel 0 (`libs/domain-core`)** implementando el corazón algorítmico y matemático de **POSLyon**.
En Ingeniería de Software de alta confiabilidad, Gary Bernhardt formuló el patrón arquitectónico **Functional Core, Imperative Shell (Núcleo Funcional Puro, Cáscara Imperativa)**:
- **El Núcleo Funcional (`libs/domain-core/src/rules/` y `services/`):** Contiene el 100% de las ecuaciones financieras, fórmulas de stock, reglas de decisión y guardas de seguridad escritas como **funciones puras deterministas** (dado el mismo input, producen siempre el mismo output, sin mutar variables globales, sin hacer consultas SQL ni llamadas HTTP).
- **La Cáscara Imperativa (`apps/pos-desktop` y `apps/backend-cloud`):** Solo lee datos de SQLite o PostgreSQL, invoca al Núcleo Funcional Puro para que tome las decisiones matemáticas, y persiste el resultado dentro de una transacción `BEGIN ... COMMIT`.
- **¿Por qué esto es oro puro en un sistema *Local-First*?**
  1. **Cero divergencia entre Caja Local y Nube:** La fórmula que calcula una devolución promocional o un precio sugerido en la PC del cajero sin internet (SQLite) es **exactamente la misma función compilada** que ejecuta el servidor central en la nube (PostgreSQL).
  2. **Velocidad extrema de verificación (Nivel 1 de la Pirámide de Testing):** Nuestros 32 tests unitarios verifican todas las reglas críticas del negocio en menos de 3 segundos en memoria RAM, sin necesitar levantar contenedores Docker ni simular bases de datos.

---

### 2.2. Anatomía Técnica: Patrones, Principios SOLID, Anti-Patrones y Teoría de Sistemas

#### A. Reembolso Neto Promocional (RF-09 / C-04) y Compensación Mixta de Deuda Residual (RF-10 / C-01..C-03) en [`DevolucionesDomainService`](file:///d:/Contr/Archivos/POSLyon-Monolitico/libs/domain-core/src/services/devoluciones.domain-service.ts)
Analicemos dos vulnerabilidades financieras clásicas que ocurren en sistemas POS mal diseñados cuando un cliente devuelve mercadería:

1. **Vulnerabilidad 1: El Arbitraje de Promociones (Resolución C-04):**
   - Imagina que una gaseosa cuesta \$1.500 de lista, pero hay una promoción que descuenta \$500 llevando 2 unidades (el cliente pagó $\$3.000 - \$500 = \$2.500$ por las 2 botellas, es decir, \$1.250 efectivos cada una).
   - **❌ El Mal Diseño (Enfoque Novato):** Al devolver 1 botella, el sistema multiplica `1 * precio_unitario ($1.500)` y le devuelve \$1.500 al cliente. ¡El comercio pierde \$250 por cada devolución!
   - **✅ El Diseño de Ingeniería (`calcularReembolsoNetoItem`):** Prorratea matemáticamente el descuento original sobre la cantidad comprada:
     $$\text{descuento\_unitario} = \frac{500}{2} = \$250 \implies \text{subtotal\_reembolso\_neto} = (1 \times \$1.500) - \$250 = \$1.250$$
     Además, aplica la guarda anti-doble devolución (**Resolución O-19**): verifica que `cantidad_a_devolver <= cantidad_original - cantidad_previa_devuelta`.

2. **Vulnerabilidad 2: El Saldo Deudor Negativo y la Doble Compensación (Resoluciones C-01, C-02 y C-03):**
   - Imagina un cliente que debe \$1.000 en su Cuenta Corriente (`saldo_deudor = 1000`) y viene a devolver mercadería por valor de \$5.000.
   - **❌ El Mal Diseño (Enfoque Novato):**
     - Si le permites elegir `REDUCCION_DEUDA` pura y haces `1000 - 5000 = -4000`, violas el invariante de dominio `saldo_deudor >= 0` (**C-02**).
     - Si le devuelves \$5.000 en billetes y además le bajas la deuda de \$1.000 a \$0, le estás regalando \$6.000 por una devolución de \$5.000 (**C-03**).
   - **✅ El Diseño de Ingeniería (`calcularCompensacionFinanciera` — RF-10):**
     - Si intenta `REDUCCION_DEUDA` con `saldo_deudor ($1.000) < devolucion ($5.000)`, lanza excepción bloqueando la opción y forzando `EFECTIVO_CAJA`.
     - En `EFECTIVO_CAJA`, aplica la **Compensación Mixta de Deuda Residual**:
       $$\text{monto\_compensado\_deuda} = \min(\$1.000, \$5.000) = \$1.000$$
       $$\text{monto\_egreso\_efectivo\_caja} = \$5.000 - \$1.000 = \$4.000$$
       El cliente queda con deuda \$0.00 en su cuenta corriente y recibe \$4.000 en billetes de la gaveta actual (total exacto de \$5.000 compensados).

#### B. Ecuación de Reconciliación de Stock (RF-13 / C-18) y Doble Nivel de Auditoría (C-21) en [`ReconciliacionDomainService`](file:///d:/Contr/Archivos/POSLyon-Monolitico/libs/domain-core/src/services/reconciliacion.domain-service.ts)
Cuando llega al comercio un producto nuevo que aún no estaba cargado en el catálogo, los cajeros lo venden usando el **Artículo Comodín** (`00000000-0000-0000-0000-000000000000`). Supongamos que durante la mañana se vendieron **6 unidades** y a la tarde el Administrador va a la estantería, cuenta que quedan **15 unidades físicas** y decide crear el producto oficial (**RF-13**):
- **❌ El Mal Diseño (Enfoque Novato — Insertar 15 y luego descontar las 6 ventas históricas):**
  - Si el sistema inserta el producto con `stock_fisico = 15` (lo que el administrador contó hoy en la góndola) y acto seguido procesa las 6 ventas de la mañana haciendo `15 - 6 = 9`, el stock del sistema queda en **9 unidades** cuando en la estantería real hay **15 unidades** ( porque esas 6 unidades ya habían salido de la estantería a la mañana antes del conteo).
- **✅ El Diseño de Ingeniería (`calcularStockInicialReconciliacion` — Resolución C-18):**
  - El motor deduce retroactivamente cuál era el stock inicial antes de esas ventas históricas:
    $$\text{stock\_inicial\_calculado} = \text{stock\_fisico\_actual} (15) + \text{unidades\_vendidas\_historicas} (6) = 21$$
  - Al reasignar los tickets pasados y descontar las 6 unidades vendidas ($21 - 6 = 15$), la trazabilidad contable queda perfecta y el stock final coincide 1:1 con las 15 unidades reales de la estantería.
- Asimismo, [`consolidarBalancesPorTurno`](file:///d:/Contr/Archivos/POSLyon-Monolitico/libs/domain-core/src/services/reconciliacion.domain-service.ts#L105-L152) implementa el **Doble Nivel de Auditoría Financiera (Resolución C-21)**: si en el Turno 1 un cajero cobró 4 unidades a \$1.200 (oficial \$1.300 $\to -\$400$ de merma lógica) y otro cobró 1 unidad a \$1.400 ($+\$100$ de sobrante lógico), consolida para el arqueo del Turno 1: `merma_acumulada = -400`, `sobrante_acumulado = +100` y `balance_neto = -300`.

#### C. Conmutatividad en Concurrencia Optimista: Merge Aditivo OCC (C-10 y RF-07) en [`validar-margen-credito.rule.ts`](file:///d:/Contr/Archivos/POSLyon-Monolitico/libs/domain-core/src/rules/validar-margen-credito.rule.ts)
- **Fundamento Teórico Formal:** **Tipos de Datos Replicados Libres de Conflictos (*State-based vs. Operation-based CRDTs / PN-Counters*) y Prevención de *Lost Updates***.
- **❌ El Mal Diseño (Enfoque Novato — Sobrescritura por Estado Absoluto):**
  - El cliente Juan tiene `saldo_deudor = $50.000` (`version = 2`).
  - La Caja 1 queda sin internet y Juan compra \$30.000 fiado (la Caja 1 calcula localmente `saldo_deudor = $80.000`).
  - Mientras tanto, en la Sucursal 2 (con internet), Juan abona \$20.000 en efectivo (la Nube actualiza `saldo_deudor = $30.000`, `version = 3`).
  - Cuando vuelve internet en la Caja 1, si el servidor hace `UPDATE cliente SET saldo_deudor = 80000`, **acaba de borrar el abono de \$20.000 que Juan pagó en la Sucursal 2** (*Lost Update*).
- **✅ El Diseño de Ingeniería (`calcularMergeAditivoOCC` — Resolución C-10):**
  - En lugar de pisar el saldo con `$80.000`, el motor aplica el **Delta Aditivo** ($\Delta = +\$30.000$) sobre el saldo autoritativo actual de la nube (`$30.000`):
    $$\text{nuevo\_saldo\_consolidado} = \$30.000 + \$30.000 = \$60.000$$
  - Como la suma algebraica es **conmutativa y asociativa** ($(50 - 20) + 30 = (50 + 30) - 20 = 60$), jamás se pierde ni un centavo de abonos ni de ventas concurrentes. Y si el resultado supera el `limite_credito` vigente en la nube, activa `requiere_auditoria_exceso = true` para insertar `EXCESO_LIMITE_CREDITO_POST_SYNC` con `UUID_SYSTEM_BOT` sin anular la venta presencial (**RF-07**).

#### D. Relojes Monótonos de Hardware vs. Relojes de Pared (*Clock Skew Guard* - S-10) en [`RelojMonotonoGuard`](file:///d:/Contr/Archivos/POSLyon-Monolitico/libs/domain-core/src/services/reloj-y-arqueo.domain-service.ts)
- **Fundamento Teórico Formal:** **Relojes Físicos vs. Relojes Monótonos en Sistemas Distribuidos (Sincronización de Cristian / Lamport High Watermark)**.
- **❌ El Mal Diseño (Enfoque Novato — Confiar en `new Date()` o `Date.now()` en una PC Offline):**
  - `Date.now()` consulta el reloj de pared del Sistema Operativo (*Wall-Clock Time*). Si un empleado malintencionado desconecta el cable de red y atrasa el reloj de Windows 4 horas (de las 14:00 a las 10:00), cualquier carrito con `fecha_expiracion_reserva = 14:30` tardará 4 horas y media en vencer, bloqueando mercadería reservada, o permitirá emitir tickets con hora adulterada.
- **✅ El Diseño de Ingeniería (`RelojMonotonoGuard` — Resolución S-10):**
  - Combina dos fuentes inalterables por el usuario estándar:
    1. **Reloj Monótono de Hardware (`performance.now()`):** Mide los milisegundos transcurridos desde que arrancó el proceso usando contadores de alta resolución del procesador (`QueryPerformanceCounter` en Windows / `CLOCK_MONOTONIC` en Linux), los cuales **no cambian aunque el usuario cambie la hora de Windows**.
    2. **Guarda *High Watermark* de Base de Datos (`highWatermarkIso`):** Al iniciar la app, lee la fecha más alta registrada en `VENTA` o `AUDITORIA` (ej. `14:00:00.000Z`). Si el empleado reinicia la PC y atrasa el reloj desde la BIOS a las `12:00:00.000Z`, `obtenerTiempoConfiable()` detecta instantáneamente que `tiempoEstimadoMs < highWatermarkMs`, activa el flag `desfaseRegresivoDetectado = true` y fuerza el reloj a `14:00:01.000Z` (`highWatermark + 1s`), garantizando monotonía estricta ($t_{n+1} > t_n$).

---

### 2.3. Bitácora de Decisiones Arquitectónicas (ADR)
- **Componente / Archivos:** `libs/domain-core/src/rules/*.rule.ts`, `libs/domain-core/src/services/*.domain-service.ts` y `libs/domain-core/src/services/servicios-puros-dominio.spec.ts`.
- **Requisito SDD Vinculado:** Fase 4 (*Pirámide de Testing Nivel 1*) y Capítulos 1 al 5 de los *File-Level Specs*.
- **Decisión Tomada:** Desacoplar las fórmulas matemáticas y máquinas de decisión en clases/funciones puras dentro de `@poslyon/domain-core` sin dependencias a TypeORM ni WatermelonDB.
- **Alternativas Descartadas y Justificación Técnica:**
  - *Alternativa A (Escribir los cálculos matemáticos incrustados dentro de las consultas SQL o dentro de los servicios acoplados a TypeORM/WatermelonDB):* Descartado. Incrustar fórmulas de negocio dentro de repositorios de base de datos obliga a duplicar la misma lógica en `apps/pos-desktop` (para SQLite) y en `apps/backend-cloud` (para PostgreSQL), duplicando el riesgo de bugs y haciendo que los tests unitarios sean lentos y frágiles.
  - *Alternativa B (Usar aritmética de punto flotante cruda IEEE 754 sin normalización decimal):* Descartado. En JavaScript, `0.1 + 0.2 === 0.30000000000000004`. En todos nuestros servicios puros normalizamos los resultados monetarios a 2 decimales (`Number(valor.toFixed(2))`) y las cantidades fraccionables/pesables a 4 decimales (`Number(valor.toFixed(4))`), evitando errores de redondeo acumulados en los arqueos de caja.
- **Trade-off Aceptado y Mitigación:** `RelojMonotonoGuard` mantiene en memoria el anclaje `t0RealMs`, `t0MonotonicMs` y `highWatermarkIso`, por lo que al instanciarse en `GarbageCollectionService` (en `apps/pos-desktop`) debe alimentarse inicialmente con el `MAX(fecha)` leído de SQLite, tal como está especificado en el File-Level Spec de Core POS (§3f).

---

## 3. 🧪 Verificación Empírica (Suite Unitaria Nivel 1 en Jest)
- **Comandos ejecutados:**
  ```powershell
  npm run build:domain
  npx jest --coverage
  ```
- **Métricas de Cobertura Alcanzadas en `@poslyon/domain-core`:**
  - **Statements:** `95.29%` (Supera holgadamente el umbral del `85%` exigido en Fase 4)
  - **Functions:** `97.87%`
  - **Lines:** `95.57%`
  - **Total Tests Aprobados:** `32 / 32` (`2/2` suites en verde)
- **Casos probados en [`servicios-puros-dominio.spec.ts`](file:///d:/Contr/Archivos/POSLyon-Monolitico/libs/domain-core/src/services/servicios-puros-dominio.spec.ts):**
  1. **Test 1.1 (`MargenPreciosDomainService`):** Verifica que si el costo sube de \$1.000 a \$1.400 y el precio anterior era \$1.500 (50% markup), el precio sugerido sea exactamente \$2.100; verifica fallback al 30% cuando el costo previo es 0; y valida la clasificación `FALTANTE`, `SOBRANTE`, `CONFORME` y `RECHAZADO_CALIDAD` (O-17).
  2. **Test 1.2 (`DevolucionesDomainService` — Guarda contra Saldo Deudor Negativo C-01/C-02):** Verifica que intentar `REDUCCION_DEUDA` por \$12.000 cuando `saldo_deudor = $5.000` arroje excepción forzando `EFECTIVO_CAJA`.
  3. **Test 1.2b (`DevolucionesDomainService` — Compensación Mixta RF-10 / C-03):** Verifica que una devolución de \$5.000 en `EFECTIVO_CAJA` para un cliente con deuda de \$1.000 amortice la deuda a \$0 y emita un egreso de caja por \$4.000.
  4. **Test 1.2c (`DevolucionesDomainService` — Reembolso Neto Promocional RF-09 / C-04):** Verifica que al devolver 1 unidad de una compra de 2 unidades a \$1.500 con \$500 de descuento total, se reembolsen exactamente \$1.250 (y no \$1.500).
  5. **Control Anti-Doble Devolución (O-19), Reingreso Condicionado (S-08), Correlativo NC (S-09) y Ventas en `PENDIENTE` (O-15):** Todos verificados con pruebas positivas y negativas.
  6. **Test 1.3 (`ReconciliacionDomainService` — Deducción Matemática C-18, Doble Nivel C-21, Clave O-27 y Cuarentena C-23):** Verifica $\text{stock\_inicial} = 15 + 6 = 21 \implies 21 - 6 = 15$, consolidación de mermas/sobrantes por turno (`-400 + 100 = -300`), clave `SIN_CODIGO:pan casero kg` y deducción no destructiva en cuarentena (`10 - 2 = 8`).
  7. **Guardas de Venta (`C-11`, `C-12`), Packs (`O-26`), Merge Aditivo OCC (`C-10`), `RelojMonotonoGuard` (`S-10`) y `ArqueoCiegoDomainService` (`RF-17 / O-23`):** Verificados integralmente.
