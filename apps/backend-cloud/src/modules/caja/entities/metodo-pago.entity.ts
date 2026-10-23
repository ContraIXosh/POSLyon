import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';
import { IMetodoPago } from '@poslyon/domain-core';

/**
 * Catálogo Canónico de Métodos de Pago (`METODO_PAGO` — ERD).
 *
 * La columna `afecta_caja_fisica = true` delimita los cobros y egresos que alteran
 * los billetes físicos de gaveta para el Arqueo Ciego (Resolución O-23).
 */
@Entity('metodo_pago')
@Index('idx_metodo_pago_nombre', ['nombre'], { unique: true })
export class MetodoPagoEntity implements IMetodoPago {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  nombre!: string;

  @Column({ type: 'boolean', default: false })
  afecta_caja_fisica!: boolean;

  @Column({ type: 'boolean', default: true })
  activo!: boolean;

  @VersionColumn({ default: 1 })
  version!: number;

  @CreateDateColumn({ type: 'timestamptz', default: () => 'NOW()' })
  created_at!: string;

  @UpdateDateColumn({ type: 'timestamptz', default: () => 'NOW()' })
  updated_at!: string;
}
