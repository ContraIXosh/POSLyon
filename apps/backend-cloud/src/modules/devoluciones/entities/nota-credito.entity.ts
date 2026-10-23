import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { INotaCredito, TipoDevolucion } from '@poslyon/domain-core';
import { NotaCreditoDetalleEntity } from './nota-credito-detalle.entity';

/**
 * Entidad TypeORM para la Nota de Crédito y Devolución (ERD: NOTA_CREDITO - RF-09 / RF-10 / RF-11).
 * 
 * Reglas de Arquitectura:
 * - `id_venta`: Enlace con la venta histórica de origen (para snapshots de precios y descuentos).
 * - `id_turno_caja`: Enlace con el turno de caja ACTIVO hoy donde impacta financieramente (RF-17).
 * - `tipo_devolucion`: Modalidad de compensación (EFECTIVO_CAJA, REDUCCION_DEUDA, SIN_REINTEGRO_MONETARIO).
 */
@Entity('nota_credito')
@Index(['id_venta'])
@Index(['id_turno_caja'])
@Index(['id_cliente'])
@Index(['numero_comprobante'])
export class NotaCreditoEntity implements INotaCredito {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 50 })
  numero_comprobante!: string;

  @Column({ type: 'uuid' })
  id_venta!: string;

  @Column({ type: 'uuid', nullable: true })
  id_cliente?: string | null;

  @Column({ type: 'uuid' })
  id_usuario!: string;

  @Column({ type: 'uuid' })
  id_turno_caja!: string;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: {
      to: (value: number) => value,
      from: (value: string | number) => Number(value),
    },
  })
  monto_total!: number;

  @Column({
    type: 'varchar',
    length: 30,
    default: TipoDevolucion.EFECTIVO_CAJA,
  })
  tipo_devolucion!: TipoDevolucion;

  @Column({ type: 'varchar', length: 255 })
  motivo!: string;

  @Column({ type: 'timestamptz' })
  fecha!: string;

  @OneToMany(() => NotaCreditoDetalleEntity, (detalle) => detalle.nota_credito, { cascade: true })
  detalles!: NotaCreditoDetalleEntity[];

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: string;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: string;
}
