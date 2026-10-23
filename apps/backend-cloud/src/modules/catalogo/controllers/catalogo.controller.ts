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
import {
  AjustarStockManualDto,
  IAuditContext,
} from '@poslyon/domain-core';
import { AuditContext } from '../../../common/interceptors/audit-context.interceptor';
import { CatalogoService } from '../services/catalogo.service';
import { CrearProductoDto } from '../dtos/crear-producto.dto';
import { ActualizarProductoDto } from '../dtos/actualizar-producto.dto';
import { ActualizarPreciosSucursalDto } from '../dtos/actualizar-precios-sucursal.dto';

@Controller('catalogo')
export class CatalogoController {
  constructor(private readonly catalogoService: CatalogoService) {}

  @Post('productos')
  @HttpCode(HttpStatus.CREATED)
  async crearProducto(
    @Body() dto: CrearProductoDto,
    @AuditContext() auditCtx: IAuditContext,
  ) {
    return await this.catalogoService.crearProducto(dto, auditCtx);
  }

  @Get('productos')
  async listarProductos(
    @Query('idCategoria') idCategoria?: string,
    @Query('incluirInactivos') incluirInactivos?: string,
  ) {
    return await this.catalogoService.listarProductos({
      idCategoria,
      incluirInactivos: incluirInactivos === 'true',
    });
  }

  @Get('codigo-barra/:codigo')
  async buscarPorCodigoBarra(
    @Param('codigo') codigo: string,
    @Query('idSucursal') idSucursal?: string,
  ) {
    return await this.catalogoService.buscarPorCodigoBarra(codigo, idSucursal);
  }

  @Put('productos/:id')
  async actualizarProducto(
    @Param('id') id: string,
    @Body() dto: ActualizarProductoDto,
    @AuditContext() auditCtx: IAuditContext,
  ) {
    return await this.catalogoService.actualizarProductoGlobal(id, dto, auditCtx);
  }

  @Put('productos/:id/precios/:idSucursal')
  async actualizarPrecios(
    @Param('id') id: string,
    @Param('idSucursal') idSucursal: string,
    @Body() dto: ActualizarPreciosSucursalDto,
    @AuditContext() auditCtx: IAuditContext,
  ) {
    return await this.catalogoService.actualizarPreciosSucursal(
      id,
      idSucursal,
      dto,
      auditCtx,
    );
  }

  @Post('ajustar-stock')
  @HttpCode(HttpStatus.OK)
  async ajustarStock(
    @Body() dto: AjustarStockManualDto,
    @AuditContext() auditCtx: IAuditContext,
  ) {
    return await this.catalogoService.ajustarStockManual(dto, auditCtx);
  }

  @Delete('productos/:id')
  async eliminarLogico(
    @Param('id') id: string,
    @Query('version') version: string,
    @Query('motivo') motivo: string,
    @AuditContext() auditCtx: IAuditContext,
  ) {
    return await this.catalogoService.eliminarLogico(
      id,
      Number(version || 1),
      motivo || 'Baja lógica de producto en catálogo',
      auditCtx,
    );
  }
}
