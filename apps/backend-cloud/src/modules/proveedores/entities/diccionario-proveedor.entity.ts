import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { IDiccionarioProveedor } from '@poslyon/domain-core';

/**
 * Entidad TypeORM para el mapeo semántico de alias entre la factura externa y el producto oficial (RF-14).
 * Clave de unicidad compuesta: UNIQUE(id_proveedor, nombre_en_factura).
 */
@Entity('diccionario_proveedor')
@Index(['id_proveedor', 'nombre_en_factura'], { unique: true })
@Index(['id_producto'])
export class DiccionarioProveedorEntity implements IDiccionarioProveedor {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  id_proveedor!: string;

  @Column({ type: 'uuid' })
  id_producto!: string;

  @Column({ type: 'varchar', length: 255 })
  nombre_en_factura!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: string;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at?: string;
}
