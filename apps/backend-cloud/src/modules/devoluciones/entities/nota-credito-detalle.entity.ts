import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { INotaCreditoDetalle } from '@poslyon/domain-core';
import { NotaCreditoEntity } from './nota-credito.entity';

/**
 * Entidad TypeORM que representa el renglón de detalle de una Nota de Crédito (ERD: NOTA_CREDITO_DETALLE - RF-09).
 */
@Entity('nota_credito_detalle')
@Index(['id_nota_credito'])
@Index(['id_producto'])
export class NotaCreditoDetalleEntity implements INotaCreditoDetalle {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  id_nota_credito!: string;

  @ManyToOne(() => NotaCreditoEntity, (nc) => nc.detalles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_nota_credito' })
  nota_credito!: NotaCreditoEntity;

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
  precio_unitario_momento!: number;

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
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: {
      to: (value: number) => value,
      from: (value: string | number) => Number(value),
    },
  })
  subtotal!: number;

  @Column({ type: 'boolean', default: true })
  devuelto_a_inventario!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: string;
}
