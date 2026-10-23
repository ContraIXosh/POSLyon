import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';
import {
  IConfiguracionSucursal,
  IReglasNegocioSucursal,
  ModoNodoLan,
  PlanComercial,
} from '@poslyon/domain-core';
import { SucursalEntity } from './sucursal.entity';

/**
 * Entidad de Configuración Transversal por Sucursal (`CONFIGURACION_SUCURSAL` — RF-21 / ERD).
 *
 * Almacena el plan comercial, rol en topología LAN (`MAESTRO_LAN`, `SECUNDARIO_LAN`) y
 * las reglas de negocio extensibles en columna `JSONB` (`reglas_negocio` y `feature_toggles`),
 * garantizando invariancia de esquema $N=1$.
 */
@Entity('configuracion_sucursal')
@Index('idx_config_sucursal_id_sucursal', ['id_sucursal'], { unique: true })
export class ConfiguracionSucursalEntity implements IConfiguracionSucursal {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('uuid')
  id_sucursal!: string;

  @Column({
    type: 'enum',
    enum: PlanComercial,
    default: PlanComercial.BASICO_LOCAL,
  })
  plan_activo!: PlanComercial;

  @Column({
    type: 'enum',
    enum: ModoNodoLan,
    default: ModoNodoLan.MAESTRO_LAN,
  })
  modo_nodo_lan!: ModoNodoLan;

  @Column({ type: 'text', nullable: true })
  licencia_token?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  lan_master_url?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  cloud_endpoint_url?: string | null;

  @Column({ type: 'jsonb' })
  reglas_negocio!: IReglasNegocioSucursal;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  ultima_modificacion!: string;

  @VersionColumn({ default: 1 })
  version!: number;

  @CreateDateColumn({ type: 'timestamptz', default: () => 'NOW()' })
  created_at!: string;

  @UpdateDateColumn({ type: 'timestamptz', default: () => 'NOW()' })
  updated_at!: string;

  @OneToOne(() => SucursalEntity, (sucursal) => sucursal.configuracion, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'id_sucursal' })
  sucursal?: SucursalEntity;
}
