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
import { EstadoRecepcion, IRecepcionMercaderia } from '@poslyon/domain-core';
import { RecepcionMercaderiaDetalleEntity } from './recepcion-mercaderia-detalle.entity';

/**
 * Entidad TypeORM para la cabecera de remito o recepción de mercadería (ERD: RECEPCION_MERCADERIA - RF-14 / RF-15).
 */
@Entity('recepcion_mercaderia')
@Index(['id_sucursal', 'estado'])
@Index(['id_proveedor'])
@Index(['numero_remito'])
export class RecepcionMercaderiaEntity implements IRecepcionMercaderia {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  id_sucursal!: string;

  @Column({ type: 'uuid' })
  id_proveedor!: string;

  @Column({ type: 'uuid' })
  id_usuario!: string;

  @Column({ type: 'varchar', length: 60 })
  numero_remito!: string;

  @Column({
    type: 'varchar',
    length: 30,
    default: EstadoRecepcion.BORRADOR,
  })
  estado!: EstadoRecepcion;

  @Column({ type: 'int', default: 0 })
  total_bultos!: number;

  @CreateDateColumn({ type: 'timestamptz' })
  fecha_inicio!: string;

  @Column({ type: 'timestamptz', nullable: true })
  fecha_completado?: string | null;

  @VersionColumn({ default: 1 })
  version!: number;

  @OneToMany(
    () => RecepcionMercaderiaDetalleEntity,
    (detalle) => detalle.recepcion,
    { cascade: true },
  )
  detalles!: RecepcionMercaderiaDetalleEntity[];

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: string;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: string;
}
