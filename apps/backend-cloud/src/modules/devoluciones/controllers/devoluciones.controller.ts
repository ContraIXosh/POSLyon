import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { CrearDevolucionDto, IAuditContext } from '@poslyon/domain-core';
import { AuditContext } from '../../../common/interceptors/audit-context.interceptor';
import { DevolucionesService } from '../services/devoluciones.service';

@Controller('devoluciones')
export class DevolucionesController {
  constructor(private readonly devolucionesService: DevolucionesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async crear(
    @Body() dto: CrearDevolucionDto,
    @AuditContext() auditCtx: IAuditContext,
  ) {
    return await this.devolucionesService.procesarDevolucion(dto, auditCtx);
  }

  @Get(':id')
  async obtenerPorId(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return await this.devolucionesService.obtenerNotaCreditoPorId(id);
  }

  @Get()
  async listar(
    @Query('id_venta') idVenta?: string,
    @Query('id_turno_caja') idTurnoCaja?: string,
  ) {
    return await this.devolucionesService.listarNotasCredito(idVenta, idTurnoCaja);
  }
}
