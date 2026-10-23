import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import {
  TipoAjusteStock,
  TipoVentaProducto,
} from '@poslyon/domain-core';
import { AppModule } from '../../app.module';
import { configureApp } from '../../bootstrap';
import { POSLYON_DATA_SOURCE } from '../../database/database.module';

const PROD_UUID = '550e8400-e29b-41d4-a716-446655440050';
const SUCURSAL_UUID = '550e8400-e29b-41d4-a716-446655440051';
const CATEGORIA_UUID = '550e8400-e29b-41d4-a716-446655440052';

describe('Paso 2.3 — Módulo Catálogo e Inventario Base (Códigos de Barra, Precios por Tienda N=1, Ajuste Permisivo C-12 y OCC)', () => {
  let app: INestApplication;
  let mockQueryRunner: any;

  beforeAll(async () => {
    process.env.SKIP_DB_INIT_ON_BOOT = 'true';

    mockQueryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      query: jest.fn().mockImplementation((sql: string, params?: any[]) => {
        if (sql.includes('INSERT INTO categoria')) {
          return Promise.resolve([
            {
              id: CATEGORIA_UUID,
              nombre: params?.[1],
              descripcion: params?.[2],
              activo: true,
              version: 1,
            },
          ]);
        }
        if (sql.includes('SELECT id FROM categoria WHERE LOWER(nombre)')) {
          return Promise.resolve([]);
        }
        if (sql.includes('INSERT INTO producto_global')) {
          return Promise.resolve([
            {
              id: params?.[0] || PROD_UUID,
              id_categoria: params?.[1],
              nombre: params?.[2],
              descripcion: params?.[3],
              tipo_venta: params?.[4],
              multiplicador_stock: params?.[5],
              activo: true,
              version: 1,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ]);
        }
        if (sql.includes('INSERT INTO codigo_barra')) {
          return Promise.resolve([]);
        }
        if (sql.includes('INSERT INTO producto_sucursal')) {
          return Promise.resolve([
            {
              id: 'ps-uuid-1',
              id_sucursal: params?.[1],
              id_producto: params?.[2],
              precio_costo: params?.[3],
              precio_minorista: params?.[4],
              precio_mayorista: params?.[5],
              stock_fisico: params?.[6],
              stock_reservado: 0,
              version: 1,
              activo: true,
            },
          ]);
        }
        if (sql.includes('INSERT INTO auditoria')) {
          return Promise.resolve([{ id: 'audit-cat-123' }]);
        }
        if (sql.includes('SELECT * FROM producto_sucursal WHERE id_producto = $1 AND id_sucursal = $2 FOR UPDATE')) {
          return Promise.resolve([
            {
              id: 'ps-uuid-1',
              id_producto: PROD_UUID,
              id_sucursal: SUCURSAL_UUID,
              precio_costo: 500,
              precio_minorista: 1000,
              precio_mayorista: 850,
              stock_fisico: 10,
              version: 1,
            },
          ]);
        }
        if (sql.includes('SELECT * FROM producto_sucursal WHERE id_producto = $1 AND id_sucursal = $2')) {
          return Promise.resolve([
            {
              id: 'ps-uuid-1',
              id_producto: PROD_UUID,
              id_sucursal: SUCURSAL_UUID,
              precio_costo: 500,
              precio_minorista: 1000,
              precio_mayorista: 850,
              stock_fisico: 10,
              version: 1,
            },
          ]);
        }
        if (sql.includes('UPDATE producto_sucursal') && sql.includes('stock_fisico = $1')) {
          return Promise.resolve([
            {
              id: 'ps-uuid-1',
              id_producto: PROD_UUID,
              id_sucursal: SUCURSAL_UUID,
              stock_fisico: params?.[0], // Admite valores negativos C-12
              version: (params?.[3] || 1) + 1,
            },
          ]);
        }
        if (sql.includes('UPDATE producto_sucursal') && sql.includes('precio_minorista = $2')) {
          return Promise.resolve([
            {
              id: 'ps-uuid-1',
              id_producto: PROD_UUID,
              id_sucursal: SUCURSAL_UUID,
              precio_costo: params?.[0],
              precio_minorista: params?.[1],
              precio_mayorista: params?.[2],
              version: (params?.[5] || 1) + 1,
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
        if (sql.includes('FROM codigo_barra cb')) {
          return Promise.resolve([
            {
              id: PROD_UUID,
              nombre: 'Coca Cola 2.25L',
              descripcion: 'Gaseosa cola retornable',
              tipo_venta: TipoVentaProducto.UNIDAD,
              codigo_barra_escaneado: '7791234567890',
              precio_costo: 600,
              precio_minorista: 1200,
              stock_fisico: -3, // Admite negativo permisivo en góndola C-12
              version_sucursal: 2,
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

  describe('1. POST /api/catalogo/productos (Alta Atómica de Producto con Códigos y Precios)', () => {
    it('debe registrar el producto en PRODUCTO_GLOBAL, sus códigos de barra y precios de sucursal', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/catalogo/productos')
        .set('x-audit-reason', 'Alta inicial de producto en catálogo central')
        .send({
          nombre: 'Coca Cola 2.25L',
          descripcion: 'Gaseosa cola retornable',
          tipo_venta: TipoVentaProducto.UNIDAD,
          codigos_barra: ['7791234567890', '7791234567891'],
          precios_sucursales: [
            {
              id_sucursal: SUCURSAL_UUID,
              precio_costo: 600,
              precio_minorista: 1200,
              precio_mayorista: 1050,
              stock_inicial: 24,
            },
          ],
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.nombre).toBe('Coca Cola 2.25L');
      expect(response.body.sucursales).toBeDefined();
      expect(response.body.sucursales.length).toBe(1);
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalledTimes(1);
    });
  });

  describe('2. GET /api/catalogo/codigo-barra/:codigo (Búsqueda Rápida para Mostrador)', () => {
    it('debe resolver el producto escaneado con precios y stock de la sucursal', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/catalogo/codigo-barra/7791234567890?idSucursal=${SUCURSAL_UUID}`)
        .expect(200);

      expect(response.body.codigo_barra_escaneado).toBe('7791234567890');
      expect(response.body.nombre).toBe('Coca Cola 2.25L');
      expect(response.body.precio_minorista).toBe(1200);
      expect(response.body.stock_fisico).toBe(-3); // Permisivo C-12
    });
  });

  describe('3. PUT /api/catalogo/productos/:id/precios/:idSucursal (OCC en Precios)', () => {
    it('debe actualizar los precios por sucursal cuando la versión coincide', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/catalogo/productos/${PROD_UUID}/precios/${SUCURSAL_UUID}`)
        .send({
          precio_costo: 700,
          precio_minorista: 1400,
          version: 1, // Coincide con mock
          motivo: 'Aumento de costo del proveedor distribuidor',
        })
        .expect(200);

      expect(response.body.version).toBe(2);
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalledTimes(1);
    });

    it('debe rechazar con HTTP 409 Conflict si la versión OCC está desfasada', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/catalogo/productos/${PROD_UUID}/precios/${SUCURSAL_UUID}`)
        .send({
          precio_minorista: 1500,
          version: 99, // Desfasaje OCC
          motivo: 'Intento desfasado',
        })
        .expect(409);

      expect(response.body.codigo).toBe('OCC_VERSION_MISMATCH');
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
    });
  });

  describe('4. POST /api/catalogo/ajustar-stock (Ajuste Manual Permisivo C-12 y OCC)', () => {
    it('debe admitir stock_fisico negativo según Resolución C-12 e incrementar versión', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/catalogo/ajustar-stock')
        .send({
          id_producto: PROD_UUID,
          id_sucursal: SUCURSAL_UUID,
          tipo_ajuste: TipoAjusteStock.AJUSTE_MANUAL,
          cantidad_nueva: -5, // Valor negativo permitido en mostrador (Resolución C-12)
          expected_version: 1,
          motivo: 'Conteo físico forense: faltante en góndola registrado',
        })
        .expect(200);

      expect(response.body.stock_fisico).toBe(-5);
      expect(response.body.version).toBe(2);
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalledTimes(1);
    });
  });

  describe('5. POST /api/catalogo/categorias (Creación de Categorías)', () => {
    it('debe dar de alta una nueva categoría de productos', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/catalogo/categorias')
        .send({
          nombre: 'Bebidas con Gas',
          descripcion: 'Gaseosas, aguas saborizadas y sodas',
        })
        .expect(201);

      expect(response.body.nombre).toBe('Bebidas con Gas');
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalledTimes(1);
    });
  });
});
