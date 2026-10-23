import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import {
  MotivoDevolucion,
  TipoDevolucion,
  UUID_ARTICULO_COMODIN,
  UUID_SYSTEM_BOT,
} from '@poslyon/domain-core';
import { AppModule } from '../../app.module';
import { configureApp } from '../../bootstrap';
import { POSLYON_DATA_SOURCE } from '../../database/database.module';
import { seedSystemEntities } from '../../database/seeds/system-entities.seed';

const VALID_UUID_1 = '550e8400-e29b-41d4-a716-446655440000';
const VALID_UUID_2 = '6ba7b810-9dad-41d1-80b4-00c04fd430c8';
const VALID_UUID_3 = '7c9e6679-7425-40de-944b-e07fc1f90ae7';

describe('Paso 1.1 — Bootstrap NestJS, ValidationPipe Global, Seed S-03 y Healthcheck HTTP', () => {
  let app: INestApplication;

  const mockDataSource = {
    isInitialized: true,
    query: jest.fn().mockResolvedValue([{ utc_now: '2026-10-23T17:00:00.000Z' }]),
    createQueryRunner: jest.fn().mockReturnValue({
      connect: jest.fn(),
      startTransaction: jest.fn(),
      query: jest.fn().mockImplementation((sql: string) => {
        if (sql.includes('to_regclass')) {
          return Promise.resolve([
            { tabla_usuario: 'usuario', tabla_producto_global: 'producto_global' },
          ]);
        }
        return Promise.resolve([]);
      }),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
    }),
  } as unknown as DataSource;

  beforeAll(async () => {
    process.env.SKIP_DB_INIT_ON_BOOT = 'true';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(POSLYON_DATA_SOURCE)
      .useValue(mockDataSource)
      .compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('1. GET /api/health (Diagnóstico de Servidor, Reloj Monótono y PostgreSQL)', () => {
    it('debe retornar HTTP 200 OK con estado del sistema, identidades canónicas S-03 y estado de PostgreSQL', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/health')
        .expect(200);

      expect(response.body.status).toBe('OK');
      expect(response.body.service).toBe('@poslyon/backend-cloud');
      expect(response.body.identidades_canonicas).toEqual({
        uuid_articulo_comodin: UUID_ARTICULO_COMODIN,
        uuid_system_bot: UUID_SYSTEM_BOT,
      });
      expect(response.body.clock_skew_guard.desfase_regresivo_detectado).toBe(
        false,
      );
      expect(response.body.database.status).toBe('UP');
      expect(response.body.database.pg_server_time_utc).toBe(
        '2026-10-23T17:00:00.000Z',
      );
    });
  });

  describe('2. POST /api/health/validar-venta-dto (Aduana Perimetral ValidationPipe)', () => {
    it('debe aceptar un CrearVentaDto válido, hidratar la clase e inferir el EstadoFinanciero PARCIAL', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/health/validar-venta-dto')
        .send({
          id_sucursal: VALID_UUID_1,
          id_turno_caja: VALID_UUID_2,
          id_usuario: VALID_UUID_3,
          id_cliente: VALID_UUID_1,
          total: 25000,
          pagos: [{ id_metodo_pago: VALID_UUID_2, monto: 10000 }],
        })
        .expect(200);

      expect(response.body.validacion).toBe('APROBADA_POR_VALIDATION_PIPE');
      expect(response.body.instancia_hidratada).toBe('CrearVentaDto');
      expect(
        response.body.resumen_financiero.estado_financiero_inferido,
      ).toBe('PARCIAL');
      expect(response.body.resumen_financiero.saldo_a_cuenta_corriente).toBe(
        15000,
      );
    });

    it('debe rechazar con HTTP 400 Bad Request un payload con campos intrusos no declarados (forbidNonWhitelisted: true)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/health/validar-venta-dto')
        .send({
          id_sucursal: VALID_UUID_1,
          id_turno_caja: VALID_UUID_2,
          id_usuario: VALID_UUID_3,
          total: 10000,
          pagos: [{ id_metodo_pago: VALID_UUID_2, monto: 10000 }],
          campo_malicioso_no_declarado: 'intento_mass_assignment',
        })
        .expect(400);

      expect(response.body.message).toEqual(
        expect.arrayContaining([
          expect.stringContaining('campo_malicioso_no_declarado'),
        ]),
      );
    });
  });

  describe('3. POST /api/health/simular-devolucion (Integración @IsUUIDOrNil S-03 + DevolucionesDomainService)', () => {
    it('debe admitir el Nil UUID del Artículo Comodín en el pipeline HTTP y calcular el reembolso neto RF-09', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/health/simular-devolucion')
        .send({
          id_venta: VALID_UUID_1,
          id_turno_caja: VALID_UUID_2,
          tipo_devolucion: TipoDevolucion.EFECTIVO_CAJA,
          motivo: MotivoDevolucion.DEFECTO_FABRICA,
          items: [
            {
              id_producto: UUID_ARTICULO_COMODIN, // 00000000-0000-0000-0000-000000000000
              cantidad: 2,
            },
          ],
        })
        .expect(200);

      expect(response.body.validacion_dto).toBe(
        'APROBADA_CON_SOPORTE_UUID_OR_NIL_S03',
      );
      expect(response.body.numero_comprobante_generado_s09).toBe(
        'NC-SUC01-00000001',
      );
      expect(response.body.reingresa_a_inventario_vendible_s08).toBe(false); // DEFECTO_FABRICA no vuelve a góndola
      expect(response.body.monto_total_reembolso_neto_rf09).toBe(2500);
      expect(response.body.renglones[0].es_articulo_comodin_s03).toBe(true);
    });
  });

  describe('4. Transaccionalidad ACID en seedSystemEntities (Resolución S-03)', () => {
    it('debe ejecutar ROLLBACK si ocurre una excepción SQL durante el seed de identidades de sistema', async () => {
      const mockRunnerError = {
        connect: jest.fn(),
        startTransaction: jest.fn(),
        query: jest.fn().mockRejectedValue(new Error('Fallo simulado de disco')),
        commitTransaction: jest.fn(),
        rollbackTransaction: jest.fn(),
        release: jest.fn(),
      };
      const dsError = {
        isInitialized: true,
        createQueryRunner: () => mockRunnerError,
      } as unknown as DataSource;

      await expect(seedSystemEntities(dsError)).rejects.toThrow(
        'Fallo simulado de disco',
      );
      expect(mockRunnerError.rollbackTransaction).toHaveBeenCalledTimes(1);
      expect(mockRunnerError.release).toHaveBeenCalledTimes(1);
    });
  });
});
