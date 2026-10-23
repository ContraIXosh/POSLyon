import { Inject, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  CrearDevolucionDto,
  CrearVentaDto,
  DevolucionesDomainService,
  EstadoFinanciero,
  RelojMonotonoGuard,
  UUID_ARTICULO_COMODIN,
  UUID_SYSTEM_BOT,
} from '@poslyon/domain-core';
import { obtenerConfiguracionPostgres } from '../../config/database.config';
import { POSLYON_DATA_SOURCE } from '../../database/database.module';
import { seedSystemEntities } from '../../database/seeds/system-entities.seed';

@Injectable()
export class HealthService {
  private readonly relojGuard = new RelojMonotonoGuard();

  constructor(
    @Inject(POSLYON_DATA_SOURCE)
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Evalúa el estado de salud del servidor NestJS, la guarda de reloj monótono (S-10),
   * las identidades canónicas de dominio (S-03) y la conexión activa a PostgreSQL.
   */
  async verificarEstadoSistema() {
    const cfg = obtenerConfiguracionPostgres();
    const evaluacionReloj = this.relojGuard.obtenerTiempoConfiable();

    let dbStatus: 'UP' | 'DOWN_DOCKER_OFFLINE' = 'DOWN_DOCKER_OFFLINE';
    let latencyMs: number | null = null;
    let pgServerTimeUtc: string | null = null;
    let seedStatus = 'No ejecutado (Base de datos desconectada)';

    try {
      const inicio = performance.now();
      if (!this.dataSource.isInitialized && process.env.SKIP_DB_INIT_ON_BOOT !== 'true') {
        await this.dataSource.initialize();
      }

      if (this.dataSource.isInitialized) {
        const rows = await this.dataSource.query(
          `SELECT (NOW() AT TIME ZONE 'UTC') AS utc_now`,
        );
        latencyMs = Number((performance.now() - inicio).toFixed(2));
        dbStatus = 'UP';
        if (rows?.[0]?.utc_now) {
          pgServerTimeUtc = new Date(rows[0].utc_now).toISOString();
          this.relojGuard.sincronizarHorarioServidor(
            new Date(pgServerTimeUtc).getTime(),
          );
        }
        const seedRes = await seedSystemEntities(this.dataSource);
        seedStatus = seedRes.detalle;
      }
    } catch {
      dbStatus = 'DOWN_DOCKER_OFFLINE';
    }

    return {
      status: 'OK',
      service: '@poslyon/backend-cloud',
      nivel_arquitectura: 'Nivel 1 — Infraestructura Base Backend (Paso 1.1)',
      timestamp_utc: evaluacionReloj.isoConfiable,
      clock_skew_guard: {
        high_watermark_utc: this.relojGuard.obtenerHighWatermarkActual(),
        desfase_regresivo_detectado: evaluacionReloj.desfaseRegresivoDetectado,
      },
      identidades_canonicas: {
        uuid_articulo_comodin: UUID_ARTICULO_COMODIN,
        uuid_system_bot: UUID_SYSTEM_BOT,
      },
      database: {
        engine: 'PostgreSQL 16 (TypeORM)',
        status: dbStatus,
        host: cfg.host,
        port: cfg.port,
        database: cfg.database,
        latency_ms: latencyMs,
        pg_server_time_utc: pgServerTimeUtc,
        system_seed: seedStatus,
      },
    };
  }

  /**
   * Procesa y verifica un `CrearVentaDto` que ya atravesó el `ValidationPipe` global de NestJS.
   */
  procesarValidacionVentaDto(dto: CrearVentaDto) {
    const sumaPagos = Number(
      dto.pagos.reduce((acc, item) => acc + item.monto, 0).toFixed(2),
    );
    const estadoFinancieroInferido =
      sumaPagos >= dto.total
        ? EstadoFinanciero.PAGADO
        : sumaPagos > 0
          ? EstadoFinanciero.PARCIAL
          : EstadoFinanciero.FIADO;

    return {
      validacion: 'APROBADA_POR_VALIDATION_PIPE',
      instancia_hidratada: dto.constructor.name,
      resumen_financiero: {
        total_venta: dto.total,
        suma_pagos_inmediatos: sumaPagos,
        saldo_a_cuenta_corriente: Math.max(
          0,
          Number((dto.total - sumaPagos).toFixed(2)),
        ),
        estado_financiero_inferido: estadoFinancieroInferido,
      },
      payload_validado: dto,
    };
  }

  /**
   * Simula el cálculo puro de una devolución validando `@IsUUIDOrNil` (S-03) e invocando
   * `DevolucionesDomainService` desde `@poslyon/domain-core`.
   */
  simularDevolucionConDominioPuro(dto: CrearDevolucionDto) {
    const renglonesCalculados = dto.items.map((item) => {
      const esComodin = item.id_producto === UUID_ARTICULO_COMODIN;
      const calculoReembolso =
        DevolucionesDomainService.calcularReembolsoNetoItem({
          cantidad_original: item.cantidad,
          precio_unitario_momento: 1500,
          monto_descuento_total_original: 250 * item.cantidad,
          cantidad_a_devolver: item.cantidad,
        });

      return {
        id_producto: item.id_producto,
        es_articulo_comodin_s03: esComodin,
        ...calculoReembolso,
      };
    });

    const montoTotalDevolucion = renglonesCalculados.reduce(
      (acc, r) => acc + r.subtotal_reembolso_neto,
      0,
    );

    const esReintegrableAGondola =
      DevolucionesDomainService.esReintegrableAInventarioVendible(dto.motivo);
    const numeroComprobanteSugerido =
      DevolucionesDomainService.generarNumeroComprobanteNC('SUC01', 1);

    return {
      validacion_dto: 'APROBADA_CON_SOPORTE_UUID_OR_NIL_S03',
      numero_comprobante_generado_s09: numeroComprobanteSugerido,
      reingresa_a_inventario_vendible_s08: esReintegrableAGondola,
      monto_total_reembolso_neto_rf09: montoTotalDevolucion,
      renglones: renglonesCalculados,
    };
  }
}
