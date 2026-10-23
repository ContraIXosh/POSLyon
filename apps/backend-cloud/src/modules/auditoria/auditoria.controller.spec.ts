import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import {
  AccionAuditoria,
  UUID_SYSTEM_BOT,
} from '@poslyon/domain-core';
import { AppModule } from '../../app.module';
import { configureApp } from '../../bootstrap';
import { POSLYON_DATA_SOURCE } from '../../database/database.module';

const SAMPLE_UUID_1 = '550e8400-e29b-41d4-a716-446655440000';
const SAMPLE_UUID_2 = '6ba7b810-9dad-41d1-80b4-00c04fd430c8';

describe('Paso 1.2 — Módulo Transversal de Auditoría e Inmutabilidad (AuditContextInterceptor, AuditoriaService, OccExceptionFilter)', () => {
  let app: INestApplication;
  let mockQueryRunner: any;

  beforeAll(async () => {
    process.env.SKIP_DB_INIT_ON_BOOT = 'true';

    mockQueryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      query: jest.fn().mockImplementation((sql: string, params?: any[]) => {
        if (sql.includes('INSERT INTO auditoria')) {
          return Promise.resolve([
            {
              id: params?.[0] || 'mock-audit-id',
              id_usuario: params?.[1],
              tabla_afectada: params?.[2],
              id_registro_afectado: params?.[3],
              accion: params?.[4],
              valor_anterior: params?.[5],
              valor_nuevo: params?.[6],
              motivo: params?.[7],
              fecha: new Date().toISOString(),
            },
          ]);
        }
        if (sql.includes('SELECT') && sql.includes('FROM auditoria')) {
          return Promise.resolve([
            {
              id: 'audit-row-1',
              id_usuario: UUID_SYSTEM_BOT,
              tabla_afectada: 'PRODUCTO_SUCURSAL',
              id_registro_afectado: SAMPLE_UUID_1,
              accion: AccionAuditoria.MODIFICACION,
              fecha: '2026-10-23T18:00:00.000Z',
              motivo: 'Ajuste de precio inflacionario',
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
          if (sql.includes('INSERT INTO auditoria')) {
            return Promise.resolve([
              {
                id: params?.[0] || 'mock-audit-id',
                id_usuario: params?.[1],
                tabla_afectada: params?.[2],
                id_registro_afectado: params?.[3],
                accion: params?.[4],
              },
            ]);
          }
          return Promise.resolve([]);
        }),
      },
    };

    const mockDataSource = {
      isInitialized: true,
      query: jest.fn().mockImplementation((sql: string, params?: any[]) => {
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

  describe('1. AuditContextInterceptor (Captura de Metadatos Forenses)', () => {
    it('debe registrar un evento directo en POST /api/auditoria capturando headers y validando DTO', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auditoria')
        .set('x-audit-reason', 'Auditoría inicial de seguridad')
        .send({
          id_usuario: UUID_SYSTEM_BOT,
          tabla_afectada: 'PRODUCTO_SUCURSAL',
          id_registro_afectado: SAMPLE_UUID_1,
          accion: AccionAuditoria.MODIFICACION,
          valor_anterior: { precio: 1000, version: 1 },
          valor_nuevo: { precio: 1500, version: 2 },
          motivo: 'Ajuste inflacionario programado (RF-19)',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.tabla_afectada).toBe('PRODUCTO_SUCURSAL');
      expect(response.body.id_usuario).toBe(UUID_SYSTEM_BOT);
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalledTimes(1);
    });

    it('debe consultar el historial forense de un registro en GET /api/auditoria/registro/:id', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/auditoria/registro/${SAMPLE_UUID_1}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body[0].id_registro_afectado).toBe(SAMPLE_UUID_1);
    });
  });

  describe('2. Laboratorio Transaccional y Control OCC (C-25 / C-26 / HTTP 409)', () => {
    it('debe aplicar la mutación y registrar la auditoría atómicamente cuando las versiones coinciden', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auditoria/laboratorio-transaccion-auditada')
        .set('x-audit-reason', 'Actualización exitosa de lista de precios')
        .send({
          id_registro: SAMPLE_UUID_1,
          precio_anterior: 2000,
          precio_nuevo: 2500,
          version_esperada: 4,
          version_actual_en_bd: 4,
        })
        .expect(200);

      expect(response.body.precio_minorista).toBe(2500);
      expect(response.body.version).toBe(5);
      expect(response.body.estado_transaccion).toBe(
        'MUTACION_APLICADA_Y_AUDITADA_ATOMICAMENTE',
      );
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalledTimes(1);
      expect(mockQueryRunner.rollbackTransaction).not.toHaveBeenCalled();
    });

    it('debe rechazar con HTTP 409 Conflict y payload normalizado OCC cuando hay desfasaje de versión', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auditoria/laboratorio-transaccion-auditada')
        .send({
          id_registro: SAMPLE_UUID_1,
          precio_anterior: 2000,
          precio_nuevo: 2500,
          version_esperada: 3, // Desfasaje con respecto a la versión real
          version_actual_en_bd: 4,
        })
        .expect(409);

      expect(response.body.statusCode).toBe(409);
      expect(response.body.codigo).toBe('OCC_VERSION_MISMATCH');
      expect(response.body.mensaje).toContain('Conflicto OCC');
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
      expect(mockQueryRunner.commitTransaction).not.toHaveBeenCalled();
    });

    it('debe ejecutar ROLLBACK completo si ocurre un fallo al persistir la auditoría (C-25 / C-26)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auditoria/laboratorio-transaccion-auditada')
        .send({
          id_registro: SAMPLE_UUID_1,
          precio_anterior: 2000,
          precio_nuevo: 2500,
          version_esperada: 4,
          version_actual_en_bd: 4,
          simular_fallo_auditoria: true,
        })
        .expect(500);

      expect(response.body.message).toContain('Fallo transaccional atómico');
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
      expect(mockQueryRunner.commitTransaction).not.toHaveBeenCalled();
    });
  });
});
