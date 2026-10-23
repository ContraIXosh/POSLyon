import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';
import { EstadoTurnoCaja, ITurnoCaja } from '@poslyon/domain-core';
import { SucursalEntity } from '../../sucursales/entities/sucursal.entity';
import { UsuarioEntity } from '../../usuarios/entities/usuario.entity';
import { MovimientoCajaEntity } from './movimiento-caja.entity';

/**
 * Entidad de Turno de Caja y Arqueo Ciego (`TURNO_CAJA` — RF-17 / O-16 / O-23).
 *
 * Controla el ciclo de vida de la gaveta de cobro, el fondo inicial de cambio,
 * el recuento ciego inmutable declarado por el cajero y la rectificación forense auditada.
 */
@Entity('turno_caja')
@Index('idx_turno_caja_sucursal', ['id_sucursal'])
@Index('idx_turno_caja_usuario_estado', ['id_usuario', 'estado'])
@Index('idx_turno_caja_fecha_apertura', ['fecha_apertura'])
export class TurnoCajaEntity implements ITurnoCaja {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('uuid')
  id_sucursal!: string;

  @Column('uuid')
  id_usuario!: string;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  fecha_apertura!: string;

  @Column({ type: 'timestamptz', nullable: true })
  fecha_cierre?: string | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  monto_inicial_efectivo!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  efectivo_declarado?: number | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  diferencia_caja?: number | null;

  @Column({
    type: 'enum',
    enum: EstadoTurnoCaja,
    default: EstadoTurnoCaja.ABIERTO,
  })
  estado!: EstadoTurnoCaja;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  efectivo_rectificado?: number | null;

  @Column({ type: 'timestamptz', nullable: true })
  fecha_rectificacion?: string | null;

  @Column({ type: 'uuid', nullable: true })
  id_usuario_rectifica?: string | null;

  @Column({ type: 'text', nullable: true })
  motivo_rectificacion?: string | null;

  @VersionColumn({ default: 1 })
  version!: number;

  @CreateDateColumn({ type: 'timestamptz', default: () => 'NOW()' })
  created_at!: string;

  @UpdateDateColumn({ type: 'timestamptz', default: () => 'NOW()' })
  updated_at!: string;

  @ManyToOne(() => SucursalEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_sucursal' })
  sucursal?: SucursalEntity;

  @ManyToOne(() => UsuarioEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'id_usuario' })
  usuario?: UsuarioEntity;

  @OneToMany(() => MovimientoCajaEntity, (m) => m.turno)
  movimientos?: MovimientoCajaEntity[];
}
