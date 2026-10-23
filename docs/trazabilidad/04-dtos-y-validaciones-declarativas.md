# 🧭 Reporte de Trazabilidad e Ingeniería: 04 — DTOs con Validaciones Declarativas y Decorador `@IsUUIDOrNil` (Módulos 1 al 5)

> **Fecha:** 2026-10-23  
> **Nivel de Acoplamiento:** Nivel 0 — Núcleo de Dominio Puro (`libs/domain-core`, Validación Perimetral Declarativa)  
> **Estado:** Implementado y Verificado (`13/13` tests unitarios en verde)

---

## 1. 🔗 Matriz de Trazabilidad Bidireccional (De la Especificación al Código)

| Requisito (ERS / PAT) | Entidad / Campo (ERD) | Diagrama UML (Secuencia / Estado) | File-Level Spec | Archivo y Símbolo Implementado |
| :--- | :--- | :--- | :--- | :--- |
| **Resolución S-03, RF-12 y RF-19** (Soporte de Nil UUID Comodín y `SYSTEM_BOT` en validadores) | `PRODUCTO_GLOBAL.id`, `VENTA_DETALLE.id_producto`, `AUDITORIA.id_usuario` | `Diagrama de Actividad_ Resolución de Creación Offline_ El _Producto Comodín_.md` | `File-Level Specs_ Módulo Cuentas Corrientes...` (§11 `is-uuid-or-nil.decorator.ts`) | [`is-uuid-or-nil.decorator.ts`](file:///d:/Contr/Archivos/POSLyon-Monolitico/libs/domain-core/src/validators/is-uuid-or-nil.decorator.ts) (`IsUUIDOrNil`, `RESERVED_UUIDS`, `esUuidV4OReservado`) |
| **RF-01, RF-05 y RF-17** (Creación de Venta, Pagos Mixtos y Fijación de Turno) | `VENTA`, `PAGO_VENTA` (`id_turno_caja`, `id_metodo_pago`, `monto`) | `Diagrama de Secuencia de Flujo de Pago Mixto (Abono Rápido + Fiado).md` | `File-Level Specs_ Módulo Core POS.md` (§2 `crear-venta.dto.ts`) | [`crear-venta.dto.ts`](file:///d:/Contr/Archivos/POSLyon-Monolitico/libs/domain-core/src/dtos/crear-venta.dto.ts) (`CrearVentaDto`, `PagoItemDto`) |
| **RF-06 / O-11** (Recálculo Dinámico de Promociones sin mutar Snapshot) | `VENTA_DETALLE` (`precio_unitario`, `monto_descuento`, `tipo_precio`) | `Diagrama de Secuencia de aplicación de promociones.md` | `File-Level Specs_ Módulo Core POS.md` (Árbol `aplicar-promocion.dto.ts`) | [`aplicar-promocion.dto.ts`](file:///d:/Contr/Archivos/POSLyon-Monolitico/libs/domain-core/src/dtos/aplicar-promocion.dto.ts) (`AplicarPromocionDto`, `ItemPromocionCarritoDto`) |
| **RF-09, RF-10, RF-11, O-15 y S-03** (Devoluciones, Notas de Crédito y Comodines Devueltos) | `NOTA_CREDITO`, `NOTA_CREDITO_DETALLE` (`id_venta`, `id_turno_caja`, `tipo_devolucion`) | `Diagrama de secuencia de notas de crédito.md` | `File-Level Specs_ Módulo Cuentas Corrientes...` (§10 `crear-devolucion.dto.ts`, §12 `item-devolucion.dto.ts`) | [`crear-devolucion.dto.ts`](file:///d:/Contr/Archivos/POSLyon-Monolitico/libs/domain-core/src/dtos/crear-devolucion.dto.ts) (`CrearDevolucionDto`), [`item-devolucion.dto.ts`](file:///d:/Contr/Archivos/POSLyon-Monolitico/libs/domain-core/src/dtos/item-devolucion.dto.ts) (`ItemDevolucionDto`) |
| **RF-07, RF-08, O-21, O-22 y RNF-04** (Abonos a Cuenta Corriente con Idempotencia y OCC) | `CUENTA_CORRIENTE`, `CLIENTE` (`version`), `MOVIMIENTO_CAJA` (`id_metodo_pago`) | `Diagrama de Secuencia_ Flujo de Crédito y Abonos.md` | `File-Level Specs_ Módulo Cuentas Corrientes...` (§13 `registrar-abono.dto.ts`) | [`registrar-abono.dto.ts`](file:///d:/Contr/Archivos/POSLyon-Monolitico/libs/domain-core/src/dtos/registrar-abono.dto.ts) (`RegistrarAbonoDto`), [`sync-cuenta-corriente-delta.dto.ts`](file:///d:/Contr/Archivos/POSLyon-Monolitico/libs/domain-core/src/dtos/sync-cuenta-corriente-delta.dto.ts) (`SyncCuentaCorrienteDeltaDto`) |
| **RF-13, C-18, C-19, C-22 y O-27** (Reconciliación de Códigos Huérfanos por Sucursal) | `PRODUCTO_GLOBAL`, `PRODUCTO_SUCURSAL`, `CODIGO_BARRA`, `VENTA_DETALLE` | `Diagrama de secuencia de limpieza de productos de venta rápida.md` | `File-Level Specs_ Módulo Inventario...` (§8 `reconciliar-codigo-huerfano.dto.ts`) | [`reconciliar-codigo-huerfano.dto.ts`](file:///d:/Contr/Archivos/POSLyon-Monolitico/libs/domain-core/src/dtos/reconciliar-codigo-huerfano.dto.ts) (`ReconciliarCodigoHuerfanoDto`) |
| **RF-02, C-11 y C-23** (Resolución de Cuarentena y Ajuste Manual Auditado) | `ALERTA_CUARENTENA` (`estado`), `PRODUCTO_SUCURSAL` (`stock_fisico`, `version`) | `Diagrama de Máquina de Estados de Alerta de Cuarentena.md` | `File-Level Specs_ Módulo Inventario...` (§9 `resolver-cuarentena.dto.ts`) | [`resolver-cuarentena.dto.ts`](file:///d:/Contr/Archivos/POSLyon-Monolitico/libs/domain-core/src/dtos/resolver-cuarentena.dto.ts) (`ResolverCuarentenaDto`), [`ajustar-stock-manual.dto.ts`](file:///d:/Contr/Archivos/POSLyon-Monolitico/libs/domain-core/src/dtos/ajustar-stock-manual.dto.ts) (`AjustarStockManualDto`) |
| **RF-14, RF-15 y O-17** (Diccionario de Proveedores y Confirmación de Recepción) | `DICCIONARIO_PROVEEDOR`, `RECEPCION_MERCADERIA`, `RECEPCION_MERCADERIA_DETALLE` | `Diagrama de secuencia Módulo de Recepción de Mercadería...md` | `File-Level Specs_ Módulo Proveedores...` (§7 `vincular-diccionario.dto.ts`, §8 `confirmar-recepcion.dto.ts`) | [`vincular-diccionario.dto.ts`](file:///d:/Contr/Archivos/POSLyon-Monolitico/libs/domain-core/src/dtos/vincular-diccionario.dto.ts), [`crear-recepcion.dto.ts`](file:///d:/Contr/Archivos/POSLyon-Monolitico/libs/domain-core/src/dtos/crear-recepcion.dto.ts), [`agregar-renglon-recepcion.dto.ts`](file:///d:/Contr/Archivos/POSLyon-Monolitico/libs/domain-core/src/dtos/agregar-renglon-recepcion.dto.ts), [`confirmar-recepcion.dto.ts`](file:///d:/Contr/Archivos/POSLyon-Monolitico/libs/domain-core/src/dtos/confirmar-recepcion.dto.ts) |
| **RF-18, RF-19 y O-25** (Push/Pull de Deltas con Cursores ISO-8601 UTC y Auditoría Forense) | `SYNC_CURSOR` (`last_pulled_at`), `AUDITORIA` (`valor_anterior`, `valor_nuevo`) | `Diagrama de Secuencia_ Sincronización Push y Catch-Up.md` | `File-Level Specs_ Módulo Sincronización...` (§2 `sync-push.dto.ts`) | [`sync-push.dto.ts`](file:///d:/Contr/Archivos/POSLyon-Monolitico/libs/domain-core/src/dtos/sync-push.dto.ts) (`SyncPushDto`), [`sync-pull-query.dto.ts`](file:///d:/Contr/Archivos/POSLyon-Monolitico/libs/domain-core/src/dtos/sync-pull-query.dto.ts) (`SyncPullQueryDto`), [`registrar-auditoria.dto.ts`](file:///d:/Contr/Archivos/POSLyon-Monolitico/libs/domain-core/src/dtos/registrar-auditoria.dto.ts) (`RegistrarAuditoriaDto`) |

---

## 2. 🎓 Cátedra de Ingeniería de Sistemas (Explicación de 0 a 100)

### 2.1. ¿Por qué en el Paso 0.3 usamos `interface` y en el Paso 0.4 usamos `class`? (Type Erasure vs. Runtime Reflection)
Esta es una de las preguntas de examen más importantes en Ingeniería de Software moderna con TypeScript y NestJS:
- **En el Paso 0.3 (`interfaces/`):** Queríamos contratos internos de lectura/escritura con **costo cero en memoria (*Zero-Cost Abstractions*)**. Al compilar TypeScript a JavaScript, el compilador aplica **Borrado de Tipos (*Type Erasure*)** y las interfaces desaparecen por completo del archivo `.js`.
- **En el Paso 0.4 (`dtos/`):** Los **Data Transfer Objects (DTOs)** (patrón formalizado por Martin Fowler en *Patterns of Enterprise Application Architecture*) actúan como **Aduana de Seguridad Perimetral** cuando entra un JSON desconocido desde afuera (desde Postman, desde una caja registradora por HTTP o desde un formulario).
- **❌ El Mal Diseño (Enfoque Novato — Usar `interface` en el `@Body()` o validar con `if` manuales):**
  - Si un programador escribe en su controlador `@Post() crearVenta(@Body() dto: ICrearVenta)`, cuando el código corre en producción sobre Node.js (motor V8), **`ICrearVenta` ya no existe**. Si un atacante o un bug envía `{ total: -99999, id_sucursal: "DROP TABLE ventas" }`, pasa derecho hacia el servicio sin ninguna barrera.
  - Si el programador intenta solucionarlo escribiendo 40 líneas de `if (typeof body.total !== 'number' || body.total <= 0) throw ...` dentro de cada servicio, viola el **Principio de Responsabilidad Única (SRP)** y repite código de validación en diez lugares distintos.
- **✅ El Diseño de Ingeniería (Clases DTO con Metaprogramación Declarativa):**
  - Al declarar `export class CrearVentaDto`, la clase **sí sobrevive en tiempo de ejecución** como una función constructora en JavaScript.
  - Los decoradores (`@IsUUID('4')`, `@IsPositive()`, `@ValidateNested()`) registran reglas de validación en el prototipo de la clase usando `reflect-metadata`. Antes de que nuestro servicio de negocio siquiera se entere de que llegó una petición, el pipeline de validación rechaza automáticamente cualquier payload malformado con **HTTP 400 Bad Request**.

---

### 2.2. Anatomía Técnica: Patrones, Principios SOLID, Anti-Patrones y Teoría de Sistemas

#### A. El Dilema Criptográfico de RFC 4122 y el Decorador `@IsUUIDOrNil()` ([`is-uuid-or-nil.decorator.ts`](file:///d:/Contr/Archivos/POSLyon-Monolitico/libs/domain-core/src/validators/is-uuid-or-nil.decorator.ts))
Observa la expresión regular oficial de un UUIDv4 (estándar **IETF RFC 4122**):
```text
xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
              ^    ^
              |    +-- Variante RFC 4122 (bits 10xx -> 8, 9, a, b)
              +------- Versión 4 (bits 0100 -> '4' obligatorio)
```
- **Fundamento Teórico Formal:** **Gramáticas Regulares de Identificadores Universales (RFC 4122) y Principio Abierto/Cerrado (OCP) mediante Metaprogramación**.
- **❌ El Mal Diseño (Enfoque Novato — Usar `@IsUUID('4')` ciegamente en todos lados):**
  - El programador novato decora `ItemDevolucionDto.id_producto` con `@IsUUID('4')`.
  - Todo parece funcionar hasta que un cliente compra un artículo por **Venta Rápida / Comodín** (`id_producto = '00000000-0000-0000-0000-000000000000'`) y al día siguiente viene a devolverlo (**RF-09**).
  - Como el Nil UUID tiene un `'0'` en la posición número 13 en lugar de un `'4'`, `@IsUUID('4')` **rechaza la devolución con HTTP 400 Bad Request**, ¡dejando al cajero bloqueado frente al cliente sin poder devolverle su dinero!
- **✅ El Diseño de Ingeniería (Enfoque Profesional en POSLyon — Resolución S-03):**
  - Construimos el decorador customizado [`@IsUUIDOrNil()`](file:///d:/Contr/Archivos/POSLyon-Monolitico/libs/domain-core/src/validators/is-uuid-or-nil.decorator.ts) invocando `registerDecorator` de `class-validator`.
  - Su predicado [`esUuidV4OReservado()`](file:///d:/Contr/Archivos/POSLyon-Monolitico/libs/domain-core/src/validators/is-uuid-or-nil.decorator.ts#L24-L33) evalúa en tiempo constante $O(1)$ si el string coincide con `RESERVED_UUIDS.PRODUCTO_COMODIN` (`00000000-0000-0000-0000-000000000000`), con `RESERVED_UUIDS.SYSTEM_BOT` (`00000000-0000-0000-0000-000000000001`), o con la gramática estricta de un UUIDv4, rechazando cualquier otro UUID falso (como `00000000-0000-0000-0000-000000000999`).

#### B. Hidratación Recursiva de Árboles JSON (`@ValidateNested` + `@Type`) en [`CrearVentaDto`](file:///d:/Contr/Archivos/POSLyon-Monolitico/libs/domain-core/src/dtos/crear-venta.dto.ts), [`CrearDevolucionDto`](file:///d:/Contr/Archivos/POSLyon-Monolitico/libs/domain-core/src/dtos/crear-devolucion.dto.ts) y [`ConfirmarRecepcionDto`](file:///d:/Contr/Archivos/POSLyon-Monolitico/libs/domain-core/src/dtos/confirmar-recepcion.dto.ts)
Observa cómo definimos los arreglos de sub-objetos:
```typescript
@IsArray()
@ValidateNested({ each: true })
@Type(() => PagoItemDto)
pagos!: PagoItemDto[];
```
- **Fundamento Teórico Formal:** **Deserialización Dirigida por Tipos y Rehidratación de Prototipos en Árboles Sintácticos JSON**.
- **❌ El Mal Diseño (Enfoque Novato — Poner `@ValidateNested()` olvidando `@Type()`):**
  - Cuando un JSON llega por la red y pasa por `JSON.parse()`, los elementos dentro del array `pagos` son objetos literales anónimos (`Object.prototype`). Además, en TypeScript, el tipo de un array `PagoItemDto[]` se compila en `Reflect.metadata` simplemente como `Array` (sin saber de qué tipo son los elementos internos).
  - Si olvidas `@Type(() => PagoItemDto)`, `class-transformer` no instancia los hijos como `PagoItemDto`, y `ValidateNested` ignora todas las reglas internas o lanza un error desconocido.
- **✅ El Diseño de Ingeniería:**
  - Combinar `@ValidateNested({ each: true })` con `@Type(() => PagoItemDto)` instruye a `plainToInstance` a recorrer recursivamente el árbol JSON, instanciar cada elemento con `new PagoItemDto()` y verificar que ningún renglón tenga `monto <= 0` ni un `id_metodo_pago` inválido.

#### C. Validación Polimórfica Condicional (`@ValidateIf`) en [`ReconciliarCodigoHuerfanoDto`](file:///d:/Contr/Archivos/POSLyon-Monolitico/libs/domain-core/src/dtos/reconciliar-codigo-huerfano.dto.ts)
Observa cómo modelamos las dos ramas del proceso de reconciliación (**RF-13**) y la clave canónica de comodines sin código (**Resolución O-27**):
```typescript
@ValidateIf((o: ReconciliarCodigoHuerfanoDto) => o.accion === AccionReconciliacion.CREAR_NUEVO)
@IsNumber()
@Min(0)
stock_fisico_actual?: number;
```
- **Fundamento Teórico Formal:** **Tipos Suma Discriminados (*Discriminated Unions*) aplicados a Validación de Contratos de Entrada**.
- **❌ El Mal Diseño (Enfoque Novato — Marcar todo como `@IsOptional()`):**
  - Si marcas `nombre_oficial`, `precio_minorista`, `stock_fisico_actual` e `id_producto_existente` simplemente como `@IsOptional()`, el DTO aprobará un payload con `accion: 'CREAR_NUEVO'` donde todos esos campos vengan vacíos (`undefined`), provocando un crash SQL (`NULL value in column "nombre" violates not-null constraint`) adentro de la transacción de base de datos.
- **✅ El Diseño de Ingeniería (Resoluciones C-18, C-19, C-22 y O-27):**
  - Mediante `@ValidateIf(...)`, los campos dejan de ser opcionales dinámicamente según el discriminador `accion`:
    - Si `accion === CREAR_NUEVO`, exige obligatoriamente `nombre_oficial`, `id_categoria`, `precio_minorista` y `stock_fisico_actual`.
    - Si `accion === VINCULAR_EXISTENTE`, exige obligatoriamente `id_producto_existente` e ignora los campos de creación.
    - Y si `codigo_comodin` no fue provisto (porque fue un comodín digitado a mano en mostrador sin código de barras), `@ValidateIf((o) => !o.codigo_comodin)` exige obligatoriamente `nombre_comodin`.

#### D. Idempotencia Unificada (O-22) y Control OCC en [`RegistrarAbonoDto`](file:///d:/Contr/Archivos/POSLyon-Monolitico/libs/domain-core/src/dtos/registrar-abono.dto.ts)
- **Fundamento Teórico Formal:** **Idempotencia en Sistemas Distribuidos ($f(f(x)) = f(x)$) y Control de Concurrencia Optimista (OCC)**.
- **❌ El Mal Diseño (Enfoque Novato — Generar el ID del abono en el servidor con `SERIAL` o `gen_random_uuid()`):**
  - En una arquitectura híbrida donde una caja puede enviar el abono por HTTP directo (`POST /cuentas-corrientes/abono`) y minutos después el worker de sincronización sube los cambios locales (`POST /sync/push`), si el servidor inventa el ID del abono, el mismo pago de \$25.000 se descontaría **dos veces** de la deuda del cliente.
- **✅ El Diseño de Ingeniería (Resolución O-22):**
  - `RegistrarAbonoDto` exige `id: string` (`@IsUUID('4')`) generado en el cliente en el instante en que se toca el botón en mostrador. Así, tanto el endpoint directo como el motor de sincronización ejecutan `INSERT INTO cuenta_corriente (id, ...) VALUES ($1, ...) ON CONFLICT (id) DO NOTHING`, logrando **Idempotencia Matemática Exacta**.

---

### 2.3. Bitácora de Decisiones Arquitectónicas (ADR)
- **Componente / Archivos:** `libs/domain-core/src/validators/is-uuid-or-nil.decorator.ts`, `libs/domain-core/src/dtos/*.dto.ts` (16 DTOs) y `libs/domain-core/src/dtos/dtos-validacion.spec.ts`.
- **Requisito SDD Vinculado:** Capítulos 1 al 5 de los *File-Level Specs* y Resoluciones PAT S-03, O-21, O-22, O-25, O-27, C-18, C-19, C-22.
- **Decisión Tomada:** Centralizar todos los DTOs con `class-validator` y `class-transformer` dentro de `@poslyon/domain-core` para que puedan ejecutarse tanto en la validación local de la caja (`apps/pos-desktop`) como en el `ValidationPipe` global del servidor (`apps/backend-cloud`).
- **Alternativas Descartadas y Justificación Técnica:**
  - *Alternativa A (Definir los DTOs únicamente dentro de `apps/backend-cloud`):* Descartado. En un sistema *Offline-First*, la terminal local opera horas sin internet. Si los DTOs vivieran solo en el servidor en la nube, la caja local no podría reutilizar las mismas reglas declarativas antes de escribir en SQLite.
  - *Alternativa B (Utilizar `@IsUUID('all')` en lugar de crear `@IsUUIDOrNil()`):* Descartado. En varias versiones de `validator.js` (motor subyacente de `class-validator`), `@IsUUID('all')` rechaza igualmente el Nil UUID (`00000000-...-0000`) o acepta cualquier UUID inventado con bits de versión corruptos (`00000000-...-0999`). `@IsUUIDOrNil()` permite **exclusivamente** UUIDv4 legítimos más las 2 constantes canónicas del sistema (`UUID_ARTICULO_COMODIN` y `UUID_SYSTEM_BOT`).
- **Trade-off Aceptado y Mitigación:** `class-validator` y `class-transformer` requieren importar `reflect-metadata` en el punto de entrada de la aplicación y del runner de tests, lo cual queda verificado mediante nuestra suite automatizada en Jest.

---

## 3. 🧪 Verificación Empírica (Tests Unitarios en Jest)
- **Comandos ejecutados:**
  ```powershell
  npm run build:domain
  npm run test:domain
  ```
- **Casos probados en [`dtos-validacion.spec.ts`](file:///d:/Contr/Archivos/POSLyon-Monolitico/libs/domain-core/src/dtos/dtos-validacion.spec.ts) (`13/13` aprobados):**
  1. **Happy Path y Edge Cases de `@IsUUIDOrNil` (S-03):** Acepta UUIDv4 estándar, acepta `UUID_ARTICULO_COMODIN` (`00000000-0000-0000-0000-000000000000`) en `ItemDevolucionDto`, acepta `UUID_SYSTEM_BOT` (`00000000-0000-0000-0000-000000000001`) en `RegistrarAuditoriaDto`, y rechaza UUIDs falsos (`00000000-0000-0000-0000-000000000999`).
  2. **Hidratación y validación anidada en `CrearVentaDto`:** Acepta pagos mixtos válidos y rechaza sub-ítems `PagoItemDto` con montos negativos.
  3. **Restricciones de cardinalidad e idempotencia en `CrearDevolucionDto` y `RegistrarAbonoDto`:** Rechaza devoluciones con `items: []` vacío (`@ArrayMinSize(1)`) y valida abonos con `expected_version` y `metodo_pago`.
  4. **Validación condicional `@ValidateIf` en `ReconciliarCodigoHuerfanoDto` y `ResolverCuarentenaDto`:** Exige los 4 campos de creación cuando `accion === CREAR_NUEVO`, exige `id_producto_existente` cuando `accion === VINCULAR_EXISTENTE`, exige `nombre_comodin` cuando no hay `codigo_comodin` (O-27), e impide resolver una cuarentena hacia el estado `PENDIENTE`.
  5. **Cursores ISO-8601 UTC en `SyncPushDto` (O-25):** Acepta timestamps UTC estrictos (`2026-10-23T15:30:00.000Z`) y rechaza cadenas fuera del estándar ISO-8601.
