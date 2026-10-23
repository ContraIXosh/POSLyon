import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';
import { ConfiguracionSucursalEntity } from './configuracion-sucursal.entity';

/**
 * Entidad de Sucursal Física o Virtual (`SUCURSAL` — ERD).
 *
 * Representa un punto de venta, centro de distribución o casa matriz.
 * Implementa borrado lógico (`deleted_at`), control de concurrencia optimista (`version`)
 * y relación One-to-One con `CONFIGURACION_SUCURSAL`.
 */
@Entity('sucursal')
@Index('idx_sucursal_nombre', ['nombre'])
@Index('idx_sucursal_activo', ['activo'])
export class SucursalEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100 })
  nombre!: string;

  @Column({ type: 'varchar', length: 255 })
  direccion!: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  telefono?: string | null;

  @Column({ type: 'boolean', default: false })
  en_linea!: boolean;

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

  @OneToOne(
    () => ConfiguracionSucursalEntity,
    (config) => config.sucursal,
    { cascade: true },
  )
  configuracion?: ConfiguracionSucursalEntity;
}
