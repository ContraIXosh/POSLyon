import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import {
  EstadoFinanciero,
  EstadoGeneral,
  EstadoLogistico,
  TipoMovimientoCC,
  UUID_SYSTEM_BOT,
} from '@poslyon/domain-core';
import { AppModule } from '../../app.module';
import { configureApp } from '../../bootstrap';
import { POSLYON_DATA_SOURCE } from '../../database/database.module';

const SUCURSAL_UUID = '550e8400-e29b-41d4-a716-446655440301';
const CLIENTE_UUID = '550e8400-e29b-41d4-a716-446655440302';
const VENTA_OFFLINE_UUID = '550e8400-e29b-41d4-a716-446655440303';
const VENTA_DETALLE_UUID = '550e8400-e29b-41d4-a716-446655440304';
const PRODUCTO_UUID = '550e8400-e29b-41d4-a716-446655440305';
const TURNO_UUID = '550e8400-e29b-41d4-a716-446655440306';

describe('Paso 4.4 — Módulo Sincronización Local-First (SYNC_CURSOR, ISO-8601 UTC O-25, Merge Aditivo C-10 y OCC)', () => {
  let app: INestApplication;
  let mockQueryRunner: any;

  beforeAll(async () => {
    process.env.SKIP_DB_INIT_ON_BOOT = 'true';

    mockQueryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      query: jest.fn().mockImplementation((sql: string, params?: any[]) => {
        // 1. Cursor de Sincronización
        if (sql.includes('SELECT * FROM sync_cursor WHERE id_sucursal = $1')) {
          return Promise.resolve([
            {
              id: 'cursor-1',
              id_sucursal: SUCURSAL_UUID,
              nodo_destino: params?.[1] || 'CLOUD_CENTRAL',
              last_pulled_at: '2026-10-23T00:00:00.000Z',
              schema_version: 1,
            },
          ]);
        }
        if (sql.includes('UPDATE sync_cursor')) {
          return Promise.resolve([]);
        }
        if (sql.includes('INSERT INTO sync_cursor')) {
          return Promise.resolve([{ id: 'cursor-1' }]);
        }

        // 2. Cliente y Cuenta Corriente (Merge Aditivo C-10)
        if (sql.includes('SELECT * FROM cliente WHERE id = $1')) {
          return Promise.resolve([
            {
              id: CLIENTE_UUID,
              nombre: 'Juan Perez',
              limite_credito: 10000,
              saldo_deudor: 8000,
              version: 1,
            },
          ]);
        }
        if (sql.includes('INSERT INTO cuenta_corriente')) {
          return Promise.resolve([
            {
              id: params?.[0],
              id_cliente: params?.[1],
              saldo_nuevo: params?.[6],
              requiere_revision: params?.[8],
            },
          ]);
        }
        if (sql.includes('UPDATE cliente SET saldo_deudor = $1')) {
          return Promise.resolve([
            {
              id: CLIENTE_UUID,
              saldo_deudor: params?.[0],
              version: 2,
            },
          ]);
        }

        // 3. Ventas y Renglones Offline
        if (sql.includes('SELECT id FROM venta WHERE id = $1')) {
          return Promise.resolve([]); // No existe todavía (idempotencia)
        }
        if (sql.includes('INSERT INTO venta (')) {
          return Promise.resolve([{ id: params?.[0] }]);
        }
        if (sql.includes('SELECT id FROM venta_detalle WHERE id = $1')) {
          return Promise.resolve([]); // No existe
        }
        if (sql.includes('INSERT INTO venta_detalle (')) {
          return Promise.resolve([{ id: params?.[0] }]);
        }

        // 4. Stock Sucursal y Política Permisiva C-12
        if (sql.includes('SELECT * FROM producto_sucursal WHERE id_producto_global = $1 AND id_sucursal = $2')) {
          return Promise.resolve([
            {
              id: 'ps-sync-1',
              id_producto_global: params?.[0],
              id_sucursal: params?.[1],
              stock_fisico: 1, // Si resta 5, quedará en -4 (Stock Negativo Permisivo C-12)
              version: 1,
            },
          ]);
        }
        if (sql.includes('UPDATE producto_sucursal SET stock_fisico')) {
          return Promise.resolve([{ id: 'ps-sync-1' }]);
        }

        // 5. Pull Queries
        if (sql.includes('SELECT * FROM producto_global WHERE updated_at > $1')) {
          return Promise.resolve([
            {
              id: PRODUCTO_UUID,
              nombre: 'Arroz Largo Fino 1kg',
              updated_at: '2026-10-23T12:00:00.000Z',
            },
          ]);
        }
        if (sql.includes('SELECT * FROM producto_sucursal WHERE id_sucursal = $1')) {
          return Promise.resolve([
            {
              id: 'ps-1',
              id_sucursal: SUCURSAL_UUID,
              precio_minorista: 1200,
            },
          ]);
        }
        if (sql.includes('SELECT * FROM promocion WHERE (id_sucursal = $1')) {
          return Promise.resolve([]);
        }
        if (sql.includes('SELECT * FROM configuracion_sucursal WHERE id_sucursal = $1')) {
          return Promise.resolve([
            {
              id_sucursal: SUCURSAL_UUID,
              plan_comercial: 'PROFESSIONAL',
            },
          ]);
        }

        // Auditoría
        if (sql.includes('INSERT INTO auditoria')) {
          return Promise.resolve([{ id: 'audit-sync-123' }]);
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

  describe('1. Push de Deltas Offline (POST /api/sync/push - RF-18 / O-25 / C-10 / C-12)', () => {
    it('Debe procesar lote de subida con ventas, actualizar stock permisivo y aplicar merge aditivo a cuenta corriente', async () => {
      const payload = {
        sucursal_id: SUCURSAL_UUID,
        last_pulled_at: '2026-10-23T10:00:00.000Z',
        nodo_destino: 'CLOUD_CENTRAL',
        changes: {
          ventas: {
            created: [
              {
                id: VENTA_OFFLINE_UUID,
                numero_comprobante: 'B-0001-00000099',
                id_turno_caja: TURNO_UUID,
                id_cliente: CLIENTE_UUID,
                estado_general: EstadoGeneral.CONFIRMADA,
                estado_logistico: EstadoLogistico.ENTREGADO,
                estado_financiero: EstadoFinanciero.PAGADO,
                subtotal: 3500,
                descuento_total: 0,
                total: 3500,
                created_at: '2026-10-23T11:00:00.000Z',
              },
            ],
            updated: [],
            deleted: [],
          },
          venta_detalles: {
            created: [
              {
                id: VENTA_DETALLE_UUID,
                id_venta: VENTA_OFFLINE_UUID,
                id_producto: PRODUCTO_UUID,
                cantidad: 5, // Quedará con stock negativo (-4) bajo política C-12
                precio_unitario: 700,
                monto_descuento: 0,
                subtotal: 3500,
                tipo_precio: 'MINORISTA',
              },
            ],
            updated: [],
            deleted: [],
          },
          cuenta_corriente: {
            created: [
              {
                id: '550e8400-e29b-41d4-a716-446655440309',
                id_cliente: CLIENTE_UUID,
                id_venta: VENTA_OFFLINE_UUID,
                monto_credito: 3500, // Saldo anterior 8000 + 3500 = 11500 (supera límite de 10000, activa requiere_revision C-10)
                expected_version: 1,
                id_usuario_sincronizador: UUID_SYSTEM_BOT,
              },
            ],
            updated: [],
            deleted: [],
          },
        },
      };

      const res = await request(app.getHttpServer())
        .post('/api/sync/push')
        .send(payload)
        .expect(200);

      expect(res.body.status).toBe('SUCCESS');
      expect(res.body.cursor_actualizado).toBe(true);
      expect(res.body.deltas_procesados).toBeGreaterThan(0);
      expect(res.body.server_timestamp).toBeDefined();
    });

    it('Debe rechazar con 400 si last_pulled_at no es formato ISO-8601 UTC estricto (O-25)', async () => {
      const payload = {
        sucursal_id: SUCURSAL_UUID,
        last_pulled_at: 'fecha-invalida-no-iso',
        changes: {},
      };

      await request(app.getHttpServer())
        .post('/api/sync/push')
        .send(payload)
        .expect(400);
    });
  });

  describe('2. Pull de Novedades (GET /api/sync/pull - RF-18 / ISO-8601 UTC)', () => {
    it('Debe retornar los deltas de productos y configuración posteriores a last_pulled_at', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/sync/pull?sucursal_id=${SUCURSAL_UUID}&last_pulled_at=2026-10-23T00:00:00.000Z`)
        .expect(200);

      expect(res.body.changes).toBeDefined();
      expect(res.body.changes.productos_global).toBeDefined();
      expect(res.body.changes.productos_global.created.length).toBeGreaterThan(0);
      expect(res.body.timestamp).toBeDefined();
    });

    it('Debe rechazar con 400 si last_pulled_at no es válido', async () => {
      await request(app.getHttpServer())
        .get(`/api/sync/pull?sucursal_id=${SUCURSAL_UUID}&last_pulled_at=invalid-time`)
        .expect(400);
    });
  });

  describe('3. Delta Granular de Cuenta Corriente (POST /api/sync/cuenta-corriente-delta - C-10 / OCC)', () => {
    it('Debe aplicar Merge Aditivo y detectar sobregiro de límite post-sync', async () => {
      const payload = {
        id_cliente: CLIENTE_UUID,
        id_venta: VENTA_OFFLINE_UUID,
        monto_credito: 3000,
        expected_version: 1,
        id_usuario_sincronizador: UUID_SYSTEM_BOT,
      };

      const res = await request(app.getHttpServer())
        .post('/api/sync/cuenta-corriente-delta')
        .send(payload)
        .expect(200);

      expect(res.body.id_cliente).toBe(CLIENTE_UUID);
      expect(res.body.saldo_anterior).toBe(8000);
      expect(res.body.saldo_nuevo).toBe(11000); // 8000 + 3000
      expect(res.body.requiere_revision).toBe(true); // 11000 > 10000
    });

    it('Debe rechazar con 409 Conflict si la versión esperada OCC no coincide', async () => {
      const payload = {
        id_cliente: CLIENTE_UUID,
        id_venta: VENTA_OFFLINE_UUID,
        monto_credito: 500,
        expected_version: 99, // Desactualizada
        id_usuario_sincronizador: UUID_SYSTEM_BOT,
      };

      await request(app.getHttpServer())
        .post('/api/sync/cuenta-corriente-delta')
        .send(payload)
        .expect(409);
    });
  });
});
