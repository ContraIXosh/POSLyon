import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import {
  EstadoFinanciero,
  EstadoGeneral,
  EstadoTurnoCaja,
  TipoDevolucion,
  TipoMovimientoCC,
} from '@poslyon/domain-core';
import { AppModule } from '../../app.module';
import { configureApp } from '../../bootstrap';
import { POSLYON_DATA_SOURCE } from '../../database/database.module';

const SUCURSAL_UUID = '550e8400-e29b-41d4-a716-446655440110';
const TURNO_ABIERTO_UUID = '550e8400-e29b-41d4-a716-446655440111';
const TURNO_CERRADO_UUID = '550e8400-e29b-41d4-a716-446655440112';
const VENTA_CONFIRMADA_UUID = '550e8400-e29b-41d4-a716-446655440113';
const VENTA_PENDIENTE_UUID = '550e8400-e29b-41d4-a716-446655440114';
const PRODUCTO_UUID = '550e8400-e29b-41d4-a716-446655440115';
const CLIENTE_DEUDOR_UUID = '550e8400-e29b-41d4-a716-446655440116';
const NC_UUID = '550e8400-e29b-41d4-a716-446655440117';
const VENTA_CON_CLIENTE_UUID = '550e8400-e29b-41d4-a716-446655440118';
const VENTA_DEVUELTA_UUID = '550e8400-e29b-41d4-a716-446655440119';

describe('Paso 4.2 — Módulo Devoluciones y Notas de Crédito (RF-09 / RF-10 / RF-11 / O-15 / O-19)', () => {
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
          return Promise.resolve([{ id: TURNO_ABIERTO_UUID, estado: EstadoTurnoCaja.ABIERTO }]);
        }

        // Consultar venta original
        if (sql.includes('SELECT * FROM venta WHERE id = $1')) {
          if (params?.[0] === VENTA_PENDIENTE_UUID) {
            return Promise.resolve([
              {
                id: VENTA_PENDIENTE_UUID,
                id_sucursal: SUCURSAL_UUID,
                estado_general: EstadoGeneral.CONFIRMADA,
                estado_financiero: EstadoFinanciero.PENDIENTE,
                id_cliente: null,
                total: 2000,
              },
            ]);
          }
          return Promise.resolve([
            {
              id: VENTA_CONFIRMADA_UUID,
              id_sucursal: SUCURSAL_UUID,
              estado_general: EstadoGeneral.CONFIRMADA,
              estado_financiero: EstadoFinanciero.PAGADO,
              id_cliente: params?.[0] === VENTA_CON_CLIENTE_UUID ? CLIENTE_DEUDOR_UUID : null,
              total: 2000,
            },
          ]);
        }

        // Consultar renglones de la venta original (Venta de 2 unidades a $1000 c/u, con promo de $200 de descuento total -> $100 desc c/u)
        if (sql.includes('SELECT * FROM venta_detalle WHERE id_venta = $1')) {
          return Promise.resolve([
            {
              id: 'det-vta-1',
              id_venta: params?.[0],
              id_producto: PRODUCTO_UUID,
              cantidad: 2,
              precio_unitario: 1000,
              monto_descuento: 200, // $100 por unidad
            },
          ]);
        }

        // Devoluciones previas de esta venta (O-19)
        if (sql.includes('FROM nota_credito_detalle ncd') && sql.includes('WHERE nc.id_venta = $1')) {
          if (params?.[0] === VENTA_DEVUELTA_UUID) {
            return Promise.resolve([{ id_producto: PRODUCTO_UUID, total_devuelto: 2 }]); // Ya se devolvieron las 2
          }
          return Promise.resolve([]); // Sin devoluciones previas
        }

        // Consultar cliente para compensación de deuda
        if (sql.includes('SELECT nombre, saldo_deudor FROM cliente WHERE id = $1')) {
          return Promise.resolve([
            {
              nombre: 'Mario Rossi',
              saldo_deudor: 1500, // Tiene deuda pendiente de 1500
            },
          ]);
        }

        // Auditoría
        if (sql.includes('INSERT INTO auditoria')) {
          return Promise.resolve([{ id: 'audit-nc-123' }]);
        }

        // Correlativo de notas de crédito
        if (sql.includes('COUNT(id) as total FROM nota_credito')) {
          return Promise.resolve([{ total: 15 }]);
        }

        // Insertar nota de crédito
        if (sql.includes('INSERT INTO nota_credito (')) {
          return Promise.resolve([
            {
              id: params?.[0] || NC_UUID,
              numero_comprobante: params?.[1],
              id_venta: params?.[2],
              id_cliente: params?.[3],
              id_usuario: params?.[4],
              id_turno_caja: params?.[5],
              monto_total: params?.[6],
              tipo_devolucion: params?.[7],
              motivo: params?.[8],
              fecha: new Date().toISOString(),
            },
          ]);
        }

        // Insertar nota_credito_detalle
        if (sql.includes('INSERT INTO nota_credito_detalle')) {
          return Promise.resolve([
            {
              id: params?.[0] || 'ncd-1',
              id_nota_credito: params?.[1],
              id_producto: params?.[2],
              cantidad: params?.[3],
              precio_unitario_momento: params?.[4],
              monto_descuento: params?.[5],
              subtotal: params?.[6],
              devuelto_a_inventario: true,
            },
          ]);
        }

        // Obtener nota de crédito por ID
        if (sql.includes('SELECT * FROM nota_credito WHERE id = $1')) {
          return Promise.resolve([
            {
              id: NC_UUID,
              numero_comprobante: 'NC-0001-00000016',
              id_venta: VENTA_CONFIRMADA_UUID,
              monto_total: 900,
              tipo_devolucion: TipoDevolucion.EFECTIVO_CAJA,
              motivo: 'Producto con falla de empaque',
            },
          ]);
        }

        // Obtener detalles de nota de crédito
        if (sql.includes('SELECT * FROM nota_credito_detalle WHERE id_nota_credito = $1')) {
          return Promise.resolve([
            {
              id: 'ncd-1',
              id_nota_credito: NC_UUID,
              id_producto: PRODUCTO_UUID,
              cantidad: 1,
              precio_unitario_momento: 1000,
              monto_descuento: 100,
              subtotal: 900,
              devuelto_a_inventario: true,
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

  it('1. POST /api/devoluciones — Debe emitir Nota de Crédito en efectivo deduciendo prorrateo promocional (RF-09 / RF-11)', async () => {
    // Venta original: 2 un a $1000 con $200 de descuento ($100 c/u)
    // Devolvemos 1 un -> Reembolso neto: $1000 - $100 = $900
    const res = await request(app.getHttpServer())
      .post('/api/devoluciones')
      .send({
        id_venta: VENTA_CONFIRMADA_UUID,
        id_turno_caja: TURNO_ABIERTO_UUID,
        tipo_devolucion: TipoDevolucion.EFECTIVO_CAJA,
        motivo: 'Producto con falla de empaque',
        items: [
          {
            id_producto: PRODUCTO_UUID,
            cantidad: 1,
          },
        ],
      })
      .expect(201);

    expect(res.body).toHaveProperty('id');
    expect(res.body.numero_comprobante).toBe('NC-0001-00000016');
    expect(res.body.monto_total).toBe(900); // 1000 - 100 prorrateado
    expect(res.body.detalles[0].subtotal).toBe(900);
  });

  it('2. POST /api/devoluciones — RF-17: Debe rechazar la devolución si el turno de caja receptor no está ABIERTO (HTTP 400)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/devoluciones')
      .send({
        id_venta: VENTA_CONFIRMADA_UUID,
        id_turno_caja: TURNO_CERRADO_UUID,
        tipo_devolucion: TipoDevolucion.EFECTIVO_CAJA,
        motivo: 'Intento en turno cerrado',
        items: [{ id_producto: PRODUCTO_UUID, cantidad: 1 }],
      })
      .expect(400);

    expect(res.body.message).toContain('Solo se pueden procesar devoluciones en turnos activos');
  });

  it('3. POST /api/devoluciones — Compensación Mixta RF-10: Si el cliente posee deuda pendiente en CC, prioriza amortizar saldo deudor', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/devoluciones')
      .send({
        id_venta: VENTA_CON_CLIENTE_UUID,
        id_turno_caja: TURNO_ABIERTO_UUID,
        tipo_devolucion: TipoDevolucion.REDUCCION_DEUDA,
        motivo: 'Devolución imputada a saldo deudor de cliente',
        items: [{ id_producto: PRODUCTO_UUID, cantidad: 1 }],
      })
      .expect(201);

    expect(res.body.tipo_devolucion).toBe(TipoDevolucion.REDUCCION_DEUDA);
    expect(res.body.monto_total).toBe(900);
  });

  it('4. POST /api/devoluciones — Resolución O-19: Control anti-doble devolución rechaza si se excede la cantidad neta original', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/devoluciones')
      .send({
        id_venta: VENTA_DEVUELTA_UUID,
        id_turno_caja: TURNO_ABIERTO_UUID,
        tipo_devolucion: TipoDevolucion.EFECTIVO_CAJA,
        motivo: 'Intento de devolver mercadería ya reembolsada',
        items: [{ id_producto: PRODUCTO_UUID, cantidad: 1 }],
      })
      .expect(400);

    expect(res.body.message).toContain('supera la cantidad neta disponible para devolución');
  });

  it('5. POST /api/devoluciones — Guarda O-15: Venta en estado PENDIENTE rechaza sin confirmación explícita de no reintegro de dinero', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/devoluciones')
      .send({
        id_venta: VENTA_PENDIENTE_UUID,
        id_turno_caja: TURNO_ABIERTO_UUID,
        tipo_devolucion: TipoDevolucion.EFECTIVO_CAJA,
        motivo: 'Venta pendiente sin dinero ingresado',
        items: [{ id_producto: PRODUCTO_UUID, cantidad: 1 }],
        confirmar_sin_dinero: false,
      })
      .expect(400);

    expect(res.body.message).toContain('ADVERTENCIA_VENTA_PENDIENTE');
  });

  it('6. GET /api/devoluciones/:id — Debe obtener una Nota de Crédito completa con sus renglones y montos netos', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/devoluciones/${NC_UUID}`)
      .expect(200);

    expect(res.body.id).toBe(NC_UUID);
    expect(res.body.numero_comprobante).toBe('NC-0001-00000016');
    expect(res.body.monto_total).toBe(900);
    expect(Array.isArray(res.body.detalles)).toBe(true);
  });
});
