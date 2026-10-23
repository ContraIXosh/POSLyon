import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';
import { ProductoGlobalEntity } from './producto-global.entity';

/**
 * Entidad de Categoría de Productos (`CATEGORIA` — ERD).
 */
@Entity('categoria')
@Index('idx_categoria_nombre', ['nombre'], { unique: true })
export class CategoriaEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  nombre!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  descripcion?: string | null;

  @Column({ type: 'boolean', default: true })
  activo!: boolean;

  @VersionColumn({ default: 1 })
  version!: number;

  @CreateDateColumn({ type: 'timestamptz', default: () => 'NOW()' })
  created_at!: string;

  @UpdateDateColumn({ type: 'timestamptz', default: () => 'NOW()' })
  updated_at!: string;

  @OneToMany(() => ProductoGlobalEntity, (p) => p.categoria)
  productos?: ProductoGlobalEntity[];
}
