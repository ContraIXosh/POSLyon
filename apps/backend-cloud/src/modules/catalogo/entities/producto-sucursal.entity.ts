import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';
import { IProductoSucursal } from '@poslyon/domain-core';
import { ProductoGlobalEntity } from './producto-global.entity';
import { SucursalEntity } from '../../sucursales/entities/sucursal.entity';

/**
 * Instancia Física y Contable del Producto en una Sucursal Específica (`PRODUCTO_SUCURSAL` — RF-02 / RF-21 / C-12).
 *
 * Los precios y existencias se aíslan por tienda. La columna `stock_fisico` admite valores negativos
 * en estricto cumplimiento de la política permisiva de mostrador (`UNIVERSAL_PERMISIVO` — Resolución C-12).
 */
@Entity('producto_sucursal')
@Index('idx_producto_sucursal_unique', ['id_producto', 'id_sucursal'], {
  unique: true,
})
@Index('idx_producto_sucursal_stock', ['id_sucursal', 'stock_fisico'])
export class ProductoSucursalEntity implements IProductoSucursal {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('uuid')
  id_sucursal!: string;

  @Column('uuid')
  id_producto!: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  precio_costo!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  precio_minorista!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  precio_mayorista!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  precio_minorista_pendiente?: number | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  precio_mayorista_pendiente?: number | null;

  @Column({ type: 'timestamptz', nullable: true })
  fecha_vigencia_pendiente?: string | null;

  @Column({ type: 'decimal', precision: 12, scale: 3, default: 0 })
  stock_fisico!: number;

  @Column({ type: 'decimal', precision: 12, scale: 3, default: 0 })
  stock_reservado!: number;

  @Column({ type: 'decimal', precision: 12, scale: 3, default: 0 })
  stock_minimo!: number;

  @VersionColumn({ default: 1 })
  version!: number;

  @Column({ type: 'boolean', default: true })
  activo!: boolean;

  @CreateDateColumn({ type: 'timestamptz', default: () => 'NOW()' })
  created_at!: string;

  @UpdateDateColumn({ type: 'timestamptz', default: () => 'NOW()' })
  updated_at!: string;

  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deleted_at?: string | null;

  @ManyToOne(() => ProductoGlobalEntity, (p) => p.sucursales, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'id_producto' })
  producto?: ProductoGlobalEntity;

  @ManyToOne(() => SucursalEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_sucursal' })
  sucursal?: SucursalEntity;
}
