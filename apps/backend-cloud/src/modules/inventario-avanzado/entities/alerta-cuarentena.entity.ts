import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';
import { EstadoCuarentena } from '@poslyon/domain-core';
import { IAlertaCuarentena } from '@poslyon/domain-core';

@Entity('alerta_cuarentena')
export class AlertaCuarentenaEntity implements IAlertaCuarentena {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  id_sucursal!: string;

  @Column({ type: 'uuid' })
  id_producto!: string;

  @Column({ type: 'uuid', nullable: true })
  id_venta?: string | null;

  @Column({ type: 'uuid' })
  id_usuario_reporta!: string;

  @Column({ type: 'uuid', nullable: true })
  id_usuario_resuelve?: string | null;

  @Column({ type: 'decimal', precision: 12, scale: 4 })
  cantidad_faltante!: number;

  @Column({
    type: 'varchar',
    length: 30,
    default: EstadoCuarentena.PENDIENTE,
  })
  estado!: EstadoCuarentena;

  @Column({ type: 'text', nullable: true })
  observacion?: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: string;

  @Column({ type: 'timestamptz', nullable: true })
  resolved_at?: string | null;
}
