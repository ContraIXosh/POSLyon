import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';
import { IProveedor } from '@poslyon/domain-core';

/**
 * Entidad TypeORM que representa el catálogo maestro de proveedores comerciales (ERD: PROVEEDOR).
 */
@Entity('proveedor')
@Index(['cuit'], { unique: true, where: 'deleted_at IS NULL' })
@Index(['activo'])
export class ProveedorEntity implements IProveedor {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 150 })
  razon_social!: string;

  @Column({ type: 'varchar', length: 30 })
  cuit!: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  contacto_telefono?: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  contacto_email?: string | null;

  @Column({ type: 'boolean', default: true })
  activo!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: string;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: string;

  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deleted_at?: string | null;
}
