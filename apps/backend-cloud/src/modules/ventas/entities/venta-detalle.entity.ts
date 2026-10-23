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
import { IVentaDetalle, TipoPrecio } from '@poslyon/domain-core';
import { VentaEntity } from './venta.entity';

/**
 * Entidad TypeORM que representa el renglón de detalle de venta (ERD: VENTA_DETALLE - RF-01 / RF-06 / RF-12).
 * 
 * Reglas de Arquitectura:
 * - `precio_unitario`: Fotografía inmutable (Price Snapshot) del precio de lista de góndola al escanear.
 * - `monto_descuento`: Descuento acumulado calculado por el motor de promociones (RF-06).
 * - `codigo_comodin` y `nombre_comodin`: Preservan la descripción original si se utilizó artículo comodín (RF-12).
 */
@Entity('venta_detalle')
@Index(['id_venta'])
@Index(['id_producto'])
@Index(['id_promocion_aplicada'])
export class VentaDetalleEntity implements IVentaDetalle {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  id_venta!: string;

  @ManyToOne(() => VentaEntity, (venta) => venta.detalles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_venta' })
  venta!: VentaEntity;

  @Column({ type: 'uuid' })
  id_producto!: string;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 4,
    transformer: {
      to: (value: number) => value,
      from: (value: string | number) => Number(value),
    },
  })
  cantidad!: number;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: {
      to: (value: number) => value,
      from: (value: string | number) => Number(value),
    },
  })
  precio_unitario!: number;

  @Column({ type: 'uuid', nullable: true })
  id_promocion_aplicada?: string | null;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0.0,
    transformer: {
      to: (value: number) => value,
      from: (value: string | number) => Number(value),
    },
  })
  monto_descuento!: number;

  @Column({
    type: 'varchar',
    length: 20,
    default: TipoPrecio.MINORISTA,
  })
  tipo_precio!: TipoPrecio;

  @Column({ type: 'varchar', length: 100, nullable: true })
  codigo_comodin?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  nombre_comodin?: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: string;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: string;
}
