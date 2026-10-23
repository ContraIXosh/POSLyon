import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import {
  AccionReconciliacion,
  EstadoCuarentena,
  EstadoTransferenciaStock,
  TipoAjusteStock,
  UUID_ARTICULO_COMODIN,
} from '@poslyon/domain-core';
import { AppModule } from '../../app.module';
import { configureApp } from '../../bootstrap';
import { POSLYON_DATA_SOURCE } from '../../database/database.module';

const SUCURSAL_ORIGEN_UUID = '550e8400-e29b-41d4-a716-446655440201';
const SUCURSAL_DESTINO_UUID = '550e8400-e29b-41d4-a716-446655440202';
const CATEGORIA_UUID = '550e8400-e29b-41d4-a716-446655440203';
const PRODUCTO_UUID = '550e8400-e29b-41d4-a716-446655440204';
const ALERTA_PENDIENTE_UUID = '550e8400-e29b-41d4-a716-446655440205';
const ALERTA_RESUELTA_UUID = '550e8400-e29b-41d4-a716-446655440206';
const TRANSFERENCIA_UUID = '550e8400-e29b-41d4-a716-446655440207';
const TRANSFERENCIA_TRANSITO_UUID = '550e8400-e29b-41d4-a716-446655440208';

describe('Paso 4.3 — Reconciliación de Huérfanos (RF-13 / C-18 / C-21), Cuarentena de Stock (C-23) y Transferencias 2PC (RF-16)', () => {
  let app: INestApplication;
  let mockQueryRunner: any;

  beforeAll(async () => {
    process.env.SKIP_DB_INIT_ON_BOOT = 'true';

    mockQueryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      query: jest.fn().mockImplementation((sql: string, params?: any[]) => {
        // 1. Reconciliación: Buscar tickets huérfanos
        if (sql.includes('FROM venta_detalle vd') && sql.includes('INNER JOIN venta v')) {
          return Promise.resolve([
            {
              id: '550e8400-e29b-41d4-a716-446655440210',
              id_venta: '550e8400-e29b-41d4-a716-446655440211',
              codigo_barra_leido: '7791234567890',
              nombre_producto_comodin: 'Galletitas Chocolate',
              cantidad: 3,
              precio_unitario: 1500,
              subtotal: 4500,
              created_at: new Date('2026-10-20T10:00:00Z').toISOString(),
            },
            {
              id: '550e8400-e29b-41d4-a716-446655440212',
              id_venta: '550e8400-e29b-41d4-a716-446655440213',
              codigo_barra_leido: '7791234567890',
              nombre_producto_comodin: 'Galletitas Chocolate',
              cantidad: 2,
              precio_unitario: 1400,
              subtotal: 2800,
              created_at: new Date('2026-10-21T15:00:00Z').toISOString(),
            },
          ]);
        }

        // Inserciones / Updates de Reconciliación
        if (sql.includes('INSERT INTO producto_global')) {
          return Promise.resolve([{ id: PRODUCTO_UUID, nombre: params?.[2] }]);
        }
        if (sql.includes('INSERT INTO codigo_barra')) {
          return Promise.resolve([]);
        }
        if (sql.includes('INSERT INTO producto_sucursal')) {
          return Promise.resolve([{ id: 'ps-rec-1', stock_fisico: params?.[4] }]);
        }
        if (sql.includes('UPDATE venta_detalle SET id_producto')) {
          return Promise.resolve([]);
        }

        // 2. Cuarentena de Stock (C-23)
        if (sql.includes('INSERT INTO alerta_cuarentena')) {
          return Promise.resolve([
            {
              id: ALERTA_PENDIENTE_UUID,
              id_sucursal: params?.[1],
              id_producto: params?.[2],
              cantidad_faltante: params?.[5],
              estado: EstadoCuarentena.PENDIENTE,
              observacion: params?.[7],
              created_at: new Date().toISOString(),
            },
          ]);
        }
        if (sql.includes('SELECT * FROM alerta_cuarentena WHERE id = $1')) {
          if (params?.[0] === ALERTA_RESUELTA_UUID) {
            return Promise.resolve([
              {
                id: ALERTA_RESUELTA_UUID,
                id_sucursal: SUCURSAL_ORIGEN_UUID,
                id_producto: PRODUCTO_UUID,
                cantidad_faltante: 2,
                estado: EstadoCuarentena.MERMA_CONFIRMADA,
              },
            ]);
          }
          return Promise.resolve([
            {
              id: ALERTA_PENDIENTE_UUID,
              id_sucursal: SUCURSAL_ORIGEN_UUID,
              id_producto: PRODUCTO_UUID,
              cantidad_faltante: 2,
              estado: EstadoCuarentena.PENDIENTE,
            },
          ]);
        }
        if (sql.includes('UPDATE alerta_cuarentena')) {
          return Promise.resolve([
            {
              id: ALERTA_PENDIENTE_UUID,
              estado: params?.[0],
              observacion: params?.[1],
              resolved_at: new Date().toISOString(),
            },
          ]);
        }

        // Consultas de Producto Sucursal (Stock y OCC)
        if (sql.includes('SELECT * FROM producto_sucursal WHERE id_producto_global = $1 AND id_sucursal = $2')) {
          return Promise.resolve([
            {
              id: 'ps-orig-1',
              id_producto_global: params?.[0],
              id_sucursal: params?.[1],
              stock_fisico: 10,
              version: 1,
            },
          ]);
        }
        if (sql.includes('UPDATE producto_sucursal SET stock_fisico')) {
          return Promise.resolve([
            {
              id: 'ps-orig-1',
              stock_fisico: params?.[0],
              version: 2,
            },
          ]);
        }

        // 3. Transferencias 2PC (RF-16)
        if (sql.includes('INSERT INTO transferencia_stock')) {
          return Promise.resolve([
            {
              id: TRANSFERENCIA_UUID,
              id_sucursal_origen: params?.[1],
              id_sucursal_destino: params?.[2],
              estado: EstadoTransferenciaStock.PENDIENTE_DESPACHO,
              version: 1,
              created_at: new Date().toISOString(),
            },
          ]);
        }
        if (sql.includes('INSERT INTO transferencia_detalle')) {
          return Promise.resolve([
            {
              id: 'td-1',
              id_transferencia: params?.[1],
              id_producto: params?.[2],
              cantidad_enviada: params?.[3],
            },
          ]);
        }
        if (sql.includes('SELECT * FROM transferencia_stock WHERE id = $1')) {
          if (params?.[0] === TRANSFERENCIA_TRANSITO_UUID) {
            return Promise.resolve([
              {
                id: TRANSFERENCIA_TRANSITO_UUID,
                id_sucursal_origen: SUCURSAL_ORIGEN_UUID,
                id_sucursal_destino: SUCURSAL_DESTINO_UUID,
                estado: EstadoTransferenciaStock.EN_TRANSITO,
                version: 2,
              },
            ]);
          }
          return Promise.resolve([
            {
              id: TRANSFERENCIA_UUID,
              id_sucursal_origen: SUCURSAL_ORIGEN_UUID,
              id_sucursal_destino: SUCURSAL_DESTINO_UUID,
              estado: EstadoTransferenciaStock.PENDIENTE_DESPACHO,
              version: 1,
            },
          ]);
        }
        if (sql.includes('SELECT * FROM transferencia_detalle WHERE id_transferencia = $1')) {
          return Promise.resolve([
            {
              id: 'td-1',
              id_transferencia: params?.[0],
              id_producto: PRODUCTO_UUID,
              cantidad_enviada: 5,
            },
          ]);
        }
        if (sql.includes('UPDATE transferencia_detalle')) {
          return Promise.resolve([
            {
              id: 'td-1',
              cantidad_recibida: params?.[0],
              estado_item: params?.[1],
            },
          ]);
        }
        if (sql.includes('UPDATE transferencia_stock')) {
          return Promise.resolve([
            {
              id: params?.[params.length - 1],
              estado: params?.[0],
              motivo_discrepancia: params?.[2] || params?.[1] || null,
              version: 2,
            },
          ]);
        }

        // Auditoría
        if (sql.includes('INSERT INTO auditoria')) {
          return Promise.resolve([{ id: 'audit-inv-123' }]);
        }

        return Promise.resolve([]);
      }),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: {
        query: jest.fn().mockImplementation((sql: string, params?: any[]) =>
          mockQueryRunner.query(sql, params),
        ),
      },
    };

    const mockDataSource = {
      isInitialized: true,
      createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
      query: jest.fn().mockImplementation((sql: string, params?: any[]) =>
        mockQueryRunner.query(sql, params),
      ),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(POSLYON_DATA_SOURCE)
      .useValue(mockDataSource)
      .overrideProvider(DataSource)
      .useValue(mockDataSource)
      .compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('1. Reconciliación de Códigos Huérfanos (RF-13 / C-18 / C-21)', () => {
    it('GET /api/inventario/huerfanos -> Debe agrupar renglones vendidos como comodín', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/inventario/huerfanos?id_sucursal=${SUCURSAL_ORIGEN_UUID}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0].clave_agrupamiento).toBe('7791234567890');
      expect(res.body[0].unidades_vendidas_historicas).toBe(5); // 3 + 2
      expect(res.body[0].total_facturado).toBe(7300); // 4500 + 2800
    });

    it('POST /api/inventario/reconciliar (CREAR_NUEVO) -> Calcula stock inicial C-18 y balance C-21', async () => {
      const payload = {
        id_sucursal: SUCURSAL_ORIGEN_UUID,
        codigo_comodin: '7791234567890',
        accion: AccionReconciliacion.CREAR_NUEVO,
        nombre_oficial: 'Galletitas Chocolate Rellenas 150g',
        id_categoria: CATEGORIA_UUID,
        precio_minorista: 1600,
        stock_fisico_actual: 10, // Conteo en góndola
      };

      const res = await request(app.getHttpServer())
        .post('/api/inventario/reconciliar')
        .send(payload)
        .expect(200);

      expect(res.body.id_producto_oficial).toBeDefined();
      expect(res.body.unidades_historicas_vinculadas).toBe(5);
      // stock_inicial_calculado = 10 (góndola) + 5 (vendidas) = 15
      expect(res.body.stock_inicial_calculado).toBe(15);
      // stock_fisico_resultante = 15 - 5 = 10
      expect(res.body.stock_fisico_resultante).toBe(10);
      expect(res.body.renglones_auditados.length).toBe(2);
      expect(res.body.discrepancia_financiera_neta).toBeDefined();
    });
  });

  describe('2. Cuarentena de Stock (C-23) y Ajuste Manual OCC', () => {
    it('POST /api/inventario/cuarentena -> Reporta faltante en preparación guiada', async () => {
      const payload = {
        id_sucursal: SUCURSAL_ORIGEN_UUID,
        id_producto: PRODUCTO_UUID,
        cantidad_faltante: 2,
        observacion: 'Faltante detectado en estante 3',
      };

      const res = await request(app.getHttpServer())
        .post('/api/inventario/cuarentena')
        .send(payload)
        .expect(201);

      expect(res.body.id).toBe(ALERTA_PENDIENTE_UUID);
      expect(res.body.estado).toBe(EstadoCuarentena.PENDIENTE);
    });

    it('PATCH /api/inventario/cuarentena/resolver -> Deduce no destructivamente C-23 ante MERMA_CONFIRMADA', async () => {
      const payload = {
        id_alerta: ALERTA_PENDIENTE_UUID,
        estado_resolucion: EstadoCuarentena.MERMA_CONFIRMADA,
        observacion: 'Merma confirmada por rotura física en depósito',
      };

      const res = await request(app.getHttpServer())
        .patch('/api/inventario/cuarentena/resolver')
        .send(payload)
        .expect(200);

      expect(res.body.estado).toBe(EstadoCuarentena.MERMA_CONFIRMADA);
      expect(res.body.observacion).toContain('Merma confirmada');
    });

    it('PATCH /api/inventario/cuarentena/resolver -> Rechaza con 400 si la alerta ya estaba resuelta', async () => {
      const payload = {
        id_alerta: ALERTA_RESUELTA_UUID,
        estado_resolucion: EstadoCuarentena.FALSA_ALARMA,
        observacion: 'Re-evaluación rechazada',
      };

      await request(app.getHttpServer())
        .patch('/api/inventario/cuarentena/resolver')
        .send(payload)
        .expect(400);
    });

    it('POST /api/inventario/stock/ajuste-manual -> Rechaza con 409 Conflict si la versión OCC no coincide', async () => {
      const payload = {
        id_sucursal: SUCURSAL_ORIGEN_UUID,
        id_producto: PRODUCTO_UUID,
        tipo_ajuste: TipoAjusteStock.AJUSTE_MANUAL,
        cantidad_nueva: 15,
        expected_version: 99, // Versión desactualizada
        motivo: 'Ajuste inventario anual',
      };

      await request(app.getHttpServer())
        .post('/api/inventario/stock/ajuste-manual')
        .send(payload)
        .expect(409);
    });
  });

  describe('3. Transferencias Inter-Sucursal bajo Protocolo 2PC (RF-16 / C-24 / O-18)', () => {
    it('POST /api/inventario/transferencias -> Crea orden en PENDIENTE_DESPACHO', async () => {
      const payload = {
        id_sucursal_origen: SUCURSAL_ORIGEN_UUID,
        id_sucursal_destino: SUCURSAL_DESTINO_UUID,
        detalles: [
          {
            id_producto: PRODUCTO_UUID,
            cantidad_enviada: 5,
          },
        ],
      };

      const res = await request(app.getHttpServer())
        .post('/api/inventario/transferencias')
        .send(payload)
        .expect(201);

      expect(res.body.id).toBe(TRANSFERENCIA_UUID);
      expect(res.body.estado).toBe(EstadoTransferenciaStock.PENDIENTE_DESPACHO);
    });

    it('POST /api/inventario/transferencias/:id/despachar -> Fase 1 2PC descuenta stock en origen', async () => {
      const payload = {
        expected_version: 1,
      };

      const res = await request(app.getHttpServer())
        .post(`/api/inventario/transferencias/${TRANSFERENCIA_UUID}/despachar`)
        .send(payload)
        .expect(200);

      expect(res.body.estado).toBe(EstadoTransferenciaStock.EN_TRANSITO);
    });

    it('POST /api/inventario/transferencias/:id/recibir -> Fase 2 2PC detecta DISCREPANCIA (Incondicionalidad Física O-18)', async () => {
      const payload = {
        expected_version: 2,
        detalles_recibidos: [
          {
            id_producto: PRODUCTO_UUID,
            cantidad_recibida: 4, // Se enviaron 5, llegaron 4
            estado_item: 'FALTANTE',
          },
        ],
        motivo_discrepancia: 'Falta 1 unidad rota en transporte',
      };

      const res = await request(app.getHttpServer())
        .post(`/api/inventario/transferencias/${TRANSFERENCIA_TRANSITO_UUID}/recibir`)
        .send(payload)
        .expect(200);

      expect(res.body.estado).toBe(EstadoTransferenciaStock.DISCREPANCIA);
      expect(res.body.motivo_discrepancia).toContain('Falta 1 unidad rota');
    });

    it('POST /api/inventario/transferencias/:id/cancelar -> Rollback 2PC restituye stock a origen', async () => {
      const payload = {
        expected_version: 2,
        motivo: 'Camión de transporte siniestrado, mercadería devuelta',
      };

      const res = await request(app.getHttpServer())
        .post(`/api/inventario/transferencias/${TRANSFERENCIA_TRANSITO_UUID}/cancelar`)
        .send(payload)
        .expect(200);

      expect(res.body.estado).toBe(EstadoTransferenciaStock.CANCELADA);
    });
  });
});
