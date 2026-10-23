import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import {
  ModoNodoLan,
  PlanComercial,
} from '@poslyon/domain-core';
import { AppModule } from '../../app.module';
import { configureApp } from '../../bootstrap';
import { POSLYON_DATA_SOURCE } from '../../database/database.module';

const SUCURSAL_UUID = '550e8400-e29b-41d4-a716-446655440001';
const CONFIG_UUID = '550e8400-e29b-41d4-a716-446655440002';

describe('Paso 2.1 — Módulo Sucursales y CONFIGURACION_SUCURSAL (JSONB, Feature Toggles, OCC y Soft Delete)', () => {
  let app: INestApplication;
  let mockQueryRunner: any;

  beforeAll(async () => {
    process.env.SKIP_DB_INIT_ON_BOOT = 'true';

    mockQueryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      query: jest.fn().mockImplementation((sql: string, params?: any[]) => {
        if (sql.includes('INSERT INTO sucursal')) {
          return Promise.resolve([
            {
              id: params?.[0] || SUCURSAL_UUID,
              nombre: params?.[1],
              direccion: params?.[2],
              telefono: params?.[3],
              en_linea: false,
              activo: true,
              version: 1,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ]);
        }
        if (sql.includes('INSERT INTO configuracion_sucursal')) {
          return Promise.resolve([
            {
              id: params?.[0] || CONFIG_UUID,
              id_sucursal: params?.[1],
              plan_activo: params?.[2],
              modo_nodo_lan: params?.[3],
              reglas_negocio: JSON.parse(params?.[4] || '{}'),
              version: 1,
            },
          ]);
        }
        if (sql.includes('INSERT INTO auditoria')) {
          return Promise.resolve([{ id: 'audit-id-123' }]);
        }
        if (sql.includes('SELECT') && sql.includes('FROM sucursal') && sql.includes('FOR UPDATE')) {
          return Promise.resolve([
            {
              id: SUCURSAL_UUID,
              nombre: 'Sucursal Centro',
              direccion: 'Av. Corrientes 1234',
              telefono: '011-4567-8900',
              activo: true,
              version: 1,
            },
          ]);
        }
        if (sql.includes('SELECT') && sql.includes('FROM sucursal') && sql.includes('WHERE id = $1')) {
          return Promise.resolve([
            {
              id: SUCURSAL_UUID,
              nombre: 'Sucursal Centro',
              direccion: 'Av. Corrientes 1234',
              telefono: '011-4567-8900',
              activo: true,
              version: 1,
            },
          ]);
        }
        if (sql.includes('UPDATE sucursal')) {
          return Promise.resolve([
            {
              id: SUCURSAL_UUID,
              nombre: params?.[0] || 'Sucursal Centro Modificada',
              direccion: params?.[1] || 'Av. Corrientes 1234',
              telefono: params?.[2] || '011-4567-8900',
              version: (params?.[4] || 1) + 1,
              activo: !sql.includes('activo = false'),
            },
          ]);
        }
        if (sql.includes('SELECT') && sql.includes('FROM configuracion_sucursal')) {
          return Promise.resolve([
            {
              id: CONFIG_UUID,
              id_sucursal: SUCURSAL_UUID,
              plan_activo: PlanComercial.BASICO_LOCAL,
              modo_nodo_lan: ModoNodoLan.MAESTRO_LAN,
              reglas_negocio: {
                comportamiento_precios: 'inmediato',
                feature_toggles: { sincronizacion_cloud: false },
              },
              version: 1,
            },
          ]);
        }
        if (sql.includes('UPDATE configuracion_sucursal')) {
          return Promise.resolve([
            {
              id: CONFIG_UUID,
              id_sucursal: SUCURSAL_UUID,
              plan_activo: params?.[0],
              modo_nodo_lan: params?.[1],
              reglas_negocio: JSON.parse(params?.[2] || '{}'),
              version: 2,
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
        if (sql.includes('FROM sucursal s')) {
          return Promise.resolve([
            {
              id: SUCURSAL_UUID,
              nombre: 'Sucursal Centro',
              direccion: 'Av. Corrientes 1234',
              en_linea: false,
              activo: true,
              version: 1,
              configuracion: {
                id: CONFIG_UUID,
                plan_activo: PlanComercial.BASICO_LOCAL,
                reglas_negocio: { politica_stock: 'UNIVERSAL_PERMISIVO' },
              },
            },
          ]);
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

  describe('1. POST /api/sucursales (Alta Atómica de Sucursal + Configuración One-to-One)', () => {
    it('debe crear la sucursal y su configuración con valores por defecto e insertar auditoría', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/sucursales')
        .set('x-audit-reason', 'Apertura de nueva sucursal Belgrano')
        .send({
          nombre: 'Sucursal Belgrano',
          direccion: 'Av. Cabildo 2450, CABA',
          telefono: '011-4780-1234',
          plan_activo: PlanComercial.BASICO_LOCAL,
          modo_nodo_lan: ModoNodoLan.MAESTRO_LAN,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.nombre).toBe('Sucursal Belgrano');
      expect(response.body.configuracion).toBeDefined();
      expect(response.body.configuracion.plan_activo).toBe('BASICO_LOCAL');
      expect(
        response.body.configuracion.reglas_negocio.politica_stock,
      ).toBe('UNIVERSAL_PERMISIVO');
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalledTimes(1);
    });
  });

  describe('2. GET /api/sucursales (Listado y Consulta por ID)', () => {
    it('debe retornar la lista de sucursales activas con su configuración anidada', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/sucursales')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body[0].id).toBe(SUCURSAL_UUID);
      expect(response.body[0].configuracion.plan_activo).toBe('BASICO_LOCAL');
    });
  });

  describe('3. PUT /api/sucursales/:id (Actualización con OCC y HTTP 409)', () => {
    it('debe actualizar los datos generales incrementando la versión cuando version coincide', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/sucursales/${SUCURSAL_UUID}`)
        .send({
          nombre: 'Sucursal Centro Renovada',
          direccion: 'Av. Corrientes 1234 Piso 2',
          version: 1, // Coincide con la versión en mock
          motivo: 'Mudanza interna de depósito',
        })
        .expect(200);

      expect(response.body.version).toBe(2);
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalledTimes(1);
    });

    it('debe rechazar con HTTP 409 Conflict si la versión enviada no coincide con base de datos', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/sucursales/${SUCURSAL_UUID}`)
        .send({
          nombre: 'Intento desfasado',
          version: 99, // Desfasaje OCC
          motivo: 'Actualización tardía',
        })
        .expect(409);

      expect(response.body.codigo).toBe('OCC_VERSION_MISMATCH');
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
    });
  });

  describe('4. PUT /api/sucursales/:id/configuracion (Actualización JSONB de Reglas y Plan)', () => {
    it('debe actualizar el plan a SUPERIOR_CLOUD y fusionar feature toggles', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/sucursales/${SUCURSAL_UUID}/configuracion`)
        .send({
          plan_activo: PlanComercial.SUPERIOR_CLOUD,
          version: 1,
          motivo: 'Upgrade de plan comercial a Cloud Multi-Sucursal',
          reglas_negocio: {
            feature_toggles: {
              sincronizacion_cloud: true,
              transferencias_inter_sucursal: true,
            },
          },
        })
        .expect(200);

      expect(response.body.plan_activo).toBe('SUPERIOR_CLOUD');
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalledTimes(1);
    });
  });

  describe('5. DELETE /api/sucursales/:id (Soft Delete Auditado)', () => {
    it('debe marcar activo = false sin eliminar físicamente el registro (RF-19)', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api/sucursales/${SUCURSAL_UUID}?version=1&motivo=Cierre+definitivo+de+local`)
        .expect(200);

      expect(response.body.activo).toBe(false);
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalledTimes(1);
    });
  });
});
