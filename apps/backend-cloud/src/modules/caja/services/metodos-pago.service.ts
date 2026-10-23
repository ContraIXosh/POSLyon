import {
  Inject,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';
import { POSLYON_DATA_SOURCE } from '../../../database/database.module';
import { MetodoPagoEntity } from '../entities/metodo-pago.entity';

export const METODOS_PAGO_CANONICOS = [
  { nombre: 'EFECTIVO', afecta_caja_fisica: true },
  { nombre: 'TARJETA_DEBITO', afecta_caja_fisica: false },
  { nombre: 'TARJETA_CREDITO', afecta_caja_fisica: false },
  { nombre: 'TRANSFERENCIA_BANCARIA', afecta_caja_fisica: false },
  { nombre: 'CUENTA_CORRIENTE', afecta_caja_fisica: false },
];

@Injectable()
export class MetodosPagoService implements OnModuleInit {
  private readonly logger = new Logger(MetodosPagoService.name);

  constructor(
    @Inject(POSLYON_DATA_SOURCE)
    private readonly dataSource: DataSource,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.sembrarMetodosPagoCanonicos();
  }

  /**
   * Sembrado inicial e idempotente del catálogo canónico de métodos de pago.
   */
  async sembrarMetodosPagoCanonicos(): Promise<void> {
    if (!this.dataSource.isInitialized) return;

    try {
      const check = await this.dataSource.query(
        `SELECT to_regclass('public.metodo_pago') AS existe`,
      );
      if (!check?.[0]?.existe) return;

      for (const mp of METODOS_PAGO_CANONICOS) {
        await this.dataSource.query(
          `INSERT INTO metodo_pago (id, nombre, afecta_caja_fisica, activo, version, created_at, updated_at)
           VALUES ($1, $2, $3, true, 1, NOW(), NOW())
           ON CONFLICT (nombre) DO UPDATE
           SET afecta_caja_fisica = EXCLUDED.afecta_caja_fisica, activo = true`,
          [randomUUID(), mp.nombre, mp.afecta_caja_fisica],
        );
      }
      this.logger.log('Catálogo canónico de métodos de pago asegurado exitosamente.');
    } catch (err: any) {
      this.logger.warn(`No se pudo sembrar métodos de pago: ${err.message}`);
    }
  }

  async listarMetodosPago(): Promise<MetodoPagoEntity[]> {
    if (!this.dataSource.isInitialized) return [];
    return await this.dataSource.query(
      `SELECT id, nombre, afecta_caja_fisica, activo, version, created_at, updated_at
       FROM metodo_pago WHERE activo = true ORDER BY nombre ASC`,
    );
  }
}
