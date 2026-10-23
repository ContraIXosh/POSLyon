import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ISyncCursor } from '@poslyon/domain-core';

@Entity('sync_cursor')
export class SyncCursorEntity implements ISyncCursor {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  id_sucursal!: string;

  @Column({ type: 'varchar', length: 20 })
  nodo_destino!: 'LAN_MASTER' | 'CLOUD_CENTRAL';

  @Column({ type: 'timestamptz' })
  last_pulled_at!: string;

  @Column({ type: 'timestamptz', nullable: true })
  last_pushed_at?: string | null;

  @Column({ type: 'int', default: 1 })
  schema_version!: number;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: string;
}
