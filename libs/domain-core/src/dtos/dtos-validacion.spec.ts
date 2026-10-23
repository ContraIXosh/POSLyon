import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  UUID_ARTICULO_COMODIN,
  UUID_SYSTEM_BOT,
} from '../constants/comodin.constants';
import { AccionReconciliacion } from '../enums/accion-reconciliacion.enum';
import { EstadoCuarentena } from '../enums/estado-cuarentena.enum';
import { TipoDevolucion } from '../enums/tipo-devolucion.enum';
import { AccionAuditoria } from '../enums/accion-auditoria.enum';
import { CrearVentaDto } from './crear-venta.dto';
import { CrearDevolucionDto } from './crear-devolucion.dto';
import { ItemDevolucionDto } from './item-devolucion.dto';
import { RegistrarAbonoDto } from './registrar-abono.dto';
import { ReconciliarCodigoHuerfanoDto } from './reconciliar-codigo-huerfano.dto';
import { ResolverCuarentenaDto } from './resolver-cuarentena.dto';
import { ConfirmarRecepcionDto } from './confirmar-recepcion.dto';
import { SyncPushDto } from './sync-push.dto';
import { RegistrarAuditoriaDto } from './registrar-auditoria.dto';

const VALID_UUID_1 = '550e8400-e29b-41d4-a716-446655440000';
const VALID_UUID_2 = '6ba7b810-9dad-41d1-80b4-00c04fd430c8';
const VALID_UUID_3 = '7c9e6679-7425-40de-944b-e07fc1f90ae7';

describe('Paso 0.4 — Validación Declarativa de DTOs y @IsUUIDOrNil (S-03)', () => {
  describe('1. Validador Custom @IsUUIDOrNil (Resolución S-03)', () => {
    it('debe aceptar un UUIDv4 estándar en ItemDevolucionDto', async () => {
      const dto = plainToInstance(ItemDevolucionDto, {
        id_producto: VALID_UUID_1,
        cantidad: 2,
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('debe aceptar legítimamente el Nil UUID del Artículo Comodín (00000000-0000-0000-0000-000000000000)', async () => {
      const dto = plainToInstance(ItemDevolucionDto, {
        id_producto: UUID_ARTICULO_COMODIN,
        cantidad: 1,
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('debe aceptar UUID_SYSTEM_BOT en RegistrarAuditoriaDto', async () => {
      const dto = plainToInstance(RegistrarAuditoriaDto, {
        id_usuario: UUID_SYSTEM_BOT,
        tabla_afectada: 'CLIENTE',
        id_registro_afectado: VALID_UUID_1,
        accion: AccionAuditoria.EXCESO_LIMITE_CREDITO_POST_SYNC,
        valor_anterior: { limite: 40000, saldo: 30000 },
        valor_nuevo: { saldo: 80000 },
        motivo: 'Venta presencial offline superó límite modificado en nube',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('debe rechazar un string corrupto o UUID no válido que no sea reservado', async () => {
      const dto = plainToInstance(ItemDevolucionDto, {
        id_producto: '00000000-0000-0000-0000-000000000999',
        cantidad: 1,
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('id_producto');
    });
  });

  describe('2. CrearVentaDto y Validación Anidada (@ValidateNested + @Type)', () => {
    it('debe validar un payload completo de venta con pagos mixtos', async () => {
      const dto = plainToInstance(CrearVentaDto, {
        id_sucursal: VALID_UUID_1,
        id_turno_caja: VALID_UUID_2,
        id_usuario: VALID_UUID_3,
        id_cliente: VALID_UUID_1,
        total: 25000,
        pagos: [
          { id_metodo_pago: VALID_UUID_2, monto: 15000 },
          { id_metodo_pago: VALID_UUID_3, monto: 10000 },
        ],
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('debe rechazar un ítem de pago anidado con monto negativo o cero', async () => {
      const dto = plainToInstance(CrearVentaDto, {
        id_sucursal: VALID_UUID_1,
        id_turno_caja: VALID_UUID_2,
        id_usuario: VALID_UUID_3,
        total: 10000,
        pagos: [{ id_metodo_pago: VALID_UUID_2, monto: -500 }],
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('pagos');
      expect(errors[0].children?.length).toBeGreaterThan(0);
    });
  });

  describe('3. CrearDevolucionDto y RegistrarAbonoDto (Módulo Cuentas Corrientes)', () => {
    it('debe rechazar una devolución con arreglo de items vacío (@ArrayMinSize(1))', async () => {
      const dto = plainToInstance(CrearDevolucionDto, {
        id_venta: VALID_UUID_1,
        id_turno_caja: VALID_UUID_2,
        tipo_devolucion: TipoDevolucion.EFECTIVO_CAJA,
        motivo: 'Error de compra',
        items: [],
      });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'items')).toBe(true);
    });

    it('debe validar un abono con idempotencia (O-22), método de pago (O-21) y versión OCC', async () => {
      const dto = plainToInstance(RegistrarAbonoDto, {
        id: VALID_UUID_1,
        id_cliente: VALID_UUID_2,
        id_turno_caja: VALID_UUID_3,
        monto: 12500,
        id_metodo_pago: VALID_UUID_1,
        metodo_pago: 'EFECTIVO',
        expected_version: 3,
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('4. ReconciliarCodigoHuerfanoDto y ResolverCuarentenaDto (Validación Condicional @ValidateIf)', () => {
    it('debe exigir nombre_oficial, id_categoria, precio_minorista y stock_fisico_actual cuando accion === CREAR_NUEVO', async () => {
      const dtoIncompleto = plainToInstance(ReconciliarCodigoHuerfanoDto, {
        id_sucursal: VALID_UUID_1,
        codigo_comodin: '7791234567890',
        accion: AccionReconciliacion.CREAR_NUEVO,
      });
      const errors = await validate(dtoIncompleto);
      const propsConError = errors.map((e) => e.property);
      expect(propsConError).toContain('nombre_oficial');
      expect(propsConError).toContain('id_categoria');
      expect(propsConError).toContain('precio_minorista');
      expect(propsConError).toContain('stock_fisico_actual');
    });

    it('debe exigir id_producto_existente cuando accion === VINCULAR_EXISTENTE sin pedir campos de creación', async () => {
      const dtoValidoVinculacion = plainToInstance(
        ReconciliarCodigoHuerfanoDto,
        {
          id_sucursal: VALID_UUID_1,
          nombre_comodin: 'Pan Casero Bolsa',
          accion: AccionReconciliacion.VINCULAR_EXISTENTE,
          id_producto_existente: VALID_UUID_2,
        },
      );
      const errors = await validate(dtoValidoVinculacion);
      expect(errors).toHaveLength(0);
    });

    it('debe prohibir resolver una alerta de cuarentena volviendo al estado PENDIENTE', async () => {
      const dtoInvalido = plainToInstance(ResolverCuarentenaDto, {
        id_alerta: VALID_UUID_1,
        estado_resolucion: EstadoCuarentena.PENDIENTE,
        observacion: 'Intento inválido',
      });
      const errors = await validate(dtoInvalido);
      expect(errors.some((e) => e.property === 'estado_resolucion')).toBe(true);
    });
  });

  describe('5. ConfirmarRecepcionDto y SyncPushDto (Módulos Proveedores y Sync)', () => {
    it('debe validar la confirmación de recepción con renglones anidados', async () => {
      const dto = plainToInstance(ConfirmarRecepcionDto, {
        id_recepcion: VALID_UUID_1,
        renglones: [
          {
            id_detalle: VALID_UUID_2,
            cantidad_recibida: 48,
            aplicar_precio_sugerido: true,
          },
        ],
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('debe exigir que last_pulled_at en SyncPushDto sea un string ISO-8601 UTC válido (Resolución O-25)', async () => {
      const dtoValido = plainToInstance(SyncPushDto, {
        sucursal_id: VALID_UUID_1,
        last_pulled_at: '2026-10-23T15:30:00.000Z',
        nodo_destino: 'CLOUD_CENTRAL',
        changes: { ventas: { created: [], updated: [], deleted: [] } },
      });
      expect(await validate(dtoValido)).toHaveLength(0);

      const dtoInvalido = plainToInstance(SyncPushDto, {
        sucursal_id: VALID_UUID_1,
        last_pulled_at: 'no-es-una-fecha-iso',
        changes: {},
      });
      const errors = await validate(dtoInvalido);
      expect(errors.some((e) => e.property === 'last_pulled_at')).toBe(true);
    });
  });
});
