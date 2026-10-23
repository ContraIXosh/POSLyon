import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  VersionColumn,
  Index,
  OneToMany,
} from 'typeorm';
import {
  EstadoFinanciero,
  EstadoGeneral,
  EstadoLogistico,
  IVenta,
} from '@poslyon/domain-core';
import { VentaDetalleEntity } from './venta-detalle.entity';
import { PagoVentaEntity } from './pago-venta.entity';

/**
 * Entidad TypeORM que representa la cabecera inmutable de Venta (ERD: VENTA - RF-01 / RF-02 / RF-17).
 * 
 * Reglas de Arquitectura:
 * - `id_turno_caja`: Obligatorio en estado CONFIRMADA para fijar el arqueo contable de caja física (RF-17).
 * - `estado_general`, `estado_logistico`, `estado_financiero`: Máquina de Estados Ortogonal de Harel.
 * - `tiene_devolucion_parcial`: Flag que preserva la inmutabilidad de la venta original ante devoluciones (RF-11).
 * - `version`: Control de Concurrencia Optimista (OCC / RNF-04).
 */
@Entity('venta')
@Index(['id_sucursal', 'fecha'])
@Index(['id_turno_caja'])
@Index(['id_usuario'])
@Index(['id_cliente'])
@Index(['numero_comprobante'])
export class VentaEntity implements IVenta {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  id_sucursal!: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  numero_comprobante?: string | null;

  @Column({ type: 'uuid', nullable: true })
  id_turno_caja!: string | null;

  @Column({ type: 'uuid' })
  id_usuario!: string;

  @Column({ type: 'uuid', nullable: true })
  id_cliente?: string | null;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: {
      to: (value: number) => value,
      from: (value: string | number) => Number(value),
    },
  })
  total!: number;

  @Column({ type: 'timestamptz' })
  fecha!: string;

  @Column({
    type: 'varchar',
    length: 30,
    default: EstadoGeneral.CONFIRMADA,
  })
  estado_general!: EstadoGeneral;

  @Column({
    type: 'varchar',
    length: 30,
    default: EstadoLogistico.ENTREGADO,
  })
  estado_logistico!: EstadoLogistico;

  @Column({
    type: 'varchar',
    length: 30,
    default: EstadoFinanciero.PAGADO,
  })
  estado_financiero!: EstadoFinanciero;

  @Column({ type: 'boolean', default: false })
  tiene_devolucion_parcial!: boolean;

  @Column({ type: 'boolean', default: false })
  es_compartido!: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  fecha_expiracion_reserva?: string | null;

  @VersionColumn({ default: 1 })
  version!: number;

  @OneToMany(() => VentaDetalleEntity, (detalle) => detalle.venta, { cascade: true })
  detalles!: VentaDetalleEntity[];

  @OneToMany(() => PagoVentaEntity, (pago) => pago.venta, { cascade: true })
  pagos!: PagoVentaEntity[];

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: string;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: string;
}
