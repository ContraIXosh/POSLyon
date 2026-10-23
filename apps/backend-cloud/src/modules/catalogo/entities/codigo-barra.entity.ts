import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { ProductoGlobalEntity } from './producto-global.entity';

/**
 * Asociación de Códigos de Barra por Producto (`CODIGO_BARRA` — ERD).
 *
 * Permite que un producto posea múltiples códigos de barra (EAN-13, ITF-14, código interno de balanza).
 */
@Entity('codigo_barra')
@Index('idx_codigo_barra_codigo', ['codigo'], { unique: true })
@Index('idx_codigo_barra_producto', ['id_producto'])
export class CodigoBarraEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('uuid')
  id_producto!: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  codigo!: string;

  @Column({ type: 'boolean', default: false })
  es_principal!: boolean;

  @CreateDateColumn({ type: 'timestamptz', default: () => 'NOW()' })
  created_at!: string;

  @ManyToOne(() => ProductoGlobalEntity, (p) => p.codigos_barra, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'id_producto' })
  producto?: ProductoGlobalEntity;
}
