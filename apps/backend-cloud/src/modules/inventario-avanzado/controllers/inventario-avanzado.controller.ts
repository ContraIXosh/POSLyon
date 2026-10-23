import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ReconciliarCodigoHuerfanoDto,
  ResolverCuarentenaDto,
  AjustarStockManualDto,
  IAuditContext,
} from '@poslyon/domain-core';
import { AuditContext } from '../../../common/interceptors/audit-context.interceptor';
import { ReconciliacionService } from '../services/reconciliacion.service';
import { CuarentenaService } from '../services/cuarentena.service';
import { Transferencias2pcService } from '../services/transferencias-2pc.service';
import { CrearAlertaCuarentenaDto } from '../dtos/crear-alerta-cuarentena.dto';
import { CrearTransferenciaDto } from '../dtos/crear-transferencia.dto';
import { DespacharTransferenciaDto } from '../dtos/despachar-transferencia.dto';
import { RecibirTransferenciaDto } from '../dtos/recibir-transferencia.dto';
import { CancelarTransferenciaDto } from '../dtos/cancelar-transferencia.dto';

@Controller('inventario')
export class InventarioAvanzadoController {
  constructor(
    private readonly reconciliacionService: ReconciliacionService,
    private readonly cuarentenaService: CuarentenaService,
    private readonly transferenciasService: Transferencias2pcService,
  ) {}

  @Get('huerfanos')
  async obtenerHuerfanos(
    @Query('id_sucursal', new ParseUUIDPipe({ version: '4' }))
    idSucursal: string,
  ) {
    return await this.reconciliacionService.obtenerCodigosHuerfanos(idSucursal);
  }

  @Post('reconciliar')
  @HttpCode(HttpStatus.OK)
  async reconciliar(
    @Body() dto: ReconciliarCodigoHuerfanoDto,
    @AuditContext() auditCtx: IAuditContext,
  ) {
    return await this.reconciliacionService.reconciliarCodigoHuerfano(
      dto,
      auditCtx,
    );
  }

  @Post('cuarentena')
  @HttpCode(HttpStatus.CREATED)
  async crearAlerta(
    @Body() dto: CrearAlertaCuarentenaDto,
    @AuditContext() auditCtx: IAuditContext,
  ) {
    return await this.cuarentenaService.crearAlerta(dto, auditCtx);
  }

  @Patch('cuarentena/resolver')
  @HttpCode(HttpStatus.OK)
  async resolverCuarentena(
    @Body() dto: ResolverCuarentenaDto,
    @AuditContext() auditCtx: IAuditContext,
  ) {
    return await this.cuarentenaService.resolverCuarentena(dto, auditCtx);
  }

  @Post('stock/ajuste-manual')
  @HttpCode(HttpStatus.OK)
  async ajusteStockManual(
    @Body() dto: AjustarStockManualDto,
    @AuditContext() auditCtx: IAuditContext,
  ) {
    return await this.cuarentenaService.ajustarStockManual(dto, auditCtx);
  }

  @Post('transferencias')
  @HttpCode(HttpStatus.CREATED)
  async crearTransferencia(
    @Body() dto: CrearTransferenciaDto,
    @AuditContext() auditCtx: IAuditContext,
  ) {
    return await this.transferenciasService.crear(dto, auditCtx);
  }

  @Post('transferencias/:id/despachar')
  @HttpCode(HttpStatus.OK)
  async despacharTransferencia(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: DespacharTransferenciaDto,
    @AuditContext() auditCtx: IAuditContext,
  ) {
    return await this.transferenciasService.despachar(id, dto, auditCtx);
  }

  @Post('transferencias/:id/recibir')
  @HttpCode(HttpStatus.OK)
  async recibirTransferencia(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: RecibirTransferenciaDto,
    @AuditContext() auditCtx: IAuditContext,
  ) {
    return await this.transferenciasService.recibir(id, dto, auditCtx);
  }

  @Post('transferencias/:id/cancelar')
  @HttpCode(HttpStatus.OK)
  async cancelarTransferencia(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: CancelarTransferenciaDto,
    @AuditContext() auditCtx: IAuditContext,
  ) {
    return await this.transferenciasService.cancelar(id, dto, auditCtx);
  }
}
