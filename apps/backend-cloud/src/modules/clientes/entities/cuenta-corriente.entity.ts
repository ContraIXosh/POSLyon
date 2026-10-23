import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ICuentaCorriente, TipoMovimientoCC } from '@poslyon/domain-core';

/**
 * Entidad TypeORM que representa el Libro Mayor de Cuenta Corriente (ERD: CUENTA_CORRIENTE - RF-08).
 * 
 * Principio Arquitectónico — Patrón Signed Ledger (Libro Mayor Firmado e Inmutable):
 * 1. Append-Only: Jamás se realiza UPDATE o DELETE físico en los asientos de esta tabla.
 * 2. Convención de Signos Financieros:
 *    - `VENTA_CREDITO`: Monto positivo (+monto). Incrementa la deuda del cliente.
 *    - `ABONO`: Monto negativo (-monto). Reduce la deuda del cliente mediante un pago.
 *    - `AJUSTE_DEVOLUCION`: Monto negativo (-monto). Reduce la deuda mediante una Nota de Crédito (RF-10).
 * 3. Idempotencia Unificada (Resolución O-22):
 *    - `id` es un UUIDv4 generado en el origen. Si el cliente o el proceso de sincronización
 *      reintenta el envío de un abono, la clave primaria garantiza no-duplicidad (`ON CONFLICT (id) DO NOTHING`).
 * 4. Trazabilidad de Auditoría y Flujo Físico:
 *    - `id_turno_caja`: Vincula los abonos en efectivo físico con la gaveta de la sucursal (Resolución O-21).
 *    - `saldo_resultante`: Fotografía matemática del saldo deudor consolidado tras asentar la transacción.
 */
@Entity('cuenta_corriente')
@Index(['id_cliente', 'fecha'])
@Index(['id_venta'])
@Index(['id_turno_caja'])
export class CuentaCorrienteEntity implements ICuentaCorriente {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  id_cliente!: string;

  @Column({ type: 'uuid', nullable: true })
  id_venta?: string | null;

  @Column({ type: 'uuid', nullable: true })
  id_nota_credito?: string | null;

  @Column({ type: 'uuid', nullable: true })
  id_metodo_pago?: string | null;

  @Column({ type: 'uuid', nullable: true })
  id_turno_caja?: string | null;

  @Column({ type: 'uuid', nullable: true })
  id_usuario?: string | null;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: {
      to: (value: number) => value,
      from: (value: string | number) => Number(value),
    },
  })
  monto!: number;

  @Column({
    type: 'varchar',
    length: 30,
  })
  tipo_movimiento!: TipoMovimientoCC;

  @Column({ type: 'varchar', length: 255 })
  concepto!: string;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: {
      to: (value: number) => value,
      from: (value: string | number) => Number(value),
    },
  })
  saldo_resultante!: number;

  @Column({ type: 'timestamptz' })
  fecha!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: string;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: string;
}
