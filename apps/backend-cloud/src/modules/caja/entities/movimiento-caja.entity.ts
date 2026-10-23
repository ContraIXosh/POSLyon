import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { IMovimientoCaja, TipoMovimientoCaja } from '@poslyon/domain-core';
import { TurnoCajaEntity } from './turno-caja.entity';
import { MetodoPagoEntity } from './metodo-pago.entity';
import { UsuarioEntity } from '../../usuarios/entities/usuario.entity';

/**
 * Movimientos Financieros Directos de Gaveta (`MOVIMIENTO_CAJA` — ERD).
 *
 * Registra entradas y salidas directas de efectivo o medios electrónicos
 * (sangrías/retiros de cambio, pagos a proveedores menores, abonos de deuda o ajustes).
 */
@Entity('movimiento_caja')
@Index('idx_movimiento_caja_turno', ['id_turno_caja'])
@Index('idx_movimiento_caja_fecha', ['fecha'])
export class MovimientoCajaEntity implements IMovimientoCaja {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('uuid')
  id_turno_caja!: string;

  @Column({ type: 'uuid', nullable: true })
  id_metodo_pago?: string | null;

  @Column('uuid')
  id_usuario!: string;

  @Column({
    type: 'enum',
    enum: TipoMovimientoCaja,
  })
  tipo_movimiento!: TipoMovimientoCaja;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  monto!: number;

  @Column({ type: 'varchar', length: 100 })
  concepto!: string;

  @Column({ type: 'boolean', default: true })
  afecta_caja_fisica!: boolean;

  @Column({ type: 'text', nullable: true })
  motivo?: string | null;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  fecha!: string;

  @CreateDateColumn({ type: 'timestamptz', default: () => 'NOW()' })
  created_at!: string;

  @ManyToOne(() => TurnoCajaEntity, (t) => t.movimientos, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'id_turno_caja' })
  turno?: TurnoCajaEntity;

  @ManyToOne(() => MetodoPagoEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'id_metodo_pago' })
  metodo_pago?: MetodoPagoEntity | null;

  @ManyToOne(() => UsuarioEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'id_usuario' })
  usuario?: UsuarioEntity;
}
