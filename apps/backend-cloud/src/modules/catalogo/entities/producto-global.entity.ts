import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';
import { IProductoGlobal, TipoVentaProducto } from '@poslyon/domain-core';
import { CategoriaEntity } from './categoria.entity';
import { CodigoBarraEntity } from './codigo-barra.entity';
import { ProductoSucursalEntity } from './producto-sucursal.entity';

/**
 * Entidad Maestra de Catálogo Central Global (`PRODUCTO_GLOBAL` — ERD / RF-04 / RF-21).
 *
 * Mantiene la definición intrínseca del producto compartida entre todas las sucursales.
 * Admite el UUID canónico RFC 4122 Nil UUID para el Artículo Comodín (`UUID_ARTICULO_COMODIN`).
 */
@Entity('producto_global')
@Index('idx_producto_global_nombre', ['nombre'])
@Index('idx_producto_global_categoria', ['id_categoria'])
@Index('idx_producto_global_activo', ['activo'])
export class ProductoGlobalEntity implements IProductoGlobal {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', nullable: true })
  id_categoria!: string;

  @Column({ type: 'varchar', length: 150 })
  nombre!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  descripcion?: string | null;

  @Column({
    type: 'enum',
    enum: TipoVentaProducto,
    default: TipoVentaProducto.UNIDAD,
  })
  tipo_venta!: TipoVentaProducto;

  @Column({ type: 'uuid', nullable: true })
  id_producto_base?: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 3, default: 1 })
  multiplicador_stock!: number;

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

  @ManyToOne(() => CategoriaEntity, (c) => c.productos, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'id_categoria' })
  categoria?: CategoriaEntity | null;

  @OneToMany(() => CodigoBarraEntity, (cb) => cb.producto, { cascade: true })
  codigos_barra?: CodigoBarraEntity[];

  @OneToMany(() => ProductoSucursalEntity, (ps) => ps.producto, { cascade: true })
  sucursales?: ProductoSucursalEntity[];
}
