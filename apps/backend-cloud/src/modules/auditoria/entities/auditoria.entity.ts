import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
} from 'typeorm';
import { AccionAuditoria, IAuditoria } from '@poslyon/domain-core';

/**
 * Entidad de Auditoría Forense Global e Inmutable (`AUDITORIA` — RF-19 / RNF-03).
 *
 * Persiste snapshots de estado (`valor_anterior` y `valor_nuevo` en columnas `JSONB`)
 * de cada mutación crítica del sistema. Prohíbe cualquier mutación (UPDATE o DELETE físico);
 * cada registro es de solo inserción (Append-Only Log).
 */
@Entity('auditoria')
@Index('idx_auditoria_tabla_registro', ['tabla_afectada', 'id_registro_afectado'])
@Index('idx_auditoria_fecha', ['fecha'])
@Index('idx_auditoria_usuario', ['id_usuario'])
export class AuditoriaEntity implements IAuditoria {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('uuid')
  id_usuario!: string;

  @Column({ type: 'varchar', length: 100 })
  tabla_afectada!: string;

  @Column({ type: 'uuid', nullable: true })
  id_registro_afectado?: string | null;

  @Column({
    type: 'enum',
    enum: AccionAuditoria,
    default: AccionAuditoria.MODIFICACION,
  })
  accion!: AccionAuditoria;

  @Column({ type: 'jsonb', nullable: true })
  valor_anterior?: Record<string, any> | null;

  @Column({ type: 'jsonb', nullable: true })
  valor_nuevo?: Record<string, any> | null;

  @Column({ type: 'text', nullable: true })
  motivo?: string | null;

  @CreateDateColumn({ type: 'timestamptz', default: () => 'NOW()' })
  fecha!: string;
}
