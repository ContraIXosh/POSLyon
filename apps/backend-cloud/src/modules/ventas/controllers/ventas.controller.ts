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
import { CrearVentaDto, IAuditContext } from '@poslyon/domain-core';
import { AuditContext } from '../../../common/interceptors/audit-context.interceptor';
import { VentasService } from '../services/ventas.service';

@Controller('ventas')
export class VentasController {
  constructor(private readonly ventasService: VentasService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async crear(
    @Body() dto: CrearVentaDto,
    @AuditContext() auditCtx: IAuditContext,
  ) {
    return await this.ventasService.crearVenta(dto, auditCtx);
  }

  @Get(':id')
  async obtenerPorId(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return await this.ventasService.obtenerVentaPorId(id);
  }

  @Get()
  async listar(
    @Query('id_sucursal') idSucursal?: string,
    @Query('id_turno_caja') idTurnoCaja?: string,
    @Query('id_cliente') idCliente?: string,
  ) {
    return await this.ventasService.listarVentas({
      id_sucursal: idSucursal,
      id_turno_caja: idTurnoCaja,
      id_cliente: idCliente,
    });
  }
}
