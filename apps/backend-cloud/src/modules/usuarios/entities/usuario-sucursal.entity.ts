import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';
import { UsuarioEntity } from './usuario.entity';
import { SucursalEntity } from '../../sucursales/entities/sucursal.entity';

/**
 * Asociación entre Usuario y Sucursal Físico-Operativa (`USUARIO_SUCURSAL` — RF-20).
 */
@Entity('usuario_sucursal')
@Index('idx_usuario_sucursal_unique', ['id_usuario', 'id_sucursal'], {
  unique: true,
})
export class UsuarioSucursalEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('uuid')
  id_usuario!: string;

  @Column('uuid')
  id_sucursal!: string;

  @Column({ type: 'varchar', length: 50, default: 'OPERADOR' })
  rol!: string;

  @Column({ type: 'boolean', default: true })
  activo!: boolean;

  @VersionColumn({ default: 1 })
  version!: number;

  @CreateDateColumn({ type: 'timestamptz', default: () => 'NOW()' })
  created_at!: string;

  @UpdateDateColumn({ type: 'timestamptz', default: () => 'NOW()' })
  updated_at!: string;

  @ManyToOne(() => UsuarioEntity, (u) => u.sucursales, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_usuario' })
  usuario?: UsuarioEntity;

  @ManyToOne(() => SucursalEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_sucursal' })
  sucursal?: SucursalEntity;
}
