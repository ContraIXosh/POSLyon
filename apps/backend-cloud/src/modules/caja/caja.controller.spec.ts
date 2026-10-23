import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import {
  EstadoTurnoCaja,
  TipoMovimientoCaja,
} from '@poslyon/domain-core';
import { AppModule } from '../../app.module';
import { configureApp } from '../../bootstrap';
import { POSLYON_DATA_SOURCE } from '../../database/database.module';

const SUCURSAL_UUID = '550e8400-e29b-41d4-a716-446655440060';
const USUARIO_CAJERO_UUID = '550e8400-e29b-41d4-a716-446655440061';
const USUARIO_SUPERVISOR_UUID = '550e8400-e29b-41d4-a716-446655440062';
const TURNO_UUID = '550e8400-e29b-41d4-a716-446655440063';

const USUARIO_CON_TURNO_ABIERTO = '550e8400-e29b-41d4-a716-446655440099';

describe('Paso 3.1 — Módulo Turnos de Caja, Movimientos y Arqueo Ciego (RF-17 / O-16 / O-23)', () => {
  let app: INestApplication;
  let mockQueryRunner: any;

  beforeAll(async () => {
    process.env.SKIP_DB_INIT_ON_BOOT = 'true';

    mockQueryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      query: jest.fn().mockImplementation((sql: string, params?: any[]) => {
        if (sql.includes('SELECT id FROM turno_caja') && sql.includes('WHERE id_usuario = $1')) {
          if (params?.[0] === USUARIO_CON_TURNO_ABIERTO) {
            return Promise.resolve([{ id: 'turno-abierto-existente' }]);
          }
          return Promise.resolve([]); // Sin turno abierto previo
        }
        if (sql.includes('INSERT INTO turno_caja')) {
          return Promise.resolve([
            {
              id: params?.[0] || TURNO_UUID,
              id_sucursal: params?.[1],
              id_usuario: params?.[2],
              monto_inicial_efectivo: params?.[3],
              estado: EstadoTurnoCaja.ABIERTO,
              version: 1,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ]);
        }
        if (sql.includes('INSERT INTO auditoria')) {
          return Promise.resolve([{ id: 'audit-caja-123' }]);
        }
        if (sql.includes('SELECT id, estado FROM turno_caja WHERE id = $1')) {
          return Promise.resolve([
            {
              id: TURNO_UUID,
              estado: EstadoTurnoCaja.ABIERTO,
            },
          ]);
        }
        if (sql.includes('INSERT INTO movimiento_caja')) {
          return Promise.resolve([
            {
              id: params?.[0] || 'mov-uuid-1',
              id_turno_caja: params?.[1],
              id_usuario: params?.[3],
              tipo_movimiento: params?.[4],
              monto: params?.[5],
              concepto: params?.[6],
              afecta_caja_fisica: params?.[7],
              fecha: new Date().toISOString(),
            },
          ]);
        }
        if (sql.includes('SELECT * FROM turno_caja WHERE id = $1 FOR UPDATE')) {
          return Promise.resolve([
            {
              id: TURNO_UUID,
              id_sucursal: SUCURSAL_UUID,
              id_usuario: USUARIO_CAJERO_UUID,
              monto_inicial_efectivo: 10000,
              estado: EstadoTurnoCaja.ABIERTO,
              version: 1,
            },
          ]);
        }
        if (sql.includes('SELECT * FROM turno_caja WHERE id = $1')) {
          return Promise.resolve([
            {
              id: TURNO_UUID,
              id_sucursal: SUCURSAL_UUID,
              id_usuario: USUARIO_CAJERO_UUID,
              monto_inicial_efectivo: 10000,
              estado: EstadoTurnoCaja.ABIERTO,
              version: 1,
            },
          ]);
        }
        if (sql.includes('FROM movimiento_caja') && sql.includes('GROUP BY tipo_movimiento')) {
          return Promise.resolve([
            { tipo_movimiento: TipoMovimientoCaja.INGRESO, concepto: 'CAMBIO_INGRESO', total: 5000 },
            { tipo_movimiento: TipoMovimientoCaja.EGRESO, concepto: 'SANGRIA_RETIRO', total: 3000 },
          ]);
        }
        if (sql.includes('UPDATE turno_caja') && sql.includes('efectivo_declarado = $1')) {
          return Promise.resolve([
            {
              id: TURNO_UUID,
              efectivo_declarado: params?.[0],
              diferencia_caja: params?.[1],
              estado: EstadoTurnoCaja.CERRADO,
              version: 2,
            },
          ]);
        }
        if (sql.includes('UPDATE turno_caja') && sql.includes('efectivo_rectificado = $1')) {
          return Promise.resolve([
            {
              id: TURNO_UUID,
              efectivo_rectificado: params?.[0],
              id_usuario_rectifica: params?.[1],
              motivo_rectificacion: params?.[2],
              estado: EstadoTurnoCaja.RECTIFICADO,
              version: 3,
            },
          ]);
        }
        return Promise.resolve([]);
      }),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: {
        query: jest.fn().mockImplementation((sql: string, params?: any[]) => {
          return mockQueryRunner.query(sql, params);
        }),
      },
    };

    const mockDataSource = {
      isInitialized: true,
      query: jest.fn().mockImplementation((sql: string, params?: any[]) => {
        if (sql.includes('to_regclass')) {
          return Promise.resolve([{ existe: 'metodo_pago' }]);
        }
        return mockQueryRunner.query(sql, params);
      }),
      createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
    } as unknown as DataSource;

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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. POST /api/caja/turnos/abrir (Apertura de Turno y Fondo Fijo)', () => {
    it('debe abrir un turno con fondo inicial y registrar auditoría forense', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/caja/turnos/abrir')
        .set('x-audit-reason', 'Apertura de turno matutino')
        .send({
          id_sucursal: SUCURSAL_UUID,
          id_usuario: USUARIO_CAJERO_UUID,
          monto_inicial_efectivo: 10000,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.estado).toBe('ABIERTO');
      expect(response.body.monto_inicial_efectivo).toBe(10000);
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalledTimes(1);
    });

    it('debe rechazar con HTTP 409 Conflict si el cajero ya posee un turno abierto en la sucursal (O-16)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/caja/turnos/abrir')
        .send({
          id_sucursal: SUCURSAL_UUID,
          id_usuario: USUARIO_CON_TURNO_ABIERTO,
          monto_inicial_efectivo: 5000,
        })
        .expect(409);

      expect(response.body.mensaje).toContain('ya posee el turno abierto');
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
    });
  });

  describe('2. POST /api/caja/movimientos (Movimientos Directos de Gaveta)', () => {
    it('debe asentar un ingreso manual de cambio en turno abierto', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/caja/movimientos')
        .send({
          id_turno_caja: TURNO_UUID,
          id_usuario: USUARIO_CAJERO_UUID,
          tipo_movimiento: TipoMovimientoCaja.INGRESO,
          monto: 5000,
          concepto: 'CAMBIO_INGRESO',
          afecta_caja_fisica: true,
          motivo: 'Refuerzo de cambio de billetes chicos',
        })
        .expect(201);

      expect(response.body.monto).toBe(5000);
      expect(response.body.tipo_movimiento).toBe('INGRESO');
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalledTimes(1);
    });
  });

  describe('3. POST /api/caja/turnos/:id/cerrar-ciego (Arqueo Ciego RF-17 / O-23)', () => {
    it('debe calcular el esperado, fijar el descuadre y cerrar el turno incondicionalmente', async () => {
      // Esperado: 10000 (inicial) + 5000 (ingreso) - 3000 (sangría) = 12000
      // Cajero declara ciegamente: 12500 -> Sobrante: +500
      const response = await request(app.getHttpServer())
        .post(`/api/caja/turnos/${TURNO_UUID}/cerrar-ciego`)
        .send({
          efectivo_declarado_ciego: 12500,
          version: 1,
          motivo: 'Fin de jornada laboral matutina',
        })
        .expect(200);

      expect(response.body.estado).toBe('CERRADO');
      expect(response.body.efectivo_declarado).toBe(12500);
      expect(response.body.desglose_arqueo_ciego.efectivo_esperado_sistema).toBe(12000);
      expect(response.body.desglose_arqueo_ciego.diferencia_caja).toBe(500);
      expect(response.body.desglose_arqueo_ciego.estado_cuadre).toBe('SOBRANTE');
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalledTimes(1);
    });

    it('debe rechazar con HTTP 409 Conflict si la versión del turno está desfasada (OCC)', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/caja/turnos/${TURNO_UUID}/cerrar-ciego`)
        .send({
          efectivo_declarado_ciego: 12000,
          version: 99, // Desfasaje OCC
          motivo: 'Intento de cierre concurrente desfasado',
        })
        .expect(409);

      expect(response.body.codigo).toBe('OCC_VERSION_MISMATCH');
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
    });
  });

  describe('4. POST /api/caja/turnos/:id/rectificar (Rectificación Supervisada O-16 / S-04)', () => {
    it('debe permitir a un supervisor asentar el arqueo rectificado auditado', async () => {
      // Mock de turno cerrado previamente
      mockQueryRunner.query.mockImplementationOnce((sql: string) => {
        if (sql.includes('SELECT * FROM turno_caja WHERE id = $1 FOR UPDATE')) {
          return Promise.resolve([
            {
              id: TURNO_UUID,
              estado: EstadoTurnoCaja.CERRADO,
              version: 2,
            },
          ]);
        }
        return Promise.resolve([]);
      });
      mockQueryRunner.query.mockImplementationOnce((sql: string) => {
        if (sql.includes('SELECT * FROM turno_caja WHERE id = $1')) {
          return Promise.resolve([
            {
              id: TURNO_UUID,
              estado: EstadoTurnoCaja.CERRADO,
              version: 2,
            },
          ]);
        }
        return Promise.resolve([]);
      });

      const response = await request(app.getHttpServer())
        .post(`/api/caja/turnos/${TURNO_UUID}/rectificar`)
        .send({
          efectivo_rectificado: 12000,
          id_supervisor: USUARIO_SUPERVISOR_UUID,
          version: 2,
          motivo: 'Se recontaron billetes doblados en el compartimento inferior',
        })
        .expect(200);

      expect(response.body.estado).toBe('RECTIFICADO');
      expect(response.body.efectivo_rectificado).toBe(12000);
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalledTimes(1);
    });
  });
});
