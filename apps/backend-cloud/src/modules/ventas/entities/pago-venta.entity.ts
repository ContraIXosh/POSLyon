import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { IPagoVenta } from '@poslyon/domain-core';
import { VentaEntity } from './venta.entity';

/**
 * Entidad TypeORM que representa la imputación de pago en una venta (ERD: PAGO_VENTA - RF-05).
 * Respalda pagos heterogéneos mixtos (ej. 50% efectivo, 50% tarjeta o cuenta corriente).
 */
@Entity('pago_venta')
@Index(['id_venta'])
@Index(['id_metodo_pago'])
export class PagoVentaEntity implements IPagoVenta {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  id_venta!: string;

  @ManyToOne(() => VentaEntity, (venta) => venta.pagos, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_venta' })
  venta!: VentaEntity;

  @Column({ type: 'uuid' })
  id_metodo_pago!: string;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: {
      to: (value: number) => value,
      from: (value: string | number) => Number(value),
    },
  })
  monto!: number;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: string;
}
