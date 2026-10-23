import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';
import { UsuarioSucursalEntity } from './usuario-sucursal.entity';
import { UsuarioPermisoEntity } from './usuario-permiso.entity';

/**
 * Entidad de Usuario del Sistema (`USUARIO` — ERD / RF-20).
 *
 * Soporta autenticación, auditoría y control de acceso basado en permisos granulares (PBAC).
 * La bandera `es_dueno` activa el bypass universal irrestricto (RF-20).
 */
@Entity('usuario')
@Index('idx_usuario_email', ['email'], { unique: true })
@Index('idx_usuario_activo', ['activo'])
export class UsuarioEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100 })
  nombre!: string;

  @Column({ type: 'varchar', length: 150, unique: true })
  email!: string;

  @Column({ type: 'varchar', length: 255 })
  password_hash!: string;

  @Column({ type: 'boolean', default: false })
  es_dueno!: boolean;

  @Column({ type: 'boolean', default: true })
  activo!: boolean;

  @VersionColumn({ default: 1 })
  version!: number;

  @CreateDateColumn({ type: 'timestamptz', default: () => 'NOW()' })
  created_at!: string;

  @UpdateDateColumn({ type: 'timestamptz', default: () => 'NOW()' })
  updated_at!: string;

  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deleted_at?: string | null;

  @OneToMany(() => UsuarioSucursalEntity, (us) => us.usuario)
  sucursales?: UsuarioSucursalEntity[];

  @OneToMany(() => UsuarioPermisoEntity, (up) => up.usuario)
  permisos?: UsuarioPermisoEntity[];
}
