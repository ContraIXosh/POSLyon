import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { IAuditContext } from '@poslyon/domain-core';
import { AuditContext } from '../../../common/interceptors/audit-context.interceptor';
import { CajaService } from '../services/caja.service';
import { AbrirTurnoDto } from '../dtos/abrir-turno.dto';
import { CerrarTurnoCiegoDto } from '../dtos/cerrar-turno-ciego.dto';
import { RectificarTurnoDto } from '../dtos/rectificar-turno.dto';
import { CrearMovimientoCajaDto } from '../dtos/crear-movimiento-caja.dto';

@Controller('caja')
export class CajaController {
  constructor(private readonly cajaService: CajaService) {}

  @Post('turnos/abrir')
  @HttpCode(HttpStatus.CREATED)
  async abrirTurno(
    @Body() dto: AbrirTurnoDto,
    @AuditContext() auditCtx: IAuditContext,
  ) {
    return await this.cajaService.abrirTurno(dto, auditCtx);
  }

  @Get('turnos/activo')
  async obtenerTurnoActivo(
    @Query('idUsuario') idUsuario: string,
    @Query('idSucursal') idSucursal: string,
  ) {
    return await this.cajaService.obtenerTurnoActivo(idUsuario, idSucursal);
  }

  @Get('turnos/:id')
  async obtenerTurnoPorId(@Param('id') id: string) {
    return await this.cajaService.obtenerTurnoPorId(id);
  }

  @Post('movimientos')
  @HttpCode(HttpStatus.CREATED)
  async registrarMovimiento(
    @Body() dto: CrearMovimientoCajaDto,
    @AuditContext() auditCtx: IAuditContext,
  ) {
    return await this.cajaService.registrarMovimiento(dto, auditCtx);
  }

  @Post('turnos/:id/cerrar-ciego')
  @HttpCode(HttpStatus.OK)
  async cerrarTurnoCiego(
    @Param('id') id: string,
    @Body() dto: CerrarTurnoCiegoDto,
    @AuditContext() auditCtx: IAuditContext,
  ) {
    return await this.cajaService.cerrarTurnoCiego(id, dto, auditCtx);
  }

  @Post('turnos/:id/rectificar')
  @HttpCode(HttpStatus.OK)
  async rectificarTurno(
    @Param('id') id: string,
    @Body() dto: RectificarTurnoDto,
    @AuditContext() auditCtx: IAuditContext,
  ) {
    return await this.cajaService.rectificarTurno(id, dto, auditCtx);
  }
}
