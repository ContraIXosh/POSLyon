import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import {
  EstadoDiscrepanciaItem,
  IRecepcionMercaderiaDetalle,
} from '@poslyon/domain-core';
import { RecepcionMercaderiaEntity } from './recepcion-mercaderia.entity';

/**
 * Entidad TypeORM que representa cada renglón de mercadería recepcionada (ERD: RECEPCION_MERCADERIA_DETALLE - RF-15).
 * 
 * Reglas Arquitectónicas:
 * - `cantidad_declarada`: Cantidad impresa en la factura/remito externo.
 * - `cantidad_recibida`: Cantidad física real contada en depósito. Solo esta cantidad
 *   ingresa al `stock_fisico` en el inventario al confirmar (Resolución O-18).
 * - `precio_venta_sugerido`: Calculado automáticamente por el motor de preservación de Markup (RF-15).
 * - `aplicar_precio_sugerido`: Si es `true`, actualiza `precio_minorista` en `PRODUCTO_SUCURSAL`.
 * - `estado_discrepancia`: Evaluado matemáticamente (`CONFORME`, `FALTANTE`, `SOBRANTE`, `RECHAZADO_CALIDAD`).
 */
@Entity('recepcion_mercaderia_detalle')
@Index(['id_recepcion_mercaderia'])
@Index(['id_producto'])
export class RecepcionMercaderiaDetalleEntity implements IRecepcionMercaderiaDetalle {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  id_recepcion_mercaderia!: string;

  @ManyToOne(
    () => RecepcionMercaderiaEntity,
    (recepcion) => recepcion.detalles,
    { onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'id_recepcion_mercaderia' })
  recepcion!: RecepcionMercaderiaEntity;

  @Column({ type: 'uuid' })
  id_producto!: string;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 3,
    transformer: {
      to: (value: number) => value,
      from: (value: string | number) => Number(value),
    },
  })
  cantidad_declarada!: number;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 3,
    transformer: {
      to: (value: number) => value,
      from: (value: string | number) => Number(value),
    },
  })
  cantidad_recibida!: number;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: {
      to: (value: number) => value,
      from: (value: string | number) => Number(value),
    },
  })
  costo_unitario!: number;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: {
      to: (value: number) => value,
      from: (value: string | number) => Number(value),
    },
  })
  costo_anterior!: number;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: {
      to: (value: number) => value,
      from: (value: string | number) => Number(value),
    },
  })
  precio_venta_sugerido!: number;

  @Column({ type: 'boolean', default: true })
  aplicar_precio_sugerido!: boolean;

  @Column({
    type: 'varchar',
    length: 30,
    default: EstadoDiscrepanciaItem.CONFORME,
  })
  estado_discrepancia!: EstadoDiscrepanciaItem;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: string;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: string;
}
