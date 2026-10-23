import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { IAuditContext } from '@poslyon/domain-core';
import { AuditContext } from '../../../common/interceptors/audit-context.interceptor';
import { SucursalesService } from '../services/sucursales.service';
import { CrearSucursalDto } from '../dtos/crear-sucursal.dto';
import { ActualizarSucursalDto } from '../dtos/actualizar-sucursal.dto';
import { ActualizarConfiguracionDto } from '../dtos/actualizar-configuracion.dto';

@Controller('sucursales')
export class SucursalesController {
  constructor(private readonly sucursalesService: SucursalesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async crear(
    @Body() dto: CrearSucursalDto,
    @AuditContext() auditCtx: IAuditContext,
  ) {
    return await this.sucursalesService.crearSucursal(dto, auditCtx);
  }

  @Get()
  async listar(@Query('incluirInactivas') incluir?: string) {
    return await this.sucursalesService.listarSucursales(incluir === 'true');
  }

  @Get(':id')
  async obtenerPorId(@Param('id') id: string) {
    return await this.sucursalesService.obtenerPorId(id);
  }

  @Put(':id')
  async actualizar(
    @Param('id') id: string,
    @Body() dto: ActualizarSucursalDto,
    @AuditContext() auditCtx: IAuditContext,
  ) {
    return await this.sucursalesService.actualizarSucursal(id, dto, auditCtx);
  }

  @Put(':id/configuracion')
  async actualizarConfiguracion(
    @Param('id') id: string,
    @Body() dto: ActualizarConfiguracionDto,
    @AuditContext() auditCtx: IAuditContext,
  ) {
    return await this.sucursalesService.actualizarConfiguracion(id, dto, auditCtx);
  }

  @Delete(':id')
  async eliminarLogico(
    @Param('id') id: string,
    @Query('version') version: string,
    @Query('motivo') motivo: string,
    @AuditContext() auditCtx: IAuditContext,
  ) {
    return await this.sucursalesService.eliminarSucursalLogico(
      id,
      Number(version || 1),
      motivo || 'Baja lógica de sucursal',
      auditCtx,
    );
  }
}
