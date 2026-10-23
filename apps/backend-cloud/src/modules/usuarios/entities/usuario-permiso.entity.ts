import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UsuarioEntity } from './usuario.entity';
import { PermisoEntity } from './permiso.entity';
import { SucursalEntity } from '../../sucursales/entities/sucursal.entity';

/**
 * Asignación Granular de Permiso Atómico a un Usuario (`USUARIO_PERMISO` — RF-20).
 *
 * Puede ser global (`id_sucursal === null`) o acotado a una tienda física específica.
 */
@Entity('usuario_permiso')
@Index('idx_usuario_permiso_scope', ['id_usuario', 'id_permiso', 'id_sucursal'], {
  unique: true,
})
export class UsuarioPermisoEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('uuid')
  id_usuario!: string;

  @Column('uuid')
  id_permiso!: string;

  @Column({ type: 'uuid', nullable: true })
  id_sucursal?: string | null;

  @Column({ type: 'boolean', default: true })
  activo!: boolean;

  @CreateDateColumn({ type: 'timestamptz', default: () => 'NOW()' })
  created_at!: string;

  @UpdateDateColumn({ type: 'timestamptz', default: () => 'NOW()' })
  updated_at!: string;

  @ManyToOne(() => UsuarioEntity, (u) => u.permisos, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_usuario' })
  usuario?: UsuarioEntity;

  @ManyToOne(() => PermisoEntity, (p) => p.usuarios, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_permiso' })
  permiso?: PermisoEntity;

  @ManyToOne(() => SucursalEntity, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_sucursal' })
  sucursal?: SucursalEntity | null;
}
