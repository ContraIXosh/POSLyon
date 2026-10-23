import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  VersionColumn,
  Index,
} from 'typeorm';
import { ICliente } from '@poslyon/domain-core';

/**
 * Entidad TypeORM que representa la tabla relacional `cliente` (ERD: CLIENTE - RF-07 / RF-08).
 * 
 * Reglas de Negocio e Invariantes Financieras:
 * - `saldo_deudor`: Monto consolidado que el cliente adeuda al comercio. Incondicionalmente no negativo (>= 0.00).
 * - `limite_credito`: Cupo máximo autorizado para compras a crédito / fiadas en mostrador.
 * - `requiere_revision`: Flag que se activa en `true` cuando una venta offline sincronizada tardíamente
 *   supera el límite de crédito en el servidor autoritativo (Resolución C-10).
 * - `version`: Contador secuencial para Control de Concurrencia Optimista (OCC / RNF-04).
 * - `activo` y `deleted_at`: Implementación de Borrado Lógico (Soft Delete) inmutable.
 */
@Entity('cliente')
@Index(['id_sucursal', 'activo'])
@Index(['dni_cuit'], { unique: true, where: 'deleted_at IS NULL AND dni_cuit IS NOT NULL' })
export class ClienteEntity implements ICliente {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  id_sucursal!: string;

  @Column({ type: 'varchar', length: 150 })
  nombre!: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  dni_cuit?: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  telefono?: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  email?: string | null;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0.0,
    transformer: {
      to: (value: number) => value,
      from: (value: string | number) => Number(value),
    },
  })
  limite_credito!: number;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0.0,
    transformer: {
      to: (value: number) => value,
      from: (value: string | number) => Number(value),
    },
  })
  saldo_deudor!: number;

  @Column({ type: 'boolean', default: false })
  requiere_revision!: boolean;

  @VersionColumn({ default: 1 })
  version!: number;

  @Column({ type: 'boolean', default: true })
  activo!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: string;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: string;

  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deleted_at?: string | null;
}
