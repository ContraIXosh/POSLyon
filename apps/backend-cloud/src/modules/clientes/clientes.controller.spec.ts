import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { TipoMovimientoCC } from '@poslyon/domain-core';
import { AppModule } from '../../app.module';
import { configureApp } from '../../bootstrap';
import { POSLYON_DATA_SOURCE } from '../../database/database.module';

const SUCURSAL_UUID = '550e8400-e29b-41d4-a716-446655440070';
const CLIENTE_UUID = '550e8400-e29b-41d4-a716-446655440071';
const TURNO_UUID = '550e8400-e29b-41d4-a716-446655440072';
const METODO_PAGO_EFECTIVO_UUID = '550e8400-e29b-41d4-a716-446655440073';
const ABONO_UUID = '550e8400-e29b-41d4-a716-446655440074';
const VENTA_OFFLINE_UUID = '550e8400-e29b-41d4-a716-446655440075';

describe('Paso 3.2 — Módulo Clientes y Cuentas Corrientes (Signed Ledger, Abonos, RF-08 / C-10 / O-10)', () => {
  let app: INestApplication;
  let mockQueryRunner: any;

  beforeAll(async () => {
    process.env.SKIP_DB_INIT_ON_BOOT = 'true';

    mockQueryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      query: jest.fn().mockImplementation((sql: string, params?: any[]) => {
        // Validación de unicidad de dni_cuit
        if (sql.includes('SELECT id FROM cliente WHERE dni_cuit = $1')) {
          if (params?.[0] === '20-99999999-9') {
            return Promise.resolve([{ id: 'cliente-duplicado-id' }]);
          }
          return Promise.resolve([]);
        }

        // Insertar cliente
        if (sql.includes('INSERT INTO cliente')) {
          return Promise.resolve([
            {
              id: params?.[0] || CLIENTE_UUID,
              id_sucursal: params?.[1],
              nombre: params?.[2],
              dni_cuit: params?.[3],
              telefono: params?.[4],
              email: params?.[5],
              limite_credito: params?.[6] || 0,
              saldo_deudor: 0,
              requiere_revision: false,
              version: 1,
              activo: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ]);
        }

        // Auditoría
        if (sql.includes('INSERT INTO auditoria')) {
          return Promise.resolve([{ id: 'audit-cliente-123' }]);
        }

        // Obtener cliente por ID
        if (sql.includes('SELECT * FROM cliente WHERE id = $1')) {
          if (params?.[0] === '550e8400-e29b-41d4-a716-446655440099') {
            return Promise.resolve([]); // No encontrado
          }
          if (params?.[0] === '550e8400-e29b-41d4-a716-446655440088') {
            // Cliente con deuda pendiente
            return Promise.resolve([
              {
                id: '550e8400-e29b-41d4-a716-446655440088',
                id_sucursal: SUCURSAL_UUID,
                nombre: 'Cliente Con Deuda',
                limite_credito: 10000,
                saldo_deudor: 2500,
                version: 1,
                activo: true,
              },
            ]);
          }
          return Promise.resolve([
            {
              id: CLIENTE_UUID,
              id_sucursal: SUCURSAL_UUID,
              nombre: 'Juan Perez',
              dni_cuit: '20-33444555-9',
              telefono: '+5491122334455',
              email: 'juan.perez@example.com',
              limite_credito: 10000,
              saldo_deudor: 1500,
              requiere_revision: false,
              version: 2,
              activo: true,
            },
          ]);
        }

        // Actualizar cliente
        if (sql.includes('UPDATE cliente SET')) {
          return Promise.resolve([
            {
              id: CLIENTE_UUID,
              nombre: params?.[0] || 'Juan Perez Actualizado',
              limite_credito: params?.[4] || 15000,
              saldo_deudor: 1500,
              version: (params?.[5] as number) || 3,
              activo: true,
            },
          ]);
        }

        // Idempotencia de cuenta corriente
        if (sql.includes('SELECT * FROM cuenta_corriente WHERE id = $1')) {
          if (params?.[0] === '550e8400-e29b-41d4-a716-446655440001') {
            // Ya existe (simulación de idempotencia)
            return Promise.resolve([
              {
                id: '550e8400-e29b-41d4-a716-446655440001',
                id_cliente: CLIENTE_UUID,
                monto: -500,
                tipo_movimiento: TipoMovimientoCC.ABONO,
                saldo_resultante: 1000,
              },
            ]);
          }
          return Promise.resolve([]);
        }

        // Insertar movimiento de caja (por abono en efectivo)
        if (sql.includes('INSERT INTO movimiento_caja')) {
          return Promise.resolve([
            {
              id: params?.[0],
              id_turno_caja: params?.[1],
              monto: params?.[5],
              concepto: params?.[6],
            },
          ]);
        }

        // Insertar asiento en cuenta corriente
        if (sql.includes('INSERT INTO cuenta_corriente')) {
          return Promise.resolve([
            {
              id: params?.[0] || ABONO_UUID,
              id_cliente: params?.[1],
              id_venta: params?.[2] || null,
              id_nota_credito: params?.[3] || null,
              id_metodo_pago: params?.[4] || null,
              id_turno_caja: params?.[5] || null,
              id_usuario: params?.[6] || null,
              monto: params?.[7],
              tipo_movimiento: params?.[8],
              concepto: params?.[9],
              saldo_resultante: params?.[10],
              fecha: params?.[11] || new Date().toISOString(),
            },
          ]);
        }

        // Listar libro mayor
        if (sql.includes('FROM cuenta_corriente') && sql.includes('WHERE id_cliente = $1')) {
          return Promise.resolve([
            {
              id: ABONO_UUID,
              id_cliente: CLIENTE_UUID,
              monto: -500,
              tipo_movimiento: TipoMovimientoCC.ABONO,
              concepto: 'Abono presencial en mostrador - Medio: EFECTIVO',
              saldo_resultante: 1000,
              fecha: new Date().toISOString(),
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

  it('1. POST /api/clientes — Debe crear un nuevo cliente con límite de crédito correctamente', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/clientes')
      .send({
        id_sucursal: SUCURSAL_UUID,
        nombre: 'Nuevo Cliente Mayorista',
        dni_cuit: '20-11223344-5',
        telefono: '+5491144556677',
        email: 'mayorista@example.com',
        limite_credito: 50000,
      })
      .expect(201);

    expect(res.body).toHaveProperty('id');
    expect(res.body.nombre).toBe('Nuevo Cliente Mayorista');
    expect(res.body.limite_credito).toBe(50000);
    expect(res.body.saldo_deudor).toBe(0);
    expect(res.body.version).toBe(1);
  });

  it('2. POST /api/clientes — Debe rechazar cliente con DNI/CUIT duplicado (HTTP 409)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/clientes')
      .send({
        id_sucursal: SUCURSAL_UUID,
        nombre: 'Cliente Repetido',
        dni_cuit: '20-99999999-9',
      })
      .expect(409);

    const mensaje = res.body.mensaje || res.body.message;
    expect(mensaje).toContain('Ya existe un cliente activo registrado');
  });

  it('3. GET /api/clientes/:id — Debe obtener los datos y saldo del cliente', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/clientes/${CLIENTE_UUID}`)
      .expect(200);

    expect(res.body.id).toBe(CLIENTE_UUID);
    expect(res.body.nombre).toBe('Juan Perez');
    expect(res.body.saldo_deudor).toBe(1500);
  });

  it('4. PUT /api/clientes/:id — Debe actualizar el cliente con OCC exitoso', async () => {
    const res = await request(app.getHttpServer())
      .put(`/api/clientes/${CLIENTE_UUID}`)
      .send({
        nombre: 'Juan Perez Actualizado',
        limite_credito: 15000,
        expected_version: 2,
      })
      .expect(200);

    expect(res.body.nombre).toBe('Juan Perez Actualizado');
    expect(res.body.limite_credito).toBe(15000);
  });

  it('5. PUT /api/clientes/:id — Conflicto OCC: Debe rechazar actualización si version no coincide (HTTP 409)', async () => {
    const res = await request(app.getHttpServer())
      .put(`/api/clientes/${CLIENTE_UUID}`)
      .send({
        nombre: 'Intento Concurrente',
        expected_version: 99,
      })
      .expect(409);

    const mensaje = res.body.mensaje || res.body.message;
    expect(mensaje).toContain('Conflicto OCC');
  });

  it('6. DELETE /api/clientes/:id — Invariante: Debe rechazar baja de cliente con saldo deudor pendiente (HTTP 400)', async () => {
    const res = await request(app.getHttpServer())
      .delete('/api/clientes/550e8400-e29b-41d4-a716-446655440088')
      .expect(400);

    expect(res.body.message).toContain('posee un saldo deudor pendiente');
  });

  it('7. GET /api/clientes/:id/evaluar-credito — Debe evaluar disponibilidad de crédito con función pura de dominio', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/clientes/${CLIENTE_UUID}/evaluar-credito?monto=5000`)
      .expect(200);

    expect(res.body.aprobado).toBe(true);
    expect(res.body.disponible).toBe(8500); // 10000 - 1500
    expect(res.body.nuevo_saldo_proyectado).toBe(6500);
  });

  it('8. POST /api/clientes/:id/abonos — Debe asentar abono en efectivo en Signed Ledger e impactar en gaveta de caja', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/clientes/${CLIENTE_UUID}/abonos`)
      .send({
        id: ABONO_UUID,
        id_cliente: CLIENTE_UUID,
        id_turno_caja: TURNO_UUID,
        monto: 500,
        id_metodo_pago: METODO_PAGO_EFECTIVO_UUID,
        metodo_pago: 'EFECTIVO',
        expected_version: 2,
      })
      .expect(201);

    expect(res.body.id).toBe(ABONO_UUID);
    expect(res.body.monto).toBe(-500); // Signed Ledger: monto negativo
    expect(res.body.tipo_movimiento).toBe(TipoMovimientoCC.ABONO);
    expect(res.body.saldo_resultante).toBe(1000); // 1500 - 500
  });

  it('9. POST /api/clientes/:id/abonos — Invariante: Debe rechazar abono superior al saldo deudor (HTTP 400)', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/clientes/${CLIENTE_UUID}/abonos`)
      .send({
        id: '550e8400-e29b-41d4-a716-446655440079',
        id_cliente: CLIENTE_UUID,
        id_turno_caja: TURNO_UUID,
        monto: 99999, // Excede los 1500 de deuda
        id_metodo_pago: METODO_PAGO_EFECTIVO_UUID,
        metodo_pago: 'EFECTIVO',
        expected_version: 2,
      })
      .expect(400);

    expect(res.body.message).toContain('supera el saldo deudor pendiente actual');
  });

  it('10. POST /api/clientes/:id/abonos — Idempotencia O-22: Si el abono ya fue procesado con el mismo ID, no duplica impacto', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/clientes/${CLIENTE_UUID}/abonos`)
      .send({
        id: '550e8400-e29b-41d4-a716-446655440001', // Ya existente en mock
        id_cliente: CLIENTE_UUID,
        id_turno_caja: TURNO_UUID,
        monto: 500,
        id_metodo_pago: METODO_PAGO_EFECTIVO_UUID,
        metodo_pago: 'EFECTIVO',
        expected_version: 2,
      })
      .expect(201);

    expect(res.body.id).toBe('550e8400-e29b-41d4-a716-446655440001');
    expect(res.body.saldo_resultante).toBe(1000);
  });

  it('11. POST /api/clientes/sync-delta — Merge Aditivo offline: Sincroniza cargo y evalúa sobregiro (Resolución C-10 / RF-07)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/clientes/sync-delta')
      .send({
        id_cliente: CLIENTE_UUID,
        id_venta: VENTA_OFFLINE_UUID,
        monto_credito: 12000, // 1500 + 12000 = 13500 > límite de 10000
        expected_version: 2,
        id_usuario_sincronizador: '00000000-0000-0000-0000-000000000000',
      })
      .expect(200);

    expect(res.body).toHaveProperty('id');
    expect(res.body.tipo_movimiento).toBe(TipoMovimientoCC.VENTA_CREDITO);
    expect(res.body.saldo_resultante).toBe(13500);
  });

  it('12. GET /api/clientes/:id/cuenta-corriente — Debe retornar el historial inmutable de asientos del Libro Mayor', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/clientes/${CLIENTE_UUID}/cuenta-corriente`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0].monto).toBe(-500);
  });
});
