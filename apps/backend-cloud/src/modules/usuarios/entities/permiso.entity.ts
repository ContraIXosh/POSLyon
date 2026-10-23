import {
  Column,
  Entity,
  Index,
  OneToMany,
  PrimaryColumn,
} from 'typeorm';
import { UsuarioPermisoEntity } from './usuario-permiso.entity';

/**
 * Catálogo Universal de Capacidades Atómicas del Sistema (`PERMISO` — RF-20 / PBAC).
 *
 * Cada permiso posee un código único y declara en su columna `dependencias` (JSONB)
 * las pre-condiciones operativas exigidas para evitar asignaciones inconsistentes (DAG).
 */
@Entity('permiso')
@Index('idx_permiso_codigo', ['codigo'], { unique: true })
@Index('idx_permiso_modulo', ['modulo'])
export class PermisoEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  codigo!: string;

  @Column({ type: 'varchar', length: 50 })
  modulo!: string;

  @Column({ type: 'varchar', length: 100 })
  nombre!: string;

  @Column({ type: 'varchar', length: 255 })
  descripcion!: string;

  @Column({ type: 'jsonb', nullable: true, default: () => "'[]'" })
  dependencias?: string[] | null;

  @Column({ type: 'boolean', default: true })
  activo!: boolean;

  @OneToMany(() => UsuarioPermisoEntity, (up) => up.permiso)
  usuarios?: UsuarioPermisoEntity[];
}
