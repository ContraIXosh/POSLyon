import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { TipoEfectoPromocion } from '@poslyon/domain-core';

/**
 * Entidad TypeORM que representa una regla de promoción comercial (ERD: PROMOCION - RF-06 / O-11).
 * 
 * Reglas de Arquitectura (Patrón Strategy):
 * - Ninguna promoción muta el precio de lista (`precio_unitario`);
 *   todas generan un `monto_descuento` aditivo.
 */
@Entity('promocion')
@Index(['id_sucursal', 'activo'])
export class PromocionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  id_sucursal!: string;

  @Column({ type: 'varchar', length: 150 })
  nombre!: string;

  @Column({
    type: 'varchar',
    length: 30,
    default: TipoEfectoPromocion.PORCENTAJE,
  })
  tipo_efecto!: TipoEfectoPromocion;

  @Column({
    type: 'numeric',
    precision: 5,
    scale: 2,
    default: 0.0,
    transformer: {
      to: (value: number) => value,
      from: (value: string | number) => Number(value),
    },
  })
  valor_efecto!: number; // Porcentaje (ej: 20%), monto fijo o cantidad a pagar en 2x1

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 4,
    default: 1.0,
    transformer: {
      to: (value: number) => value,
      from: (value: string | number) => Number(value),
    },
  })
  cantidad_minima!: number;

  @Column({ type: 'uuid', nullable: true })
  id_producto_aplicable?: string | null; // Si es null, aplica a toda la sucursal o combo

  @Column({ type: 'boolean', default: true })
  activo!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: string;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: string;
}
