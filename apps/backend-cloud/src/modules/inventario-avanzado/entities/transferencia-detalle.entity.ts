import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ITransferenciaDetalle } from '@poslyon/domain-core';
import { TransferenciaStockEntity } from './transferencia-stock.entity';

@Entity('transferencia_detalle')
export class TransferenciaDetalleEntity implements ITransferenciaDetalle {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  id_transferencia!: string;

  @Column({ type: 'uuid' })
  id_producto!: string;

  @Column({ type: 'decimal', precision: 12, scale: 4 })
  cantidad_enviada!: number;

  @Column({ type: 'decimal', precision: 12, scale: 4, nullable: true })
  cantidad_recibida?: number | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  estado_item?: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: string;

  @ManyToOne(() => TransferenciaStockEntity, (t) => t.detalles, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'id_transferencia' })
  transferencia?: TransferenciaStockEntity;
}
