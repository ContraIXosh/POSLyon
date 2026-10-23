import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { EstadoTransferenciaStock } from '@poslyon/domain-core';
import { ITransferenciaStock } from '@poslyon/domain-core';
import { TransferenciaDetalleEntity } from './transferencia-detalle.entity';

@Entity('transferencia_stock')
export class TransferenciaStockEntity implements ITransferenciaStock {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  id_sucursal_origen!: string;

  @Column({ type: 'uuid' })
  id_sucursal_destino!: string;

  @Column({ type: 'uuid' })
  id_usuario_envia!: string;

  @Column({ type: 'uuid', nullable: true })
  id_usuario_recibe?: string | null;

  @Column({
    type: 'varchar',
    length: 30,
    default: EstadoTransferenciaStock.PENDIENTE_DESPACHO,
  })
  estado!: EstadoTransferenciaStock;

  @Column({ type: 'timestamptz', nullable: true })
  fecha_envio?: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  fecha_recepcion?: string | null;

  @Column({ type: 'text', nullable: true })
  motivo_discrepancia?: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  fecha_resolucion_discrepancia?: string | null;

  @Column({ type: 'uuid', nullable: true })
  id_usuario_resuelve_discrepancia?: string | null;

  @Column({ type: 'int', default: 1 })
  version!: number;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: string;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: string;

  @OneToMany(() => TransferenciaDetalleEntity, (d) => d.transferencia, {
    cascade: true,
  })
  detalles!: TransferenciaDetalleEntity[];
}
