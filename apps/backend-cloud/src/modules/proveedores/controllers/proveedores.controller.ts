import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  AgregarRenglonRecepcionDto,
  ConfirmarRecepcionDto,
  CrearRecepcionDto,
  IAuditContext,
  VincularDiccionarioDto,
} from '@poslyon/domain-core';
import { AuditContext } from '../../../common/interceptors/audit-context.interceptor';
import { ProveedoresService } from '../services/proveedores.service';
import { CrearProveedorDto } from '../dtos/crear-proveedor.dto';
import { ActualizarProveedorDto } from '../dtos/actualizar-proveedor.dto';

@Controller('proveedores')
export class ProveedoresController {
  constructor(private readonly proveedoresService: ProveedoresService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async crear(
    @Body() dto: CrearProveedorDto,
    @AuditContext() auditCtx: IAuditContext,
  ) {
    return await this.proveedoresService.crearProveedor(dto, auditCtx);
  }

  @Get()
  async listar() {
    return await this.proveedoresService.listarProveedores();
  }

  @Post('diccionario')
  @HttpCode(HttpStatus.CREATED)
  async vincularDiccionario(
    @Body() dto: VincularDiccionarioDto,
    @AuditContext() auditCtx: IAuditContext,
  ) {
    return await this.proveedoresService.vincularDiccionario(dto, auditCtx);
  }

  @Post('recepciones')
  @HttpCode(HttpStatus.CREATED)
  async iniciarRecepcion(
    @Body() dto: CrearRecepcionDto,
    @AuditContext() auditCtx: IAuditContext,
  ) {
    return await this.proveedoresService.iniciarRecepcion(dto, auditCtx);
  }

  @Get('recepciones/:id')
  async obtenerRecepcion(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return await this.proveedoresService.obtenerRecepcionPorId(id);
  }

  @Post('recepciones/:id/renglones')
  @HttpCode(HttpStatus.CREATED)
  async agregarRenglon(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: AgregarRenglonRecepcionDto,
    @AuditContext() auditCtx: IAuditContext,
  ) {
    dto.id_recepcion_mercaderia = id;
    return await this.proveedoresService.agregarRenglonRecepcion(id, dto, auditCtx);
  }

  @Post('recepciones/:id/confirmar')
  @HttpCode(HttpStatus.OK)
  async confirmarRecepcion(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: ConfirmarRecepcionDto,
    @AuditContext() auditCtx: IAuditContext,
  ) {
    dto.id_recepcion = id;
    return await this.proveedoresService.confirmarRecepcion(id, dto, auditCtx);
  }

  @Get(':id/diccionario/consultar')
  async consultarAlias(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Query('nombre_factura') nombreFactura: string,
  ) {
    return await this.proveedoresService.consultarAliasDiccionario(id, nombreFactura || '');
  }

  @Get(':id')
  async obtenerPorId(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return await this.proveedoresService.obtenerProveedorPorId(id);
  }

  @Put(':id')
  async actualizar(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: ActualizarProveedorDto,
    @AuditContext() auditCtx: IAuditContext,
  ) {
    return await this.proveedoresService.actualizarProveedor(id, dto, auditCtx);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async eliminar(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @AuditContext() auditCtx: IAuditContext,
  ) {
    return await this.proveedoresService.eliminarProveedor(id, auditCtx);
  }
}
