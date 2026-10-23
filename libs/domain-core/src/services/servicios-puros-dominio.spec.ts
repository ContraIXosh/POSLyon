import { EstadoCuarentena } from '../enums/estado-cuarentena.enum';
import { EstadoDiscrepanciaItem } from '../enums/estado-discrepancia-item.enum';
import { EstadoFinanciero } from '../enums/estado-financiero.enum';
import { EstadoLogistico } from '../enums/estado-logistico.enum';
import { MotivoDevolucion } from '../enums/motivo-devolucion.enum';
import { TipoDevolucion } from '../enums/tipo-devolucion.enum';
import { TipoDiscrepanciaPrecio } from '../enums/tipo-discrepancia-precio.enum';
import {
  calcularDescuentoStockPack,
  calcularStockVirtualPack,
  validarDisponibilidadParaVenta,
  validarPuedeCobrar,
} from '../rules/guardas-venta-y-stock.rule';
import {
  calcularMergeAditivoOCC,
  validarMargenCredito,
} from '../rules/validar-margen-credito.rule';
import { DevolucionesDomainService } from './devoluciones.domain-service';
import { MargenPreciosDomainService } from './margen-precios.domain-service';
import { ReconciliacionDomainService } from './reconciliacion.domain-service';
import {
  ArqueoCiegoDomainService,
  RelojMonotonoGuard,
} from './reloj-y-arqueo.domain-service';

describe('Paso 0.5 — Suite Nivel 1: Servicios Puros y Reglas Matemáticas de Dominio', () => {
  describe('Test 1.1: MargenPreciosDomainService — Preservación Exacta del Margen Histórico (RF-15)', () => {
    it('debe calcular el precio de venta sugerido manteniendo un 50% de margen histórico', () => {
      const costoAnterior = 1000;
      const precioVentaAnterior = 1500; // Markup = (1500 - 1000) / 1000 = 0.50 (50%)
      const costoNuevo = 1400;

      const resultado = MargenPreciosDomainService.calcular(
        costoAnterior,
        precioVentaAnterior,
        costoNuevo,
      );

      expect(resultado.markup_porcentual).toBe(50);
      expect(resultado.precio_minorista_sugerido).toBe(2100); // 1400 * 1.50 = 2100
      expect(resultado.diferencia_costo).toBe(400);
      expect(resultado.variacion_costo_porcentual).toBe(40);
    });

    it('debe aplicar el margen por defecto (30%) cuando costo_anterior es 0 (primer ingreso)', () => {
      const resultado = MargenPreciosDomainService.calcular(0, 0, 1000);
      expect(resultado.markup_porcentual).toBe(30);
      expect(resultado.precio_minorista_sugerido).toBe(1300);
    });

    it('debe clasificar correctamente FALTANTE, SOBRANTE, CONFORME y RECHAZADO_CALIDAD en remitos (O-17)', () => {
      expect(
        MargenPreciosDomainService.evaluarDiscrepanciaRecepcion(50, 48),
      ).toBe(EstadoDiscrepanciaItem.FALTANTE);
      expect(
        MargenPreciosDomainService.evaluarDiscrepanciaRecepcion(50, 52),
      ).toBe(EstadoDiscrepanciaItem.SOBRANTE);
      expect(
        MargenPreciosDomainService.evaluarDiscrepanciaRecepcion(50, 50),
      ).toBe(EstadoDiscrepanciaItem.CONFORME);
      expect(
        MargenPreciosDomainService.evaluarDiscrepanciaRecepcion(50, 50, true),
      ).toBe(EstadoDiscrepanciaItem.RECHAZADO_CALIDAD);
    });
  });

  describe('Tests 1.2, 1.2b y 1.2c: DevolucionesDomainService — Reembolso Neto Promocional y Compensación Mixta (RF-09, RF-10)', () => {
    it('Test 1.2: debe arrojar excepción si el saldo deudor es inferior al monto a devolver en REDUCCION_DEUDA (C-01 / C-02)', () => {
      expect(() =>
        DevolucionesDomainService.calcularCompensacionFinanciera({
          tipo_devolucion_solicitado: TipoDevolucion.REDUCCION_DEUDA,
          monto_total_devolucion: 12000,
          estado_financiero_venta: EstadoFinanciero.FIADO,
          id_cliente: '550e8400-e29b-41d4-a716-446655440000',
          saldo_deudor_cliente: 5000,
        }),
      ).toThrow(/Saldo deudor insuficiente.*Reembolso forzado en EFECTIVO_CAJA/);
    });

    it('Test 1.2b: debe amortizar deuda previa a $0 y emitir egreso en caja por el saldo remanente en Compensación Mixta RF-10 (C-03)', () => {
      const resultado =
        DevolucionesDomainService.calcularCompensacionFinanciera({
          tipo_devolucion_solicitado: TipoDevolucion.EFECTIVO_CAJA,
          monto_total_devolucion: 5000,
          estado_financiero_venta: EstadoFinanciero.PAGADO,
          id_cliente: '550e8400-e29b-41d4-a716-446655440000',
          saldo_deudor_cliente: 1000,
        });

      expect(resultado.monto_compensado_deuda).toBe(1000);
      expect(resultado.nuevo_saldo_deudor_cliente).toBe(0);
      expect(resultado.monto_egreso_efectivo_caja).toBe(4000);
    });

    it('Test 1.2c: debe deducir el descuento proporcional y calcular el reembolso efectivo evitando sobrepagos (RF-09 / C-04)', () => {
      // Venta original: 2 Coca-Colas a $1500 (lista), con $500 de descuento total
      const resultado = DevolucionesDomainService.calcularReembolsoNetoItem({
        cantidad_original: 2,
        precio_unitario_momento: 1500,
        monto_descuento_total_original: 500,
        cantidad_a_devolver: 1,
      });

      expect(resultado.descuento_unitario_prorrateado).toBe(250);
      expect(resultado.monto_descuento_devuelto).toBe(250);
      expect(resultado.subtotal_reembolso_neto).toBe(1250); // Evita reembolsar los $1500 de lista
    });

    it('debe bloquear el intento de doble devolución superando la cantidad neta disponible (Resolución O-19)', () => {
      expect(() =>
        DevolucionesDomainService.calcularReembolsoNetoItem({
          cantidad_original: 3,
          precio_unitario_momento: 1000,
          monto_descuento_total_original: 0,
          cantidad_previa_devuelta: 2,
          cantidad_a_devolver: 2, // Solo queda 1 unidad disponible
        }),
      ).toThrow(/supera la cantidad neta disponible/);
    });

    it('debe condicionar el reingreso a stock vendible según el motivo y generar correlativo NC (Resoluciones S-08 y S-09)', () => {
      expect(
        DevolucionesDomainService.esReintegrableAInventarioVendible(
          MotivoDevolucion.ERROR_COMPRA,
        ),
      ).toBe(true);
      expect(
        DevolucionesDomainService.esReintegrableAInventarioVendible(
          MotivoDevolucion.DEFECTO_FABRICA,
        ),
      ).toBe(false);
      expect(
        DevolucionesDomainService.esReintegrableAInventarioVendible(
          MotivoDevolucion.VENCIMIENTO,
        ),
      ).toBe(false);

      expect(
        DevolucionesDomainService.generarNumeroComprobanteNC('suc01', 42),
      ).toBe('NC-SUC01-00000042');
    });

    it('debe exigir confirmar_sin_dinero = true cuando la venta original está en PENDIENTE y permitir REDUCCION_DEUDA cuando el saldo alcanza (O-15)', () => {
      expect(() =>
        DevolucionesDomainService.calcularCompensacionFinanciera({
          tipo_devolucion_solicitado: TipoDevolucion.EFECTIVO_CAJA,
          monto_total_devolucion: 3000,
          estado_financiero_venta: EstadoFinanciero.PENDIENTE,
          confirmar_sin_dinero: false,
        }),
      ).toThrow(/ADVERTENCIA_VENTA_PENDIENTE/);

      const pendienteConfirmada =
        DevolucionesDomainService.calcularCompensacionFinanciera({
          tipo_devolucion_solicitado: TipoDevolucion.EFECTIVO_CAJA,
          monto_total_devolucion: 3000,
          estado_financiero_venta: EstadoFinanciero.PENDIENTE,
          confirmar_sin_dinero: true,
        });
      expect(pendienteConfirmada.tipo_devolucion_efectivo).toBe(
        TipoDevolucion.SIN_REINTEGRO_MONETARIO,
      );
      expect(pendienteConfirmada.monto_egreso_efectivo_caja).toBe(0);

      const reduccionValida =
        DevolucionesDomainService.calcularCompensacionFinanciera({
          tipo_devolucion_solicitado: TipoDevolucion.REDUCCION_DEUDA,
          monto_total_devolucion: 4000,
          estado_financiero_venta: EstadoFinanciero.FIADO,
          id_cliente: '550e8400-e29b-41d4-a716-446655440000',
          saldo_deudor_cliente: 10000,
        });
      expect(reduccionValida.monto_compensado_deuda).toBe(4000);
      expect(reduccionValida.nuevo_saldo_deudor_cliente).toBe(6000);
    });
  });

  describe('Test 1.3: ReconciliacionDomainService — Deducción Matemática de Stock y Doble Nivel de Mermas (RF-13, C-18, C-21, C-23, O-27)', () => {
    it('Test 1.3: debe calcular stock inicial de modo que al restar ventas históricas quede el conteo en góndola (C-18)', () => {
      const conteoRealEnGondola = 15;
      const ventasHistoricasHuerfanas = 6;

      const resultado =
        ReconciliacionDomainService.calcularStockInicialReconciliacion(
          conteoRealEnGondola,
          ventasHistoricasHuerfanas,
        );

      expect(resultado.stock_inicial_calculado).toBe(21);
      expect(resultado.stock_final_post_deduccion).toBe(conteoRealEnGondola);
    });

    it('debe calcular discrepancias por renglón y consolidar el balance neto por Turno de Caja (Resolución C-21 / Escenario 6)', () => {
      const balanceMap = ReconciliacionDomainService.consolidarBalancesPorTurno(
        [
          { id_turno: 'turno-1', precio_unitario: 1200, cantidad: 4 }, // Oficial 1300 -> -$100 x 4 = -$400 (Merma)
          { id_turno: 'turno-1', precio_unitario: 1400, cantidad: 1 }, // Oficial 1300 -> +$100 x 1 = +$100 (Sobrante)
        ],
        1300,
      );

      const balanceTurno1 = balanceMap.get('turno-1')!;
      expect(balanceTurno1).toBeDefined();
      expect(balanceTurno1.merma_acumulada).toBe(-400);
      expect(balanceTurno1.sobrante_acumulado).toBe(100);
      expect(balanceTurno1.balance_neto).toBe(-300);

      const evalExacto =
        ReconciliacionDomainService.evaluarDiscrepanciaPrecioRenglon(
          1300,
          1300,
          5,
        );
      expect(evalExacto.tipo_discrepancia).toBe(
        TipoDiscrepanciaPrecio.PRECIO_EXACTO,
      );
    });

    it('debe generar la clave canónica de agrupamiento para comodines con y sin código de barras (Resolución O-27)', () => {
      expect(
        ReconciliacionDomainService.generarClaveAgrupamientoHuerfano(
          '7791234567890',
          'Galletitas',
        ),
      ).toBe('7791234567890');
      expect(
        ReconciliacionDomainService.generarClaveAgrupamientoHuerfano(
          null,
          '  Pan Casero Kg ',
        ),
      ).toBe('SIN_CODIGO:pan casero kg');
    });

    it('debe aplicar deducción proporcional no destructiva al resolver Cuarentena de Stock (Resolución C-23)', () => {
      expect(
        ReconciliacionDomainService.calcularStockPostCuarentena(
          10,
          2,
          EstadoCuarentena.MERMA_CONFIRMADA,
        ),
      ).toBe(8);
      expect(
        ReconciliacionDomainService.calcularStockPostCuarentena(
          10,
          2,
          EstadoCuarentena.FALSA_ALARMA,
        ),
      ).toBe(10);
    });
  });

  describe('4. Guardas de Venta, Packs, Límite de Crédito y Merge Aditivo OCC (C-10, C-11, C-12, O-26)', () => {
    it('debe bloquear el cobro única e incondicionalmente en estado logístico INCOMPLETO (C-11) y permitir stock negativo en mostrador (C-12)', () => {
      expect(validarPuedeCobrar(EstadoLogistico.INCOMPLETO)).toBe(false);
      expect(validarPuedeCobrar(EstadoLogistico.LISTO_PARA_COBRAR)).toBe(true);
      expect(validarDisponibilidadParaVenta(-15, 5)).toBe(true);
    });

    it('debe descontar recursivamente sobre el producto base al vender Packs y calcular stock virtual (O-26)', () => {
      const packRes = calcularDescuentoStockPack({
        id_producto: 'uuid-pack-x6',
        cantidad_vendida: 2,
        id_producto_base: 'uuid-lata-individual',
        multiplicador_stock: 6,
      });

      expect(packRes.es_pack).toBe(true);
      expect(packRes.id_producto_objetivo).toBe('uuid-lata-individual');
      expect(packRes.cantidad_total_a_descontar).toBe(12);
      expect(calcularStockVirtualPack(59, 6)).toBe(9);
    });

    it('debe evaluar margen de crédito sobre el delta fiado y aplicar Merge Aditivo OCC detectando sobregiro post-sync (RF-07 / C-10)', () => {
      const validacion = validarMargenCredito(30000, 100000, 50000);
      expect(validacion.aprobado).toBe(true);
      expect(validacion.nuevo_saldo_proyectado).toBe(80000);

      const validacionRechazada = validarMargenCredito(80000, 100000, 35000);
      expect(validacionRechazada.aprobado).toBe(false);
      expect(validacionRechazada.disponible).toBe(20000);
      expect(validacionRechazada.exceso).toBe(15000);

      // En la nube el límite bajó a $40.000; entra el delta offline de $50.000 sobre saldo $30.000
      const merge = calcularMergeAditivoOCC(30000, 40000, 50000);
      expect(merge.nuevo_saldo_consolidado).toBe(80000);
      expect(merge.excede_limite_remoto).toBe(true);
      expect(merge.exceso).toBe(40000);
      expect(merge.requiere_auditoria_exceso).toBe(true);
    });
  });

  describe('5. RelojMonotonoGuard (S-10) y ArqueoCiegoDomainService (RF-17 / O-23)', () => {
    it('debe detectar manipulación regresiva del reloj (Clock Skew) y congelar en High Watermark + 1s (Resolución S-10)', () => {
      const tInicialReal = Date.parse('2026-10-23T12:00:00.000Z');
      const guard = new RelojMonotonoGuard({
        tiempoInicialRealMs: tInicialReal,
        tiempoInicialMonotonoMs: 1000,
        highWatermarkInicialIso: '2026-10-23T14:00:00.000Z', // En SQLite ya existen ventas de las 14:00
      });

      const evaluacion = guard.obtenerTiempoConfiable(2000); // Solo avanzó 1s desde las 12:00 (< 14:00)
      expect(evaluacion.desfaseRegresivoDetectado).toBe(true);
      expect(evaluacion.isoConfiable).toBe('2026-10-23T14:00:01.000Z');
    });

    it('debe avanzar normalmente cuando el reloj es monótono y calcular expiración por ventana deslizante (C-13, C-14)', () => {
      const tBase = Date.parse('2026-10-23T15:00:00.000Z');
      const guard = new RelojMonotonoGuard({
        tiempoInicialRealMs: tBase,
        tiempoInicialMonotonoMs: 0,
        highWatermarkInicialIso: '2026-10-23T14:00:00.000Z',
      });

      guard.sincronizarHorarioServidor(tBase, 0);
      guard.registrarHighWatermarkBaseDatos('2026-10-23T15:00:00.000Z');

      const normal = guard.obtenerTiempoConfiable(60000); // +1 minuto
      expect(normal.desfaseRegresivoDetectado).toBe(false);
      expect(normal.isoConfiable).toBe('2026-10-23T15:01:00.000Z');

      const expiracionIso = guard.calcularNuevaExpiracionCarrito(30, 60000); // +30 minutos desde 15:01
      expect(expiracionIso).toBe('2026-10-23T15:31:00.000Z');
      expect(guard.obtenerHighWatermarkActual()).toBe(
        '2026-10-23T15:01:00.000Z',
      );
    });

    it('debe calcular la fórmula canónica completa de Arqueo Ciego y clasificar el cuadre (RF-17 / O-23)', () => {
      const arqueo = ArqueoCiegoDomainService.calcularArqueoTurno({
        monto_inicial_efectivo: 20000,
        ventas_efectivo: 150000,
        abonos_efectivo: 30000,
        ingresos_manuales_efectivo: 5000,
        devoluciones_efectivo: 10000,
        sangrias_retiros_efectivo: 50000,
        pagos_proveedores_efectivo: 25000,
        efectivo_declarado_ciego: 118000, // Esperado = 20k + 150k + 30k + 5k - 10k - 50k - 25k = 120.000
      });

      expect(arqueo.efectivo_esperado_sistema).toBe(120000);
      expect(arqueo.diferencia_caja).toBe(-2000);
      expect(arqueo.estado_cuadre).toBe('FALTANTE');

      const arqueoSobrante = ArqueoCiegoDomainService.calcularArqueoTurno({
        monto_inicial_efectivo: 10000,
        ventas_efectivo: 50000,
        abonos_efectivo: 0,
        ingresos_manuales_efectivo: 0,
        devoluciones_efectivo: 0,
        sangrias_retiros_efectivo: 0,
        pagos_proveedores_efectivo: 0,
        efectivo_declarado_ciego: 61500,
      });
      expect(arqueoSobrante.estado_cuadre).toBe('SOBRANTE');
    });
  });
});
