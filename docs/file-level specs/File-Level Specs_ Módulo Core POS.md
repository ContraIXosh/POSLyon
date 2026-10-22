### 📁 File-Level Specs: Módulo Core POS

A continuación se detalla el **Plano de Creación y Modificación de Archivos** para la construcción del **Módulo Core POS**, garantizando independencia entre la base local SQLite (WatermelonDB) y la base PostgreSQL de la Nube.

poslyon/\
├── libs/\
│   └── domain-core/\
│       └── src/\
│           ├── enums/\
│           │   ├── estado-general.enum.ts      # BORRADOR, CONFIRMADA, CANCELADA\
│           │   ├── estado-logistico.enum.ts    # A_PREPARAR, PREPARANDO, CONTROLANDO, INCOMPLETO, LISTO_PARA_COBRAR, ENTREGADO\
│           │   └── estado-financiero.enum.ts   # PENDIENTE, PAGADO, FIADO, PARCIAL\
│           ├── interfaces/\
│           │   ├── venta.interface.ts          # Estructura base de Venta\
│           │   ├── venta-detalle.interface.ts  # Estructura de ítem de Carrito con Snapshots\
│           │   └── configuracion-sucursal.interface.ts # Reglas JSONB y Feature Toggles\
│           └── dtos/\
│               ├── crear-venta.dto.ts          # DTO con validaciones class-validator\
│               └── aplicar-promocion.dto.ts   # DTO para recálculos dinámicos\
├── apps/\
│   ├── backend-cloud/\
│   │   └── src/\
│   │       └── modules/\
│   │           └── pos/\
│   │               ├── entities/\
│   │               │   ├── venta.entity.ts         # TypeORM/Prisma Entity (PostgreSQL)\
│   │               │   ├── venta-detalle.entity.ts\
│   │               │   └── pago-venta.entity.ts\
│   │               ├── controllers/\
│   │               │   └── pos.controller.ts       # Endpoints HTTP REST\
│   │               └── services/\
│   │                   ├── pos.service.ts          # Lógica transaccional PostgreSQL\
│   │                   └── promociones.service.ts  # Strategy Pattern para promociones\
│   └── pos-desktop/\
│       └── src/\
│           ├── database/\
│           │   ├── schema.ts                   # Esquema WatermelonDB (SQLite)\
│           │   └── models/\
│           │       ├── Venta.ts                # Modelo Reactivo WatermelonDB\
│           │       └── VentaDetalle.ts\
│           ├── store/\
│           │   ├── useCarritoStore.ts          # Estado Global Carrito (Zustand)\
│           │   ├── usePreparacionStore.ts      # Flujo Guiado y Guarda de Cobro C-11\
│           │   └── useConfiguracionStore.ts    # Feature Toggles y Política Universal de Stock (C-12)\
│           ├── components/\
│           │   └── preparacion/\
│           │       ├── PreparacionGuiadaModal.tsx  # UI Highlight / Focus Mode y Bloqueo\
│           │       └── PreparacionGuiada.module.css # Estilos con opacidad y foco visual\
│           └── services/\
│               ├── garbage-collection.service.ts # Worker de limpieza atómica y expiración (C-13, C-14)\
│               └── pos-local.service.ts        # Transacciones locales SQL en SQLite

#### 0a. libs/domain-core/src/enums/estado-general.enum.ts

- **Propósito:** Enum formal para modelar la persistencia y validez transaccional base de la venta.

```typescript
export enum EstadoGeneral {
  BORRADOR = 'BORRADOR',       // Carrito abierto o en preparación en SQLite local.
  CONFIRMADA = 'CONFIRMADA',   // Venta cerrada, fija id_turno_caja, descuenta stock_fisico y viaja a Cloud.
  CANCELADA = 'CANCELADA',     // Anulación formal de una venta previa CONFIRMADA (reingresa stock_fisico, evalúa dinero y viaja a Cloud).
  DESCARTADO = 'DESCARTADO',   // Carrito en borrador abandonado o purgado por Garbage Collection (solo libera stock_reservado, 100% local).
}
```

#### 0b. libs/domain-core/src/enums/estado-logistico.enum.ts

- **Propósito:** Enum formal para modelar el flujo de preparación guiada, control y entrega física de la mercadería.

```typescript
export enum EstadoLogistico {
  A_PREPARAR = 'A_PREPARAR',           // Pedido en edición o recién cargado en mostrador
  PREPARANDO = 'PREPARANDO',           // Recorrido guiado en móvil con highlight ítem por ítem
  CONTROLANDO = 'CONTROLANDO',         // Segunda revisión guiada opcional
  INCOMPLETO = 'INCOMPLETO',           // Faltante reportado (Bloquea estrictamente el cobro - C-11)
  LISTO_PARA_COBRAR = 'LISTO_PARA_COBRAR', // Preparación concluida, listo para cobrar
  ENTREGADO = 'ENTREGADO',             // Cobrado y entregado al cliente
}
```

#### 0c. libs/domain-core/src/enums/estado-financiero.enum.ts

- **Propósito:** Enum formal para modelar la situación contable histórica del cobro de la venta.

```typescript
export enum EstadoFinanciero {
  PENDIENTE = 'PENDIENTE',     // Venta en borrador, sin cobros registrados.
  PAGADO = 'PAGADO',           // 100% cobrado al instante (efectivo, débito, transferencia, QR).
  FIADO = 'FIADO',             // 100% cargado al libro mayor de CUENTA_CORRIENTE del cliente.
  PARCIAL = 'PARCIAL',         // Cobro mixto: parte inmediata y saldo deudor residual a cuenta corriente.
}
```

#### 0d. libs/domain-core/src/interfaces/venta.interface.ts

- **Propósito:** Contrato inmutable para la cabecera de la venta, con vinculación estricta al turno de caja activo para fines de arqueo y mermas.

```typescript
import { EstadoGeneral } from '../enums/estado-general.enum';
import { EstadoLogistico } from '../enums/estado-logistico.enum';
import { EstadoFinanciero } from '../enums/estado-financiero.enum';

export interface IVenta {
  id: string; // UUIDv4
  id_sucursal: string; // UUIDv4
  id_turno_caja: string | null; // FK a TURNO_CAJA (obligatorio al transicionar a CONFIRMADA)
  id_usuario: string; // UUIDv4
  id_cliente?: string | null; // UUIDv4
  total: number;
  fecha: string; // ISO 8601
  estado_general: EstadoGeneral;
  estado_logistico: EstadoLogistico;
  estado_financiero: EstadoFinanciero;
  tiene_devolucion_parcial: boolean;
  es_compartido: boolean;
  fecha_expiracion_reserva?: string | null;
  version: number;
}
```

#### 1. libs/domain-core/src/interfaces/venta-detalle.interface.ts

- **Propósito:** Definir el contrato inmutable del detalle de la venta, garantizando el aislamiento entre el precio de lista congelado (precio_unitario) y los ajustes promocionales (monto_descuento).

export interface IVentaDetalle {\
id: string; // UUIDv4\
id_venta: string;\
id_producto: string;\
cantidad: number;\
precio_unitario: number; // Snapshot del precio de lista al escanear\
id_promocion_aplicada?: string | null;\
monto_descuento: number; // Descuento aditivo aplicado por motor\
tipo_precio: 'MINORISTA' | 'MAYORISTA';\
codigo_comodin?: string | null; // Respaldo histórico\
nombre_comodin?: string | null;\
}

#### 1b. libs/domain-core/src/interfaces/configuracion-sucursal.interface.ts

- **Propósito:** Definir el contrato tipado de `CONFIGURACION_SUCURSAL`, formalizando la Arquitectura Comercial Bifronte (`PlanComercial`: `'BASICO_LOCAL'` vs `'SUPERIOR_CLOUD'`), la topología de Cluster LAN Multi-Caja (`ModoNodoLan`: `'MAESTRO_LAN'` vs `'SECUNDARIO_LAN'`), la política universal de stock permisivo (C-12) y la infraestructura extensible de Feature Toggles (ERS RF-21).

```typescript
export type PlanComercial = 'BASICO_LOCAL' | 'SUPERIOR_CLOUD';
export type ModoNodoLan = 'MAESTRO_LAN' | 'SECUNDARIO_LAN';

export interface IFeatureToggles {
  /**
   * Banderas comerciales gobernadas por el Plan Activo y Licencia (ERS RF-21).
   */
  sincronizacion_cloud: boolean; // false en BASICO_LOCAL, true en SUPERIOR_CLOUD
  sincronizacion_lan_multicaja: boolean; // true en ambos planes para cajas secundarias LAN
  catalogo_multisucursal: boolean; // Matriz de asignación y clonación entre sucursales
  transferencias_inter_sucursal: boolean; // Módulo logístico 2PC entre tiendas (RF-16)
  clientes_inter_sucursal: boolean; // Replicación de cuenta corriente entre tiendas (RF-07)
  reconciliacion_local: boolean; // Ejecución de RF-13/RF-14 directamente sobre SQLite local

  /**
   * Banderas operativas de la sucursal.
   */
  habilitar_modo_oscuro?: boolean;
  permitir_venta_sin_turno?: boolean;
  requerir_control_ciego_arqueo?: boolean;
  habilitar_alertas_sonoras_preparacion?: boolean;
  habilitar_venta_offline_avanzada?: boolean;
  [clave: string]: boolean | number | string | undefined;
}

export interface IReglasNegocioSucursal {
  comportamiento_precios: 'inmediato' | 'cierre_turno' | 'diferido';
  hora_actualizacion_diferida?: string; // ej. "03:00"
  descuento_stock: 'reserva_logica' | 'inmediato';
  ttl_carrito_minutos: number; // TTL para Garbage Collection de reservas lógicas
  
  /**
   * Política de Stock Negativo (Resolución C-12):
   * 'UNIVERSAL_PERMISIVO': La venta presencial jamás se bloquea por inventario.
   */
  politica_stock: 'UNIVERSAL_PERMISIVO';
  
  /**
   * Contenedor de Feature Toggles listos para consumo en frontend y backend
   */
  feature_toggles: IFeatureToggles;
}

export interface IConfiguracionSucursal {
  id: string; // UUIDv4 PK
  id_sucursal: string; // UUIDv4 FK
  plan_activo: PlanComercial; // 'BASICO_LOCAL' | 'SUPERIOR_CLOUD'
  modo_nodo_lan: ModoNodoLan; // 'MAESTRO_LAN' | 'SECUNDARIO_LAN'
  licencia_token?: string | null; // JWT firmado criptográficamente (RS256/Ed25519) para Upgrade
  lan_master_url?: string | null; // Ej. "http://192.168.1.100:4000" (usado por SECUNDARIO_LAN)
  cloud_endpoint_url?: string | null; // Ej. "https://api.poslyon.com" (usado en SUPERIOR_CLOUD)
  reglas_negocio: IReglasNegocioSucursal;
  ultima_modificacion: string; // ISO 8601
  version: number; // Para Concurrencia Optimista (OCC)
}
```

#### 2. libs/domain-core/src/dtos/crear-venta.dto.ts

- **Propósito:** DTO universal de creación de venta para pagos simples, fiados o mixtos, recibiendo un array de pagos heterogéneos y asociando la venta a `id_turno_caja` e `id_cliente`.

```typescript
import { Type } from 'class-transformer';
import { IsUUID, IsArray, ValidateNested, IsPositive, IsNumber, IsOptional } from 'class-validator';

export class PagoItemDto {
  @IsUUID('4')
  id_metodo_pago!: string; // UUID del método (ej. Efectivo, Tarjeta, Cuenta Corriente)

  @IsPositive()
  monto!: number;
}

export class CrearVentaDto {
  @IsUUID('4')
  id_sucursal!: string;

  @IsUUID('4')
  id_turno_caja!: string; // Obligatorio para fijación inmutable en arqueo (RF-17)

  @IsUUID('4')
  id_usuario!: string;

  @IsOptional()
  @IsUUID('4')
  id_cliente?: string | null; // Requerido si algún pago es CUENTA_CORRIENTE (Fiado)

  @IsNumber()
  @IsPositive()
  total!: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PagoItemDto)
  pagos!: PagoItemDto[]; // Array heterogéneo que soporta fiado, mixto o contado
}
```

#### 3. apps/pos-desktop/src/store/useCarritoStore.ts

- **Propósito:** Manejo del estado en memoria del carrito activo mediante Zustand.

- **Comportamiento Clave:**

  - Al cambiar el toggle tipo_precio a Mayorista, dispara una re-evaluación total descarando valores previos y consultando los precios mayoristas vigentes en la SQLite local.
  - No aplica bloqueos ante stock_fisico < 0.

#### 3b. apps/pos-desktop/src/store/usePreparacionStore.ts

- **Propósito:** Manejo del flujo guiado de preparación y control en dispositivos móviles o terminal mostrador, gestionando el modo focus (*highlight* del ítem activo y opacado del resto) y la guarda estricta contra cobro en estado `INCOMPLETO` (C-11).

```typescript
import { create } from 'zustand';
import { EstadoLogistico } from '@poslyon/domain-core';

export interface ItemPreparacionUi {
  id_producto: string;
  nombre: string;
  cantidad_solicitada: number;
  cantidad_encontrada?: number;
  estado: 'PENDIENTE' | 'OK' | 'INCOMPLETO';
}

export interface PreparacionState {
  id_venta: string | null;
  estado_logistico: EstadoLogistico;
  items: ItemPreparacionUi[];
  indiceItemActivo: number; // Índice para highlight visual
  
  // Acciones
  iniciarPreparacion: (idVenta: string, items: ItemPreparacionUi[]) => void;
  marcarItemOk: (indice: number) => void;
  marcarItemIncompleto: (indice: number, cantidadEncontrada?: number) => void;
  iniciarControl: () => void;
  finalizarPreparacion: () => void;
  regularizarCarrito: (itemsActualizados: ItemPreparacionUi[]) => void;
}

/**
 * Guarda de Seguridad Crítica (C-11):
 * Prohíbe incondicionalmente el cobro si el pedido está en estado INCOMPLETO.
 */
export function validarPuedeCobrar(estadoLogistico: EstadoLogistico): boolean {
  return estadoLogistico !== EstadoLogistico.INCOMPLETO;
}

export const usePreparacionStore = create<PreparacionState>((set, get) => ({
  id_venta: null,
  estado_logistico: EstadoLogistico.A_PREPARAR,
  items: [],
  indiceItemActivo: 0,

  iniciarPreparacion: (idVenta, items) => {
    set({
      id_venta: idVenta,
      estado_logistico: EstadoLogistico.PREPARANDO,
      items: items.map((it) => ({ ...it, estado: 'PENDIENTE' })),
      indiceItemActivo: 0,
    });
  },

  marcarItemOk: (indice) => {
    const { items } = get();
    const nuevosItems = [...items];
    nuevosItems[indice].estado = 'OK';
    
    // El highlight avanza automáticamente al siguiente ítem pendiente
    const siguienteIndice = nuevosItems.findIndex((it, idx) => idx > indice && it.estado === 'PENDIENTE');

    set({
      items: nuevosItems,
      indiceItemActivo: siguienteIndice !== -1 ? siguienteIndice : indice,
    });
  },

  marcarItemIncompleto: (indice, cantidadEncontrada) => {
    const { items } = get();
    const nuevosItems = [...items];
    nuevosItems[indice].estado = 'INCOMPLETO';
    nuevosItems[indice].cantidad_encontrada = cantidadEncontrada;

    // Transición inquebrantable a INCOMPLETO: bloquea el botón de cobro
    set({
      items: nuevosItems,
      estado_logistico: EstadoLogistico.INCOMPLETO,
    });
  },

  iniciarControl: () => {
    const { items } = get();
    set({
      estado_logistico: EstadoLogistico.CONTROLANDO,
      items: items.map((it) => ({ ...it, estado: 'PENDIENTE' })),
      indiceItemActivo: 0,
    });
  },

  finalizarPreparacion: () => {
    set({ estado_logistico: EstadoLogistico.LISTO_PARA_COBRAR });
  },

  regularizarCarrito: (itemsActualizados) => {
    // Al rectificar el carrito en mostrador, se libera el bloqueo
    set({
      items: itemsActualizados,
      estado_logistico: EstadoLogistico.A_PREPARAR,
    });
  },
}));
```

#### 3c. apps/pos-desktop/src/components/preparacion/PreparacionGuiadaModal.tsx

- **Propósito:** Componente de interfaz de usuario para el recorrido guiado en terminal móvil (o mostrador). Implementa el modo **Focus / Highlight** (resalta el ítem activo y opaca el resto con `opacity: 0.35`) y la guarda visual incondicional de bloqueo de cobro en estado `INCOMPLETO` (C-11).

```tsx
import React, { useState } from 'react';
import { usePreparacionStore, validarPuedeCobrar } from '../../store/usePreparacionStore';
import { EstadoLogistico } from '@poslyon/domain-core';
import styles from './PreparacionGuiada.module.css';

export const PreparacionGuiadaModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const {
    items,
    indiceItemActivo,
    estado_logistico,
    marcarItemOk,
    marcarItemIncompleto,
    iniciarControl,
    finalizarPreparacion,
  } = usePreparacionStore();

  const [dialogoIncompletoIdx, setDialogoIncompletoIdx] = useState<number | null>(null);
  const [cantHallada, setCantHallada] = useState<number>(0);

  const puedeCobrar = validarPuedeCobrar(estado_logistico);
  const todosVerificados = items.length > 0 && items.every((it) => it.estado === 'OK');

  const confirmarFaltante = () => {
    if (dialogoIncompletoIdx !== null) {
      marcarItemIncompleto(dialogoIncompletoIdx, cantHallada);
      setDialogoIncompletoIdx(null);
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContainer}>
        {/* Cabecera con Estado Logístico */}
        <header className={styles.header}>
          <h2>Preparación Guiada de Pedido</h2>
          <span className={`${styles.badgeEstado} ${styles[estado_logistico.toLowerCase()]}`}>
            {estado_logistico}
          </span>
        </header>

        {/* Banner de Bloqueo Crítico (C-11) */}
        {estado_logistico === EstadoLogistico.INCOMPLETO && (
          <div className={styles.bannerAlertaIncompleto} role="alert">
            <span className={styles.iconoAlerta}>⛔</span>
            <div>
              <strong>COBRO BLOQUEADO — PEDIDO INCOMPLETO</strong>
              <p>
                Se detectó stock insuficiente en góndola. No es posible finalizar ni cobrar la venta.
                El cajero debe regularizar el pedido en mostrador (ajustando la cantidad física o descartando el ítem).
              </p>
            </div>
          </div>
        )}

        {/* Lista de Ítems en Modo Focus / Highlight */}
        <div className={styles.listaItems}>
          {items.map((item, idx) => {
            const esActivo = idx === indiceItemActivo && estado_logistico !== EstadoLogistico.INCOMPLETO;
            const esOk = item.estado === 'OK';
            const esIncompleto = item.estado === 'INCOMPLETO';

            return (
              <div
                key={item.id_producto}
                className={`
                  ${styles.itemCard}
                  ${esActivo ? styles.itemCardActivo : styles.itemCardOpaco}
                  ${esOk ? styles.itemCardOk : ''}
                  ${esIncompleto ? styles.itemCardFaltante : ''}
                `}
              >
                <div className={styles.itemInfo}>
                  <span className={styles.numeroOrden}>#{idx + 1}</span>
                  <div>
                    <h3 className={styles.itemNombre}>{item.nombre}</h3>
                    <p className={styles.itemCantidades}>
                      Solicitado: <strong>{item.cantidad_solicitada}</strong>
                      {item.cantidad_encontrada !== undefined && (
                        <span> | Hallado: <strong className={styles.textFaltante}>{item.cantidad_encontrada}</strong></span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Acciones de la tarjeta activa */}
                {esActivo && (
                  <div className={styles.accionesItem}>
                    <button
                      type="button"
                      className={styles.btnOk}
                      onClick={() => marcarItemOk(idx)}
                      autoFocus
                    >
                      ✓ OK (Conforme)
                    </button>
                    <button
                      type="button"
                      className={styles.btnIncompleto}
                      onClick={() => {
                        setDialogoIncompletoIdx(idx);
                        setCantHallada(0);
                      }}
                    >
                      ⚠ Incompleto
                    </button>
                  </div>
                )}

                {/* Badge de estado individual */}
                {!esActivo && (
                  <div className={styles.badgeItem}>
                    {esOk && <span className={styles.badgeOk}>✓ Conforme</span>}
                    {esIncompleto && <span className={styles.badgeFaltante}>⚠ Incompleto</span>}
                    {!esOk && !esIncompleto && <span className={styles.badgePendiente}>Pendiente</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Modal de Ingreso de Cantidad Hallada */}
        {dialogoIncompletoIdx !== null && (
          <div className={styles.dialogoOverlay}>
            <div className={styles.dialogoBox}>
              <h3>Reportar Mercadería Faltante</h3>
              <p>
                Ítem: <strong>{items[dialogoIncompletoIdx].nombre}</strong> (Solicitado: {items[dialogoIncompletoIdx].cantidad_solicitada})
              </p>
              <label htmlFor="cantHalladaInput">Cantidad física real encontrada:</label>
              <input
                id="cantHalladaInput"
                type="number"
                min="0"
                max={items[dialogoIncompletoIdx].cantidad_solicitada}
                value={cantHallada}
                onChange={(e) => setCantHallada(Number(e.target.value))}
                className={styles.inputCantidad}
              />
              <div className={styles.dialogoBotones}>
                <button type="button" onClick={() => setDialogoIncompletoIdx(null)} className={styles.btnSecundario}>
                  Cancelar
                </button>
                <button type="button" onClick={confirmarFaltante} className={styles.btnAlerta}>
                  Confirmar Faltante
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer con Transiciones y Guarda de Cobro */}
        <footer className={styles.footer}>
          <button type="button" onClick={onClose} className={styles.btnSecundario}>
            Cerrar
          </button>

          <div className={styles.footerAcciones}>
            {todosVerificados && estado_logistico === EstadoLogistico.PREPARANDO && (
              <>
                <button type="button" onClick={iniciarControl} className={styles.btnControlar}>
                  🔍 Iniciar Control
                </button>
                <button type="button" onClick={finalizarPreparacion} className={styles.btnFinalizar}>
                  ✓ Finalizar Preparación
                </button>
              </>
            )}

            {/* Botón de Cobro con Bloqueo C-11 */}
            <button
              type="button"
              disabled={!puedeCobrar}
              className={`${styles.btnCobrar} ${!puedeCobrar ? styles.btnCobrarDisabled : ''}`}
              title={
                !puedeCobrar
                  ? 'Cobro bloqueado: el pedido está INCOMPLETO. Regularizar primero en mostrador.'
                  : 'Proceder al cobro del pedido'
              }
            >
              💳 Proceder al Cobro
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};
```

#### 3d. apps/pos-desktop/src/components/preparacion/PreparacionGuiada.module.css

- **Propósito:** Estilos con soporte para modo Focus (Highlight del ítem activo y opacado al 35% del resto) y micro-animaciones sin Tailwind.

```css
.modalOverlay {
  position: fixed;
  inset: 0;
  background-color: rgba(15, 23, 42, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modalContainer {
  background-color: #ffffff;
  width: 90%;
  max-width: 680px;
  max-height: 90vh;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2);
  overflow: hidden;
}

.header {
  padding: 16px 24px;
  background-color: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.bannerAlertaIncompleto {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin: 12px 24px 0 24px;
  padding: 14px 18px;
  background-color: #fef2f2;
  border: 1px solid #fecaca;
  border-left: 6px solid #ef4444;
  border-radius: 8px;
  color: #991b1b;
  font-size: 0.95rem;
}

.listaItems {
  padding: 16px 24px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
}

/* Modo Focus / Highlight Activo */
.itemCard {
  border-radius: 8px;
  padding: 14px 18px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.itemCardActivo {
  opacity: 1;
  background-color: #ffffff;
  border: 2px solid #2563eb;
  box-shadow: 0 6px 18px rgba(37, 99, 235, 0.16);
  transform: scale(1.015);
}

.itemCardOpaco {
  opacity: 0.35;
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  filter: grayscale(35%);
  pointer-events: none;
}

.itemCardOk {
  border-left: 5px solid #10b981;
}

.itemCardFaltante {
  border-left: 5px solid #ef4444;
  background-color: #fff1f2;
}

.accionesItem {
  display: flex;
  gap: 8px;
}

.btnOk {
  background-color: #10b981;
  color: #ffffff;
  border: none;
  padding: 8px 16px;
  font-weight: 600;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.btnOk:hover {
  background-color: #059669;
}

.btnIncompleto {
  background-color: #ef4444;
  color: #ffffff;
  border: none;
  padding: 8px 16px;
  font-weight: 600;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.btnIncompleto:hover {
  background-color: #dc2626;
}

.footer {
  padding: 16px 24px;
  background-color: #f8fafc;
  border-top: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.footerAcciones {
  display: flex;
  gap: 10px;
}

.btnCobrar {
  background-color: #2563eb;
  color: #ffffff;
  border: none;
  padding: 10px 20px;
  font-weight: 600;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btnCobrar:hover:not(:disabled) {
  background-color: #1d4ed8;
}

.btnCobrarDisabled {
  background-color: #cbd5e1;
  color: #64748b;
  cursor: not-allowed;
  opacity: 0.7;
}
```

#### 3e. apps/pos-desktop/src/store/useConfiguracionStore.ts

- **Propósito:** Manejo reactivo de las reglas de negocio de la sucursal (`CONFIGURACION_SUCURSAL.reglas_negocio`) y del Plan Comercial (`plan_activo`: `'BASICO_LOCAL'` vs `'SUPERIOR_CLOUD'`) en SQLite/Zustand. Implementa el evaluador dinámico de Feature Toggles (`isFeatureEnabled`), los selectores de topología (`esPlanSuperior`, `esNodoMaestroLan`), la activación criptográfica de licencia en caliente (`activarPlanSuperiorConLicencia`, ERS RF-21) y la política de Stock Negativo Universal (C-12).

```typescript
import { create } from 'zustand';
import { IConfiguracionSucursal, IFeatureToggles } from '@poslyon/domain-core';

export interface ConfiguracionState {
  configuracion: IConfiguracionSucursal | null;
  cargando: boolean;

  // Acciones y Selectores
  cargarConfiguracion: (config: IConfiguracionSucursal) => void;
  esPlanSuperior: () => boolean;
  esNodoMaestroLan: () => boolean;
  
  /**
   * Helper para evaluación dinámica de Feature Flags.
   * Permite consultar si una funcionalidad opcional o comercial está habilitada para la sucursal.
   */
  isFeatureEnabled: (flag: keyof IFeatureToggles | string, defaultValue?: boolean) => boolean;

  /**
   * Upgrade en Caliente de Plan Básico a Plan Superior (ERS RF-21 / Escenario 13):
   * Activa los feature_toggles multisucursal tras validar la firma del licencia_token.
   */
  activarPlanSuperiorConLicencia: (licenciaToken: string, cloudEndpointUrl: string) => void;

  /**
   * Política de Stock Negativo Universal (Resolución C-12 / ERS RF-02):
   * La venta en mostrador jamás se bloquea por saldo de inventario insuficiente.
   * Siempre retorna true; las discrepancias se derivan a auditoría asíncrona.
   */
  validarDisponibilidadParaVenta: (stockFisico: number, cantidadDemandada: number) => boolean;
}

export const useConfiguracionStore = create<ConfiguracionState>((set, get) => ({
  configuracion: null,
  cargando: false,

  cargarConfiguracion: (config) => {
    set({ configuracion: config, cargando: false });
  },

  esPlanSuperior: () => get().configuracion?.plan_activo === 'SUPERIOR_CLOUD',

  esNodoMaestroLan: () => get().configuracion?.modo_nodo_lan === 'MAESTRO_LAN',

  isFeatureEnabled: (flag, defaultValue = false) => {
    const { configuracion } = get();
    const toggles = configuracion?.reglas_negocio?.feature_toggles;
    if (!toggles) return defaultValue;

    const valor = toggles[flag];
    return typeof valor === 'boolean' ? valor : defaultValue;
  },

  activarPlanSuperiorConLicencia: (licenciaToken, cloudEndpointUrl) => {
    const { configuracion } = get();
    if (!configuracion) return;

    set({
      configuracion: {
        ...configuracion,
        plan_activo: 'SUPERIOR_CLOUD',
        licencia_token: licenciaToken,
        cloud_endpoint_url: cloudEndpointUrl,
        version: configuracion.version + 1,
        ultima_modificacion: new Date().toISOString(),
        reglas_negocio: {
          ...configuracion.reglas_negocio,
          feature_toggles: {
            ...configuracion.reglas_negocio.feature_toggles,
            sincronizacion_cloud: true,
            catalogo_multisucursal: true,
            transferencias_inter_sucursal: true,
            clientes_inter_sucursal: true,
          },
        },
      },
    });
  },

  validarDisponibilidadParaVenta: (_stockFisico, _cantidadDemandada) => {
    // Invariante C-12: En mostrador, el cliente presencial tiene prioridad absoluta.
    // Ningún carrito se detiene por stock_fisico <= 0.
    return true;
  },
}));
```

#### 3f. apps/pos-desktop/src/services/garbage-collection.service.ts

- **Propósito:** Worker local en segundo plano para la evaluación periódica y purga atómica de carritos abandonados (Garbage Collection), resolviendo de forma unificada **C-13** (consumo de `ttl_carrito_minutos` de la sucursal) y **C-14** (alcance incondicional sobre toda venta en `BORRADOR` con ventana deslizante y protección contra desfase de reloj).

```typescript
import { Database } from '@nozbe/watermelondb';
import { EstadoGeneral } from '@poslyon/domain-core';
import { useConfiguracionStore } from '../store/useConfiguracionStore';

export interface VentaExpiradaRow {
  id: string;
  id_sucursal: string;
}

export interface VentaDetalleRow {
  id_producto: string;
  cantidad: number;
}

export class GarbageCollectionService {
  private timer: NodeJS.Timeout | null = null;
  private offsetNtpMs: number = 0; // Delta respecto al servidor central calibrado
  private t0RealMs: number = Date.now(); // Base de tiempo de pared calibrada
  private t0MonotonicMs: number = performance.now(); // Base de reloj monótono de hardware (inmune a modificaciones del SO)
  private highWatermarkIso: string = new Date(0).toISOString(); // Marca máxima histórica registrada en SQLite

  constructor(
    private readonly database: Database,
    private readonly emitWebSocketEvent: (evento: string, payload: unknown) => void
  ) {
    this.inicializarGuardiaTemporalOffline();
  }

  /**
   * Inicializa la protección de reloj en modo offline autónomo (Resolución S-10):
   * 1. Carga el último offset NTP calibrado y la marca temporal más alta registrada en SQLite (High Watermark).
   * 2. Inicializa el reloj monótono de hardware (performance.now()) impidiendo retrocesos manuales del reloj del SO.
   */
  private async inicializarGuardiaTemporalOffline(): Promise<void> {
    try {
      // Consultar marca máxima histórica registrada en ventas o auditorías locales
      const resultadoWatermark = await this.database.adapter.unsafeExecute({
        sqls: [
          [
            `SELECT MAX(t) as max_ts FROM (
               SELECT created_at as t FROM ventas 
               UNION ALL 
               SELECT fecha as t FROM auditoria
             )`,
            []
          ]
        ]
      });
      const maxTs = (resultadoWatermark[0] as any)?.[0]?.max_ts;
      if (maxTs) {
        this.highWatermarkIso = new Date(maxTs).toISOString();
      }
    } catch {
      this.highWatermarkIso = new Date().toISOString();
    }
  }

  /**
   * Calibra el desfase de reloj local contra el horario del servidor NTP/Cloud (ERS Escenario 10).
   */
  public sincronizarHorarioServidor(timestampServidorUtc: number): void {
    this.offsetNtpMs = timestampServidorUtc - Date.now();
    this.t0RealMs = timestampServidorUtc;
    this.t0MonotonicMs = performance.now();
  }

  /**
   * Obtiene la marca de tiempo confiable en modo online u offline autónomo (Resolución S-10).
   * Combina el reloj monótono de hardware (performance.now()) con la guarda High Watermark:
   * Si el usuario atrasa deliberadamente el reloj de Windows en modo offline, el tiempo calculado
   * nunca puede retroceder por debajo del High Watermark histórico registrado en la base de datos local.
   */
  public obtenerAhoraConfiable(): Date {
    // 1. Cálculo mediante avance del reloj monótono de hardware desde el último anclaje
    const deltaMonotonoMs = performance.now() - this.t0MonotonicMs;
    const tiempoEstimadoMs = this.t0RealMs + deltaMonotonoMs;

    // 2. Guarda High Watermark: el tiempo del sistema jamás puede ser anterior a transacciones ya asentadas
    const highWatermarkMs = new Date(this.highWatermarkIso).getTime();
    if (tiempoEstimadoMs < highWatermarkMs) {
      // Detección de desfase regresivo (manipulación de BIOS/SO en frío): congelar al watermark + 1s y auditar
      console.warn(`[CLOCK_SKEW_GUARD] Desfase temporal regresivo detectado. Timestamp calculado (${new Date(tiempoEstimadoMs).toISOString()}) < High Watermark (${this.highWatermarkIso}).`);
      return new Date(highWatermarkMs + 1000);
    }

    const ahora = new Date(tiempoEstimadoMs);
    // Actualizar watermark si el tiempo avanza legítimamente
    if (ahora.toISOString() > this.highWatermarkIso) {
      this.highWatermarkIso = ahora.toISOString();
    }
    return ahora;
  }

  /**
   * Calcula la fecha de expiración aplicando el mecanismo de Ventana Deslizante (Sliding Window).
   * Se invoca en cada mutación del carrito (escaneo, cambio de cantidad, avance en preparación).
   */
  public calcularNuevaExpiracion(): string {
    const config = useConfiguracionStore.getState().configuracion;
    const ttlMinutos = config?.reglas_negocio?.ttl_carrito_minutos ?? 30; // Resolución C-13: TTL dinámico
    const ahora = this.obtenerAhoraConfiable();
    return new Date(ahora.getTime() + ttlMinutos * 60 * 1000).toISOString();
  }

  /**
   * Bucle periódico de evaluación de purga.
   * Aplica universalmente a todo carrito en estado_general = 'BORRADOR' (Resolución C-14).
   */
  public async evaluarYPurgarCarritosExpirados(): Promise<number> {
    const ahoraConfiableIso = this.obtenerAhoraConfiable().toISOString();
    let carritosPurgados = 0;

    // 1. Consultar ventas en BORRADOR cuya fecha_expiracion_reserva haya vencido
    const ventasExpiradas = await this.database.adapter.unsafeExecute({
      sqls: [
        [
          `SELECT id, id_sucursal FROM ventas 
           WHERE estado_general = ? 
             AND fecha_expiracion_reserva IS NOT NULL 
             AND fecha_expiracion_reserva < ?`,
          [EstadoGeneral.BORRADOR, ahoraConfiableIso]
        ]
      ]
    });

    const rows = (ventasExpiradas[0] as unknown as VentaExpiradaRow[]) || [];
    if (rows.length === 0) return 0;

    // 2. Transacción Atómica de Cancelación y Reversión de Reserva en SQLite
    for (const venta of rows) {
      await this.database.write(async () => {
        // Obtener líneas del carrito para devolver stock_reservado
        const detallesRaw = await this.database.adapter.unsafeExecute({
          sqls: [
            ['SELECT id_producto, cantidad FROM venta_detalles WHERE id_venta = ?', [venta.id]]
          ]
        });
        const detalles = (detallesRaw[0] as unknown as VentaDetalleRow[]) || [];

        // Marcar carrito en borrador como DESCARTADO (100% local, no toca dinero ni stock físico)
        await this.database.adapter.unsafeExecute({
          sqls: [
            [
              `UPDATE ventas 
               SET estado_general = ?, updated_at = ? 
               WHERE id = ? AND estado_general = ?`,
              [EstadoGeneral.DESCARTADO, ahoraConfiableIso, venta.id, EstadoGeneral.BORRADOR]
            ]
          ]
        });

        // Revertir stock reservado en PRODUCTO_SUCURSAL
        for (const det of detalles) {
          await this.database.adapter.unsafeExecute({
            sqls: [
              [
                `UPDATE productos_sucursal 
                 SET stock_reservado = MAX(0, stock_reservado - ?) 
                 WHERE id_producto = ? AND id_sucursal = ?`,
                [det.cantidad, det.id_producto, venta.id_sucursal]
              ]
            ]
          });
        }
      });

      // 3. Notificar a todas las terminales LAN mediante WebSocket
      this.emitWebSocketEvent('CARRITO_EXPIRADO', {
        id_venta: venta.id,
        motivo: 'INACTIVIDAD_TIMEOUT_GARBAGE_COLLECTION',
        timestamp: ahoraConfiableIso,
      });

      carritosPurgados++;
    }

    return carritosPurgados;
  }

  /**
   * Inicia el worker programado en segundo plano.
   */
  public iniciarWorker(intervaloMs: number = 60000): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => {
      this.evaluarYPurgarCarritosExpirados().catch((err) => {
        console.error('[GarbageCollectionWorker] Error al evaluar carritos expirados:', err);
      });
    }, intervaloMs);
  }

  public detenerWorker(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
```

#### 3b. apps/pos-desktop/src/services/pos-local.service.ts

- **Propósito:** Orquestar el ciclo transaccional atómico local en SQLite para confirmación de ventas, cobro manual en caja, cancelación de ventas y resguardo de stock.

```typescript
import { Database } from '@nozbe/watermelondb';
import { EstadoGeneral, EstadoFinanciero, EstadoLogistico } from '@poslyon/domain-core';

export interface ConfirmarVentaParams {
  id_venta: string;
  id_turno_caja: string;
  id_cliente?: string | null;
  es_fiado?: boolean;
  pagos?: Array<{ id_metodo_pago: string; monto: number; afecta_caja_fisica: boolean }>;
}

export class PosLocalService {
  constructor(private readonly db: Database) {}

  /**
   * Confirma la venta localmente en SQLite.
   * Regla de Negocio:
   * 1. Fija id_turno_caja y descuenta stock_fisico.
   * 2. Si es venta fiada a un cliente, asigna AUTOMÁTICAMENTE estado_financiero = 'FIADO' (sin tocar caja).
   * 3. Si se registran pagos en mostrador en el acto, pasa a 'PAGADO'/'PARCIAL' y asienta dinero en caja.
   * 4. Si se confirma sin cobro, queda en 'PENDIENTE' y NO genera movimientos de caja.
   */
  async confirmarVenta(params: ConfirmarVentaParams): Promise<void> {
    await this.db.write(async () => {
      const venta = await this.db.get('ventas').find(params.id_venta);
      if (!venta || (venta as any).estado_general !== EstadoGeneral.BORRADOR) {
        throw new Error('Solo se pueden confirmar ventas en estado BORRADOR.');
      }

      // 1. Obtener detalles para actualizar inventario (con soporte de Packs - Resolución O-26)
      const detalles = await this.db.get('venta_detalles').query().fetch(); // Filtrado por venta
      for (const det of detalles as any[]) {
        if (det.id_venta === params.id_venta) {
          // Resolución O-26: Si el ítem vendido es un Pack (posee id_producto_base y multiplicador_stock),
          // se descuenta recursivamente sobre el producto base sin que el pack posea stock físico propio.
          const prodGlobal = await this.db.get('producto_global').find(det.id_producto);
          const esPack = prodGlobal && (prodGlobal as any).id_producto_base != null;
          const targetProductoId = esPack ? (prodGlobal as any).id_producto_base : det.id_producto;
          const factorDescuento = esPack ? Number((prodGlobal as any).multiplicador_stock || 1) : 1;
          const cantidadDescontar = det.cantidad * factorDescuento;

          const stockSucursal = await this.db.get('producto_sucursal').find(targetProductoId);
          if (stockSucursal) {
            await stockSucursal.update((rec: any) => {
              rec.stock_fisico -= cantidadDescontar; // Descuento de stock real base (acepta negativo por C-12)
              rec.stock_reservado = Math.max(0, rec.stock_reservado - cantidadDescontar); // Libera reserva
            });
          }
        }
      }

      // 2. Determinar estado financiero e impacto en caja
      let estadoFinancieroFinal = EstadoFinanciero.PENDIENTE;

      if (params.es_fiado && params.id_cliente) {
        // Regla: Asignación automática de FIADO si la venta es a cuenta corriente
        estadoFinancieroFinal = EstadoFinanciero.FIADO;
        const totalVenta = Number((venta as any).total);
        const cliente = await this.db.get('clientes').find(params.id_cliente);
        await cliente.update((rec: any) => {
          rec.saldo_deudor += totalVenta;
          rec.version += 1;
        });

        await this.db.get('cuentas_corrientes').create((rec: any) => {
          rec.id_cliente = params.id_cliente;
          rec.id_venta = params.id_venta;
          rec.monto = totalVenta;
          rec.tipo_movimiento = 'VENTA_CREDITO';
          rec.fecha = new Date().toISOString();
        });
      } else if (params.pagos && params.pagos.length > 0) {
        // Cobro inmediato en mostrador
        const totalPagado = params.pagos.reduce((acc, p) => acc + p.monto, 0);
        const totalVenta = Number((venta as any).total);
        estadoFinancieroFinal = totalPagado >= totalVenta ? EstadoFinanciero.PAGADO : EstadoFinanciero.PARCIAL;

        for (const pago of params.pagos) {
          await this.db.get('pagos_venta').create((rec: any) => {
            rec.id_venta = params.id_venta;
            rec.id_metodo_pago = pago.id_metodo_pago;
            rec.monto = pago.monto;
          });
        }
      }

      // 3. Transicionar venta a CONFIRMADA
      await venta.update((rec: any) => {
        rec.estado_general = EstadoGeneral.CONFIRMADA;
        rec.estado_logistico = EstadoLogistico.ENTREGADO;
        rec.estado_financiero = estadoFinancieroFinal;
        rec.id_turno_caja = params.id_turno_caja;
        rec.fecha_expiracion_reserva = null;
      });
    });
  }

  /**
   * Registra manualmente el cobro de una venta previamente confirmada en estado PENDIENTE.
   * En este momento exacto se asienta el dinero en caja física/digital.
   */
  async registrarCobroManual(
    idVenta: string,
    pagos: Array<{ id_metodo_pago: string; monto: number }>
  ): Promise<void> {
    await this.db.write(async () => {
      const venta = await this.db.get('ventas').find(idVenta);
      if ((venta as any).estado_general !== EstadoGeneral.CONFIRMADA) {
        throw new Error('Solo se puede registrar cobro sobre ventas CONFIRMADAS.');
      }
      if ((venta as any).estado_financiero !== EstadoFinanciero.PENDIENTE) {
        throw new Error('La venta ya posee un estado financiero asignado.');
      }

      const totalPagado = pagos.reduce((acc, p) => acc + p.monto, 0);
      const totalVenta = Number((venta as any).total);
      const nuevoEstado = totalPagado >= totalVenta ? EstadoFinanciero.PAGADO : EstadoFinanciero.PARCIAL;

      for (const pago of pagos) {
        await this.db.get('pagos_venta').create((rec: any) => {
          rec.id_venta = idVenta;
          rec.id_metodo_pago = pago.id_metodo_pago;
          rec.monto = pago.monto;
        });
      }

      await venta.update((rec: any) => {
        rec.estado_financiero = nuevoEstado;
      });
    });
  }

  /**
   * Anula formalmente una venta previamente CONFIRMADA (CONFIRMADA -> CANCELADA).
   * - Reingresa 100% de los productos a stock_fisico.
   * - Si estado_financiero es PENDIENTE: exige confirmación de que no hubo ingreso de caja y NO devuelve dinero.
   * - Si estado_financiero es PAGADO/PARCIAL/FIADO: dispara el circuito de reintegro o amortización de deuda.
   */
  async cancelarVentaConfirmada(
    idVenta: string,
    confirmarSinDinero: boolean = false
  ): Promise<{ requiereConfirmacion: boolean; mensaje?: string }> {
    return await this.db.write(async () => {
      const venta = await this.db.get('ventas').find(idVenta);
      if ((venta as any).estado_general !== EstadoGeneral.CONFIRMADA) {
        throw new Error('Solo se pueden cancelar ventas que previamente hayan sido CONFIRMADAS.');
      }

      const estadoFinanciero = (venta as any).estado_financiero;

      // Guarda de seguridad para ventas en PENDIENTE
      if (estadoFinanciero === EstadoFinanciero.PENDIENTE && !confirmarSinDinero) {
        return {
          requiereConfirmacion: true,
          mensaje: 'Atención: Esta venta se encuentra en estado financiero PENDIENTE. No se registró ingreso de dinero a caja. Los productos volverán a stock físico pero NO se generará devolución de dinero. ¿Confirmar acción?'
        };
      }

      // Reingreso de stock_fisico
      const detalles = await this.db.get('venta_detalles').query().fetch();
      for (const det of detalles as any[]) {
        if (det.id_venta === idVenta) {
          const stockSucursal = await this.db.get('producto_sucursal').find(det.id_producto);
          if (stockSucursal) {
            await stockSucursal.update((rec: any) => {
              rec.stock_fisico += det.cantidad;
            });
          }
        }
      }

      // Transición formal a CANCELADA (viajará vía Push Delta a Cloud)
      await venta.update((rec: any) => {
        rec.estado_general = EstadoGeneral.CANCELADA;
        rec.version += 1;
      });

      return { requiereConfirmacion: false };
    });
  }
}
```

#### 4. apps/backend-cloud/src/modules/pos/services/pos.service.ts

- **Propósito:** Procesar la recepción de ventas provenientes de la sincronización delta o creadas directo en la nube.
- **Transaccionalidad:** Enuelve la inserción de VENTA, VENTA_DETALLE y PAGO_VENTA en un bloque BEGIN ... COMMIT con aislamiento de transacción de PostgreSQL.

### ✅ Checklist de Implementación SDD para Módulo Core POS

- **Paso 1: Librería de Dominio (**libs/domain-core**)**

  - Crear Enums: EstadoGeneralVenta, EstadoLogistico, EstadoFinanciero.
  - Crear Interfaces: IVenta, IVentaDetalle, IPagoVenta.
  - Crear DTOs con class-validator para recepción de payloads.

- 

- **Paso 2: Base de Datos Local Desktop (**apps/pos-desktop**)**

  - Definir schema.ts en WatermelonDB con tablas ventas, venta_detalles y pago_ventas.
  - Configurar SQLite con journal_mode=WAL y synchronous=FULL para resiliencia ante cortes de luz.
  - Implementar pos-local.service.ts encapsulando la transacción atómica local.

- 

- **Paso 3: Servidor Central (**apps/backend-cloud**)**

  - Crear Entidades TypeORM/Prisma mapeando los tipos de domain-core.
  - Implementar pos.service.ts con manejo de conflictos OCC y aceptación de stock negativo.
  - Implementar pos.controller.ts exponiendo endpoints REST protegidos por JWT/API Keys.

- 

- **Paso 4: Pruebas Automatizadas (Testing)**

  - Test unitario: Verificar que la adición de 2x1 incrementa monto_descuento sin alterar precio_unitario.
  - Test de integración local: Simular desconexión forzada durante un COMMIT local y verificar autosanación WAL.

- 
