import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../../app.module';
import { configureApp } from '../../bootstrap';
import { POSLYON_DATA_SOURCE } from '../../database/database.module';

const USER_DUENO_UUID = '550e8400-e29b-41d4-a716-446655440010';
const USER_CAJERO_UUID = '550e8400-e29b-41d4-a716-446655440020';
const SUCURSAL_TEST_UUID = '550e8400-e29b-41d4-a716-446655440030';

describe('Paso 2.2 — Módulo Seguridad, Usuarios y PBAC (Grafo DAG, Bypass Dueño RF-20, OCC y Scrypt)', () => {
  let app: INestApplication;
  let mockQueryRunner: any;

  beforeAll(async () => {
    process.env.SKIP_DB_INIT_ON_BOOT = 'true';

    mockQueryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      query: jest.fn().mockImplementation((sql: string, params?: any[]) => {
        if (sql.includes('SELECT id FROM usuario WHERE email = $1')) {
          return Promise.resolve([]); // Email no duplicado
        }
        if (sql.includes('INSERT INTO usuario')) {
          return Promise.resolve([
            {
              id: params?.[0] || USER_CAJERO_UUID,
              nombre: params?.[1],
              email: params?.[2],
              es_dueno: params?.[4],
              activo: true,
              version: 1,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ]);
        }
        if (sql.includes('INSERT INTO auditoria')) {
          return Promise.resolve([{ id: 'audit-usr-123' }]);
        }
        if (sql.includes('SELECT') && sql.includes('FROM usuario') && sql.includes('FOR UPDATE')) {
          return Promise.resolve([
            {
              id: USER_CAJERO_UUID,
              nombre: 'Carlos Cajero',
              email: 'carlos@poslyon.com',
              es_dueno: false,
              activo: true,
              version: 1,
            },
          ]);
        }
        if (sql.includes('SELECT') && sql.includes('FROM usuario') && sql.includes('WHERE id = $1')) {
          return Promise.resolve([
            {
              id: USER_CAJERO_UUID,
              nombre: 'Carlos Cajero',
              email: 'carlos@poslyon.com',
              password_hash: 'mock:hash',
              es_dueno: false,
              activo: true,
              version: 1,
            },
          ]);
        }
        if (sql.includes('UPDATE usuario')) {
          return Promise.resolve([
            {
              id: USER_CAJERO_UUID,
              nombre: params?.[0] || 'Carlos Modificado',
              email: params?.[1] || 'carlos@poslyon.com',
              es_dueno: false,
              activo: !sql.includes('activo = false'),
              version: 2,
            },
          ]);
        }
        if (sql.includes('INSERT INTO usuario_sucursal')) {
          return Promise.resolve([
            {
              id: 'us-uuid-1',
              id_usuario: params?.[1],
              id_sucursal: params?.[2],
              rol: params?.[3],
              activo: true,
              version: 1,
            },
          ]);
        }
        if (sql.includes('DELETE FROM usuario_permiso')) {
          return Promise.resolve([]);
        }
        if (sql.includes('INSERT INTO usuario_permiso')) {
          return Promise.resolve([
            {
              id: 'up-uuid-1',
              id_usuario: params?.[1],
              id_permiso: params?.[2],
              id_sucursal: params?.[3],
              activo: true,
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
        if (sql.includes('SELECT to_regclass')) {
          return Promise.resolve([{ existe: 'permiso' }]);
        }
        if (sql.includes('FROM usuario WHERE id = $1 AND activo = true')) {
          const requestedId = params?.[0];
          if (requestedId === USER_DUENO_UUID) {
            return Promise.resolve([
              { id: USER_DUENO_UUID, es_dueno: true, activo: true },
            ]);
          }
          if (requestedId === USER_CAJERO_UUID) {
            return Promise.resolve([
              { id: USER_CAJERO_UUID, es_dueno: false, activo: true },
            ]);
          }
          return Promise.resolve([]);
        }
        if (sql.includes('FROM usuario_permiso up')) {
          // Permisos asignados para el cajero
          if (params?.[0] === USER_CAJERO_UUID) {
            return Promise.resolve([{ codigo: 'VENTAS_COBRAR_DIRECTO' }]);
          }
          return Promise.resolve([]);
        }
        if (sql.includes('FROM permiso WHERE activo = true')) {
          return Promise.resolve([
            {
              id: 'perm-1',
              codigo: 'CLIENTES_VER',
              modulo: 'CLIENTES',
              dependencias: [],
            },
            {
              id: 'perm-2',
              codigo: 'CLIENTES_REGISTRAR_ABONO',
              modulo: 'CLIENTES',
              dependencias: ['CLIENTES_VER'],
            },
            {
              id: 'perm-3',
              codigo: 'VENTAS_COBRAR_DIRECTO',
              modulo: 'VENTAS',
              dependencias: [],
            },
            {
              id: 'perm-4',
              codigo: 'VENTAS_COBRAR_FIADO',
              modulo: 'VENTAS',
              dependencias: ['CLIENTES_VER', 'CLIENTES_REGISTRAR_ABONO'],
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

  describe('1. POST /api/usuarios (Creación con Scrypt KDF y Auditoría)', () => {
    it('debe crear un usuario con contraseña hasheada y registrar auditoría forense', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/usuarios')
        .set('x-audit-reason', 'Alta de personal de caja')
        .send({
          nombre: 'Carlos Cajero',
          email: 'carlos@poslyon.com',
          password: 'PasswordSuperSegura2026!',
          es_dueno: false,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.nombre).toBe('Carlos Cajero');
      expect(response.body.es_dueno).toBe(false);
      expect(response.body).not.toHaveProperty('password_hash'); // Oculto en respuesta
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalledTimes(1);
    });
  });

  describe('2. PUT /api/usuarios/:id (Control OCC y HTTP 409)', () => {
    it('debe actualizar los datos cuando la versión coincide', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/usuarios/${USER_CAJERO_UUID}`)
        .send({
          nombre: 'Carlos Gómez',
          version: 1,
          motivo: 'Corrección de apellido',
        })
        .expect(200);

      expect(response.body.version).toBe(2);
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalledTimes(1);
    });

    it('debe rechazar con HTTP 409 Conflict si la versión OCC no coincide', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/usuarios/${USER_CAJERO_UUID}`)
        .send({
          nombre: 'Nombre desfasado',
          version: 88, // Desfasaje OCC
          motivo: 'Intento desfasado',
        })
        .expect(409);

      expect(response.body.codigo).toBe('OCC_VERSION_MISMATCH');
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
    });
  });

  describe('3. POST /api/permisos/asignar/:idUsuario (Grafo DAG de Dependencias PBAC)', () => {
    it('debe rechazar con HTTP 400 Bad Request si faltan dependencias del grafo (VENTAS_COBRAR_FIADO sin CLIENTES_VER)', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/permisos/asignar/${USER_CAJERO_UUID}`)
        .send({
          codigos_permisos: ['VENTAS_COBRAR_FIADO'], // Carece de CLIENTES_VER y CLIENTES_REGISTRAR_ABONO
          motivo: 'Asignación inconsistente intencional',
        })
        .expect(400);

      expect(response.body.message).toContain('Inconsistencia en Grafo de Dependencias');
      expect(response.body.message).toContain('CLIENTES_VER');
    });

    it('debe asignar exitosamente cuando se incluyen todos los pre-requisitos del grafo DAG', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/permisos/asignar/${USER_CAJERO_UUID}`)
        .send({
          codigos_permisos: [
            'CLIENTES_VER',
            'CLIENTES_REGISTRAR_ABONO',
            'VENTAS_COBRAR_FIADO',
          ],
          motivo: 'Asignación coherente de perfil cajero de cuentas corrientes',
        })
        .expect(200);

      expect(response.body.permisos_asignados).toEqual(
        expect.arrayContaining(['VENTAS_COBRAR_FIADO', 'CLIENTES_VER']),
      );
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalledTimes(1);
    });
  });

  describe('4. PermisosGuard y Bypass Dueño (RF-20)', () => {
    it('debe otorgar acceso incondicional al Dueño (es_dueno = true) sin requerir permisos asignados', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/permisos/laboratorio-guard-rf20')
        .set('x-user-id', USER_DUENO_UUID)
        .expect(200);

      expect(response.body.status).toBe('AUTORIZADO_POR_PBAC');
    });

    it('debe autorizar al cajero que posee el permiso específico VENTAS_COBRAR_DIRECTO', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/permisos/laboratorio-guard-rf20')
        .set('x-user-id', USER_CAJERO_UUID)
        .expect(200);

      expect(response.body.status).toBe('AUTORIZADO_POR_PBAC');
    });

    it('debe rechazar con HTTP 401 Unauthorized si no se provee x-user-id', async () => {
      await request(app.getHttpServer())
        .get('/api/permisos/laboratorio-guard-rf20')
        .expect(401);
    });
  });
});
