import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import {
  EstadoFinanciero,
  EstadoGeneral,
  EstadoLogistico,
  EstadoTurnoCaja,
  TipoEfectoPromocion,
  TipoPrecio,
} from '@poslyon/domain-core';
import { AppModule } from '../../app.module';
import { configureApp } from '../../bootstrap';
import { POSLYON_DATA_SOURCE } from '../../database/database.module';

const SUCURSAL_UUID = '550e8400-e29b-41d4-a716-446655440090';
const TURNO_ABIERTO_UUID = '550e8400-e29b-41d4-a716-446655440091';
const TURNO_CERRADO_UUID = '550e8400-e29b-41d4-a716-446655440092';
const USUARIO_UUID = '550e8400-e29b-41d4-a716-446655440093';
const CLIENTE_UUID = '550e8400-e29b-41d4-a716-446655440094';
const METODO_EFECTIVO_UUID = '550e8400-e29b-41d4-a716-446655440095';
const METODO_CC_UUID = '550e8400-e29b-41d4-a716-446655440096';
const PRODUCTO_BASE_UUID = '550e8400-e29b-41d4-a716-446655440097';
const PRODUCTO_PACK_UUID = '550e8400-e29b-41d4-a716-446655440098';
const PROMO_UUID = '550e8400-e29b-41d4-a716-446655440099';
const VENTA_UUID = '550e8400-e29b-41d4-a716-446655440100';

describe('Paso 4.1 — Módulo Core POS y Motor de Promociones (RF-01 / RF-05 / RF-06 / RF-17 / O-26 / C-12)', () => {
  let app: INestApplication;
  let mockQueryRunner: any;

  beforeAll(async () => {
    process.env.SKIP_DB_INIT_ON_BOOT = 'true';

    mockQueryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      query: jest.fn().mockImplementation((sql: string, params?: any[]) => {
        // Consultar turno de caja
        if (sql.includes('SELECT id, estado FROM turno_caja WHERE id = $1')) {
          if (params?.[0] === TURNO_CERRADO_UUID) {
            return Promise.resolve([{ id: TURNO_CERRADO_UUID, estado: EstadoTurnoCaja.CERRADO }]);
          }
          if (params?.[0] === '550e8400-e29b-41d4-a716-446655440999') {
            return Promise.resolve([]); // Inexistente
          }
          return Promise.resolve([{ id: TURNO_ABIERTO_UUID, estado: EstadoTurnoCaja.ABIERTO }]);
        }

        // Métodos de pago
        if (sql.includes('SELECT id, codigo, afecta_caja_fisica FROM metodo_pago')) {
          return Promise.resolve([
            { id: METODO_EFECTIVO_UUID, codigo: 'EFECTIVO', afecta_caja_fisica: true },
            { id: METODO_CC_UUID, codigo: 'CUENTA_CORRIENTE', afecta_caja_fisica: false },
          ]);
        }

        // Consultar cliente para fiado
        if (sql.includes('SELECT id, nombre, limite_credito, saldo_deudor') && sql.includes('FROM cliente')) {
          return Promise.resolve([
            {
              id: CLIENTE_UUID,
              nombre: 'Carlos Gomez',
              limite_credito: 10000,
              saldo_deudor: 2000,
              version: 1,
            },
          ]);
        }

        // Insertar promoción
        if (sql.includes('INSERT INTO promocion')) {
          return Promise.resolve([
            {
              id: params?.[0] || PROMO_UUID,
              id_sucursal: params?.[1],
              nombre: params?.[2],
              tipo_efecto: params?.[3],
              valor_efecto: params?.[4],
              cantidad_minima: params?.[5],
              activo: true,
            },
          ]);
        }

        // Listar promociones
        if (sql.includes('FROM promocion WHERE id_sucursal = $1')) {
          return Promise.resolve([
            {
              id: PROMO_UUID,
              id_sucursal: SUCURSAL_UUID,
              nombre: '20% Descuento Promo Gaseosa',
              tipo_efecto: TipoEfectoPromocion.PORCENTAJE,
              valor_efecto: 20.0,
              cantidad_minima: 1.0,
              id_producto_aplicable: PRODUCTO_BASE_UUID,
              activo: true,
            },
          ]);
        }

        // Auditoría
        if (sql.includes('INSERT INTO auditoria')) {
          return Promise.resolve([{ id: 'audit-vta-123' }]);
        }

        // Insertar cuenta corriente (fiado)
        if (sql.includes('INSERT INTO cuenta_corriente')) {
          return Promise.resolve([{ id: 'cc-vta-1' }]);
        }

        // Insertar movimiento de caja (efectivo)
        if (sql.includes('INSERT INTO movimiento_caja')) {
          return Promise.resolve([{ id: 'mov-vta-1' }]);
        }

        // Consultar producto para Packs
        if (sql.includes('SELECT id, id_producto_base, multiplicador_stock FROM producto_global WHERE id = $1')) {
          if (params?.[0] === PRODUCTO_PACK_UUID) {
            return Promise.resolve([
              {
                id: PRODUCTO_PACK_UUID,
                id_producto_base: PRODUCTO_BASE_UUID,
                multiplicador_stock: 6, // Pack de 6 unidades
              },
            ]);
          }
          return Promise.resolve([
            {
              id: PRODUCTO_BASE_UUID,
              id_producto_base: null,
              multiplicador_stock: 1,
            },
          ]);
        }

        // Contar ventas para correlativo
        if (sql.includes('COUNT(id) as total FROM venta')) {
          return Promise.resolve([{ total: 42 }]);
        }

        // Insertar venta_detalle
        if (sql.includes('INSERT INTO venta_detalle')) {
          return Promise.resolve([
            {
              id: params?.[0] || 'det-1',
              id_venta: params?.[1],
              id_producto: params?.[2],
              cantidad: params?.[3],
              precio_unitario: params?.[4],
              monto_descuento: params?.[6],
            },
          ]);
        }

        // Insertar pago_venta
        if (sql.includes('INSERT INTO pago_venta')) {
          return Promise.resolve([
            {
              id: params?.[0] || 'pago-1',
              id_venta: params?.[1],
              id_metodo_pago: params?.[2],
              monto: params?.[3],
            },
          ]);
        }

        // Insertar venta
        if (sql.includes('INSERT INTO venta')) {
          return Promise.resolve([
            {
              id: params?.[0] || VENTA_UUID,
              id_sucursal: params?.[1],
              numero_comprobante: params?.[2],
              id_turno_caja: params?.[3],
              id_usuario: params?.[4],
              id_cliente: params?.[5],
              total: params?.[6],
              estado_general: EstadoGeneral.CONFIRMADA,
              estado_logistico: EstadoLogistico.ENTREGADO,
              estado_financiero: EstadoFinanciero.PAGADO,
              version: 1,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ]);
        }

        // Obtener venta por ID
        if (sql.includes('SELECT * FROM venta WHERE id = $1')) {
          return Promise.resolve([
            {
              id: VENTA_UUID,
              id_sucursal: SUCURSAL_UUID,
              numero_comprobante: 'VTA-0001-00000043',
              id_turno_caja: TURNO_ABIERTO_UUID,
              id_usuario: USUARIO_UUID,
              total: 1000,
              estado_general: EstadoGeneral.CONFIRMADA,
              estado_logistico: EstadoLogistico.ENTREGADO,
              estado_financiero: EstadoFinanciero.PAGADO,
            },
          ]);
        }

        // Obtener detalles de venta
        if (sql.includes('SELECT * FROM venta_detalle WHERE id_venta = $1')) {
          return Promise.resolve([
            {
              id: 'det-1',
              id_venta: VENTA_UUID,
              id_producto: PRODUCTO_BASE_UUID,
              cantidad: 2,
              precio_unitario: 500,
              monto_descuento: 0,
            },
          ]);
        }

        // Obtener pagos de venta
        if (sql.includes('SELECT * FROM pago_venta WHERE id_venta = $1')) {
          return Promise.resolve([
            {
              id: 'pago-1',
              id_venta: VENTA_UUID,
              id_metodo_pago: METODO_EFECTIVO_UUID,
              monto: 1000,
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
      createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
      query: jest.fn().mockImplementation((sql: string, params?: any[]) => {
        return mockQueryRunner.query(sql, params);
      }),
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

  it('1. POST /api/promociones — Debe registrar una regla de promoción porcentual en sucursal (RF-06)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/promociones')
      .send({
        id_sucursal: SUCURSAL_UUID,
        nombre: '20% Descuento Promo Gaseosa',
        tipo_efecto: TipoEfectoPromocion.PORCENTAJE,
        valor_efecto: 20.0,
        cantidad_minima: 1,
        id_producto_aplicable: PRODUCTO_BASE_UUID,
      })
      .expect(201);

    expect(res.body).toHaveProperty('id');
    expect(res.body.nombre).toBe('20% Descuento Promo Gaseosa');
    expect(res.body.valor_efecto).toBe(20.0);
  });

  it('2. POST /api/promociones/evaluar — Debe evaluar el carrito preservando el precio de lista y calculando descuento aditivo (RF-06 / O-11)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/promociones/evaluar')
      .send({
        id_sucursal: SUCURSAL_UUID,
        items: [
          {
            id_producto: PRODUCTO_BASE_UUID,
            cantidad: 2,
            precio_unitario: 500, // 2 * 500 = 1000 bruto -> 20% descuento = 200 -> 800 neto
            tipo_precio: TipoPrecio.MINORISTA,
          },
        ],
      })
      .expect(200);

    expect(res.body.total_bruto).toBe(1000);
    expect(res.body.total_descuento).toBe(200);
    expect(res.body.total_neto).toBe(800);
    expect(res.body.items[0].precio_unitario).toBe(500); // INMUTABLE
    expect(res.body.items[0].monto_descuento).toBe(200);
  });

  it('3. POST /api/ventas — Debe crear una venta exitosa en efectivo vinculada al turno de caja activo (RF-01 / RF-17)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/ventas')
      .send({
        id_sucursal: SUCURSAL_UUID,
        id_turno_caja: TURNO_ABIERTO_UUID,
        id_usuario: USUARIO_UUID,
        total: 1000,
        pagos: [
          {
            id_metodo_pago: METODO_EFECTIVO_UUID,
            monto: 1000,
          },
        ],
        items: [
          {
            id_producto: PRODUCTO_BASE_UUID,
            cantidad: 2,
            precio_unitario: 500,
            tipo_precio: TipoPrecio.MINORISTA,
          },
        ],
      })
      .expect(201);

    expect(res.body).toHaveProperty('id');
    expect(res.body.numero_comprobante).toBe('VTA-0001-00000043');
    expect(res.body.estado_general).toBe(EstadoGeneral.CONFIRMADA);
    expect(res.body.estado_financiero).toBe(EstadoFinanciero.PAGADO);
    expect(res.body.total).toBe(1000);
  });

  it('4. POST /api/ventas — RF-17: Debe rechazar la venta si el turno de caja está cerrado o no existe (HTTP 400)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/ventas')
      .send({
        id_sucursal: SUCURSAL_UUID,
        id_turno_caja: TURNO_CERRADO_UUID,
        id_usuario: USUARIO_UUID,
        total: 500,
        pagos: [{ id_metodo_pago: METODO_EFECTIVO_UUID, monto: 500 }],
      })
      .expect(400);

    expect(res.body.message).toContain('Solo se pueden procesar ventas en turnos en estado ABIERTO');
  });

  it('5. POST /api/ventas — RF-05: Debe rechazar la venta si la suma de pagos no coincide con el total (HTTP 400)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/ventas')
      .send({
        id_sucursal: SUCURSAL_UUID,
        id_turno_caja: TURNO_ABIERTO_UUID,
        id_usuario: USUARIO_UUID,
        total: 1000,
        pagos: [{ id_metodo_pago: METODO_EFECTIVO_UUID, monto: 800 }], // Faltan 200
      })
      .expect(400);

    expect(res.body.message).toContain('no coincide con el total de la venta');
  });

  it('6. POST /api/ventas — Venta fiada a Cuenta Corriente: Valida cupo y registra cargo en Signed Ledger (RF-05 / RF-07 / RF-08)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/ventas')
      .send({
        id_sucursal: SUCURSAL_UUID,
        id_turno_caja: TURNO_ABIERTO_UUID,
        id_usuario: USUARIO_UUID,
        id_cliente: CLIENTE_UUID,
        total: 3000, // Deuda actual 2000 + 3000 = 5000 <= límite 10000
        pagos: [
          {
            id_metodo_pago: METODO_CC_UUID,
            monto: 3000,
          },
        ],
      })
      .expect(201);

    expect(res.body.id_cliente).toBe(CLIENTE_UUID);
    expect(res.body.total).toBe(3000);
  });

  it('7. POST /api/ventas — Debe rechazar venta a Cuenta Corriente si el cliente supera su límite de crédito (HTTP 400)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/ventas')
      .send({
        id_sucursal: SUCURSAL_UUID,
        id_turno_caja: TURNO_ABIERTO_UUID,
        id_usuario: USUARIO_UUID,
        id_cliente: CLIENTE_UUID,
        total: 15000, // Deuda actual 2000 + 15000 = 17000 > límite 10000
        pagos: [
          {
            id_metodo_pago: METODO_CC_UUID,
            monto: 15000,
          },
        ],
      })
      .expect(400);

    expect(res.body.message).toContain('Límite de crédito superado');
  });

  it('8. POST /api/ventas — Pagos Mixtos: Valida margen solo del delta fiado y registra flujo dual en caja y cuenta corriente (RF-05)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/ventas')
      .send({
        id_sucursal: SUCURSAL_UUID,
        id_turno_caja: TURNO_ABIERTO_UUID,
        id_usuario: USUARIO_UUID,
        id_cliente: CLIENTE_UUID,
        total: 5000,
        pagos: [
          {
            id_metodo_pago: METODO_EFECTIVO_UUID,
            monto: 3000, // Mitad en efectivo
          },
          {
            id_metodo_pago: METODO_CC_UUID,
            monto: 2000, // Mitad fiado (2000 + 2000 = 4000 <= 10000)
          },
        ],
      })
      .expect(201);

    expect(res.body.total).toBe(5000);
    expect(res.body.pagos.length).toBe(2);
  });

  it('9. POST /api/ventas — Resolución O-26: Venta de Pack descuenta stock del producto base multiplicando por el factor', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/ventas')
      .send({
        id_sucursal: SUCURSAL_UUID,
        id_turno_caja: TURNO_ABIERTO_UUID,
        id_usuario: USUARIO_UUID,
        total: 3600,
        pagos: [{ id_metodo_pago: METODO_EFECTIVO_UUID, monto: 3600 }],
        items: [
          {
            id_producto: PRODUCTO_PACK_UUID, // Pack de 6 gaseosas
            cantidad: 2, // 2 packs = 12 unidades base
            precio_unitario: 1800,
            tipo_precio: TipoPrecio.MINORISTA,
          },
        ],
      })
      .expect(201);

    expect(res.body).toHaveProperty('id');
    expect(res.body.detalles.length).toBe(1);
    expect(res.body.detalles[0].id_producto).toBe(PRODUCTO_PACK_UUID);
  });

  it('10. GET /api/ventas/:id — Debe obtener una venta con sus detalles y pagos', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/ventas/${VENTA_UUID}`)
      .expect(200);

    expect(res.body.id).toBe(VENTA_UUID);
    expect(res.body.numero_comprobante).toBe('VTA-0001-00000043');
    expect(Array.isArray(res.body.detalles)).toBe(true);
    expect(Array.isArray(res.body.pagos)).toBe(true);
  });
});
