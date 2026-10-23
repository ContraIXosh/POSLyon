import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { EstadoDiscrepanciaItem, EstadoRecepcion } from '@poslyon/domain-core';
import { AppModule } from '../../app.module';
import { configureApp } from '../../bootstrap';
import { POSLYON_DATA_SOURCE } from '../../database/database.module';

const SUCURSAL_UUID = '550e8400-e29b-41d4-a716-446655440080';
const PROVEEDOR_UUID = '550e8400-e29b-41d4-a716-446655440081';
const PRODUCTO_UUID = '550e8400-e29b-41d4-a716-446655440082';
const USUARIO_UUID = '550e8400-e29b-41d4-a716-446655440083';
const RECEPCION_UUID = '550e8400-e29b-41d4-a716-446655440084';
const RENGLON_UUID = '550e8400-e29b-41d4-a716-446655440085';
const ALIAS_UUID = '550e8400-e29b-41d4-a716-446655440086';

describe('Paso 3.3 — Módulo Proveedores, Diccionario y Recepción de Mercadería (RF-14 / RF-15 / O-17 / O-18)', () => {
  let app: INestApplication;
  let mockQueryRunner: any;

  beforeAll(async () => {
    process.env.SKIP_DB_INIT_ON_BOOT = 'true';

    mockQueryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      query: jest.fn().mockImplementation((sql: string, params?: any[]) => {
        // CUIT duplicado
        if (sql.includes('SELECT id FROM proveedor WHERE cuit = $1')) {
          if (params?.[0] === '30-99999999-9') {
            return Promise.resolve([{ id: 'prov-duplicado-id' }]);
          }
          return Promise.resolve([]);
        }

        // Insertar proveedor
        if (sql.includes('INSERT INTO proveedor')) {
          return Promise.resolve([
            {
              id: params?.[0] || PROVEEDOR_UUID,
              razon_social: params?.[1],
              cuit: params?.[2],
              contacto_telefono: params?.[3],
              contacto_email: params?.[4],
              activo: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ]);
        }

        // Auditoría
        if (sql.includes('INSERT INTO auditoria')) {
          return Promise.resolve([{ id: 'audit-prov-123' }]);
        }

        // Obtener proveedor por ID
        if (sql.includes('SELECT * FROM proveedor WHERE id = $1')) {
          return Promise.resolve([
            {
              id: PROVEEDOR_UUID,
              razon_social: 'Arcor S.A.I.C.',
              cuit: '30-50279317-5',
              contacto_telefono: '+541147000000',
              contacto_email: 'ventas@arcor.com',
              activo: true,
            },
          ]);
        }

        // Actualizar proveedor
        if (sql.includes('UPDATE proveedor SET')) {
          return Promise.resolve([
            {
              id: PROVEEDOR_UUID,
              razon_social: params?.[0] || 'Arcor Alimentos S.A.',
              cuit: params?.[1] || '30-50279317-5',
              contacto_telefono: params?.[2],
              contacto_email: params?.[3],
              activo: true,
            },
          ]);
        }

        // Insertar / Upsert alias en diccionario
        if (sql.includes('INSERT INTO diccionario_proveedor')) {
          return Promise.resolve([
            {
              id: params?.[0] || ALIAS_UUID,
              id_proveedor: params?.[1],
              id_producto: params?.[2],
              nombre_en_factura: params?.[3],
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ]);
        }

        // Consultar alias en diccionario
        if (sql.includes('FROM diccionario_proveedor') && sql.includes('LOWER(nombre_en_factura) = LOWER($2)')) {
          return Promise.resolve([
            {
              id: ALIAS_UUID,
              id_proveedor: PROVEEDOR_UUID,
              id_producto: PRODUCTO_UUID,
              nombre_en_factura: 'GALLETITAS CHOCOLINAS 250G',
            },
          ]);
        }

        // Insertar renglón en recepción (Debe evaluarse ANTES de recepcion_mercaderia por prefijo)
        if (sql.includes('INSERT INTO recepcion_mercaderia_detalle')) {
          return Promise.resolve([
            {
              id: params?.[0] || RENGLON_UUID,
              id_recepcion_mercaderia: params?.[1],
              id_producto: params?.[2],
              cantidad_declarada: params?.[3],
              cantidad_recibida: params?.[4],
              costo_unitario: params?.[5],
              costo_anterior: params?.[6],
              precio_venta_sugerido: params?.[7],
              aplicar_precio_sugerido: params?.[8],
              estado_discrepancia: params?.[9],
            },
          ]);
        }

        // Iniciar recepción
        if (sql.includes('INSERT INTO recepcion_mercaderia (')) {
          return Promise.resolve([
            {
              id: params?.[0] || RECEPCION_UUID,
              id_sucursal: params?.[1],
              id_proveedor: params?.[2],
              id_usuario: params?.[3],
              numero_remito: params?.[4],
              estado: EstadoRecepcion.BORRADOR,
              total_bultos: 0,
              version: 1,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ]);
        }

        // Consultar recepción
        if (sql.includes('SELECT * FROM recepcion_mercaderia WHERE id = $1')) {
          return Promise.resolve([
            {
              id: RECEPCION_UUID,
              id_sucursal: SUCURSAL_UUID,
              id_proveedor: PROVEEDOR_UUID,
              id_usuario: USUARIO_UUID,
              numero_remito: 'REM-0001-00045231',
              estado: EstadoRecepcion.BORRADOR,
              total_bultos: 0,
              version: 1,
            },
          ]);
        }

        // Consultar precios previos del producto en la sucursal (costo: 500, precio_minorista: 750 -> 50% Markup)
        if (sql.includes('FROM producto_sucursal') && sql.includes('WHERE id_producto_global = $1')) {
          return Promise.resolve([
            {
              precio_costo: 500.0,
              precio_minorista: 750.0,
              stock_fisico: 10,
            },
          ]);
        }


        // Consultar renglones de la recepción
        if (sql.includes('FROM recepcion_mercaderia_detalle WHERE id_recepcion_mercaderia = $1')) {
          return Promise.resolve([
            {
              id: RENGLON_UUID,
              id_recepcion_mercaderia: RECEPCION_UUID,
              id_producto: PRODUCTO_UUID,
              cantidad_declarada: 20,
              cantidad_recibida: 18,
              costo_unitario: 600.0,
              costo_anterior: 500.0,
              precio_venta_sugerido: 900.0,
              aplicar_precio_sugerido: true,
              estado_discrepancia: EstadoDiscrepanciaItem.FALTANTE,
            },
          ]);
        }

        // Confirmar recepción
        if (sql.includes('UPDATE recepcion_mercaderia SET')) {
          return Promise.resolve([
            {
              id: RECEPCION_UUID,
              id_sucursal: SUCURSAL_UUID,
              estado: EstadoRecepcion.CONFIRMADA,
              total_bultos: 18,
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

  it('1. POST /api/proveedores — Debe crear un proveedor exitosamente', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/proveedores')
      .send({
        razon_social: 'Arcor S.A.I.C.',
        cuit: '30-50279317-5',
        contacto_telefono: '+541147000000',
        contacto_email: 'ventas@arcor.com',
      })
      .expect(201);

    expect(res.body).toHaveProperty('id');
    expect(res.body.razon_social).toBe('Arcor S.A.I.C.');
    expect(res.body.cuit).toBe('30-50279317-5');
  });

  it('2. POST /api/proveedores — Conflicto de CUIT: Debe rechazar proveedor con CUIT repetido (HTTP 409)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/proveedores')
      .send({
        razon_social: 'Proveedor Clon',
        cuit: '30-99999999-9',
      })
      .expect(409);

    const mensaje = res.body.mensaje || res.body.message;
    expect(mensaje).toContain('Ya existe un proveedor activo registrado');
  });

  it('3. GET /api/proveedores/:id — Debe obtener un proveedor por su ID', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/proveedores/${PROVEEDOR_UUID}`)
      .expect(200);

    expect(res.body.id).toBe(PROVEEDOR_UUID);
    expect(res.body.razon_social).toBe('Arcor S.A.I.C.');
  });

  it('4. PUT /api/proveedores/:id — Debe actualizar datos del proveedor', async () => {
    const res = await request(app.getHttpServer())
      .put(`/api/proveedores/${PROVEEDOR_UUID}`)
      .send({
        razon_social: 'Arcor Alimentos S.A.',
      })
      .expect(200);

    expect(res.body.razon_social).toBe('Arcor Alimentos S.A.');
  });

  it('5. DELETE /api/proveedores/:id — Debe dar de baja lógica al proveedor (Soft Delete HTTP 200)', async () => {
    const res = await request(app.getHttpServer())
      .delete(`/api/proveedores/${PROVEEDOR_UUID}`)
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  it('6. POST /api/proveedores/diccionario — Debe registrar un alias de factura en el diccionario (RF-14)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/proveedores/diccionario')
      .send({
        id_proveedor: PROVEEDOR_UUID,
        id_producto: PRODUCTO_UUID,
        nombre_en_factura: 'GALLETITAS CHOCOLINAS 250G',
      })
      .expect(201);

    expect(res.body).toHaveProperty('id');
    expect(res.body.nombre_en_factura).toBe('GALLETITAS CHOCOLINAS 250G');
    expect(res.body.id_producto).toBe(PRODUCTO_UUID);
  });

  it('7. GET /api/proveedores/:id/diccionario/consultar — Debe sugerir el producto oficial a partir del alias', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/proveedores/${PROVEEDOR_UUID}/diccionario/consultar?nombre_factura=GALLETITAS CHOCOLINAS 250G`)
      .expect(200);

    expect(res.body.id_producto).toBe(PRODUCTO_UUID);
  });

  it('8. POST /api/proveedores/recepciones — Debe iniciar una orden de recepción de mercadería en estado BORRADOR', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/proveedores/recepciones')
      .send({
        id_sucursal: SUCURSAL_UUID,
        id_proveedor: PROVEEDOR_UUID,
        id_usuario: USUARIO_UUID,
        numero_remito: 'REM-0001-00045231',
      })
      .expect(201);

    expect(res.body).toHaveProperty('id');
    expect(res.body.estado).toBe(EstadoRecepcion.BORRADOR);
    expect(res.body.numero_remito).toBe('REM-0001-00045231');
  });

  it('9. POST /api/proveedores/recepciones/:id/renglones — Debe calcular el precio de venta sugerido preservando el Markup (RF-15)', async () => {
    // Costo anterior era 500, precio minorista 750 (50% Markup)
    // Nuevo costo unitario es 600 -> Precio sugerido = 600 * (1 + 0.5) = 900
    const res = await request(app.getHttpServer())
      .post(`/api/proveedores/recepciones/${RECEPCION_UUID}/renglones`)
      .send({
        id_recepcion_mercaderia: RECEPCION_UUID,
        id_producto: PRODUCTO_UUID,
        cantidad_declarada: 20,
        costo_unitario: 600,
        nombre_en_factura: 'GALLETITAS CHOCOLINAS 250G',
      })
      .expect(201);

    expect(res.body).toHaveProperty('id');
    expect(res.body.costo_anterior).toBe(500);
    expect(res.body.costo_unitario).toBe(600);
    expect(res.body.precio_venta_sugerido).toBe(900); // 50% Markup preservado
  });

  it('10. POST /api/proveedores/recepciones/:id/confirmar — Confirmación atómica: Solo la cantidad recibida entra al stock físico (O-18) y actualiza precios (RF-15)', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/proveedores/recepciones/${RECEPCION_UUID}/confirmar`)
      .send({
        id_recepcion: RECEPCION_UUID,
        renglones: [
          {
            id_detalle: RENGLON_UUID,
            cantidad_recibida: 18, // Se contaron 18 en lugar de las 20 declaradas (FALTANTE)
            aplicar_precio_sugerido: true,
          },
        ],
      })
      .expect(200);

    expect(res.body.estado).toBe(EstadoRecepcion.CONFIRMADA);
    expect(res.body.total_bultos).toBe(18); // Solo los 18 bultos contados
    expect(res.body.version).toBe(2);
  });

  it('11. GET /api/proveedores/recepciones/:id — Debe retornar el remito con sus renglones y estado de discrepancia', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/proveedores/recepciones/${RECEPCION_UUID}`)
      .expect(200);

    expect(res.body.id).toBe(RECEPCION_UUID);
    expect(Array.isArray(res.body.detalles)).toBe(true);
    expect(res.body.detalles[0].estado_discrepancia).toBe(EstadoDiscrepanciaItem.FALTANTE);
    expect(res.body.detalles[0].cantidad_recibida).toBe(18);
  });
});
