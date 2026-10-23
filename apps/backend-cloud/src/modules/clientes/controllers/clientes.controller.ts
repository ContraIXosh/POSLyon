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
  IAuditContext,
  RegistrarAbonoDto,
  SyncCuentaCorrienteDeltaDto,
} from '@poslyon/domain-core';
import { AuditContext } from '../../../common/interceptors/audit-context.interceptor';
import { ClientesService } from '../services/clientes.service';
import { CrearClienteDto } from '../dtos/crear-cliente.dto';
import { ActualizarClienteDto } from '../dtos/actualizar-cliente.dto';

@Controller('clientes')
export class ClientesController {
  constructor(private readonly clientesService: ClientesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async crear(
    @Body() dto: CrearClienteDto,
    @AuditContext() auditCtx: IAuditContext,
  ) {
    return await this.clientesService.crearCliente(dto, auditCtx);
  }

  @Get()
  async listar(@Query('id_sucursal') idSucursal?: string) {
    return await this.clientesService.listarClientes(idSucursal);
  }

  @Post('sync-delta')
  @HttpCode(HttpStatus.OK)
  async sincronizarDelta(
    @Body() dto: SyncCuentaCorrienteDeltaDto,
    @AuditContext() auditCtx: IAuditContext,
  ) {
    return await this.clientesService.sincronizarDeltaOffline(dto, auditCtx);
  }

  @Get(':id')
  async obtenerPorId(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return await this.clientesService.obtenerClientePorId(id);
  }

  @Put(':id')
  async actualizar(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: ActualizarClienteDto,
    @AuditContext() auditCtx: IAuditContext,
  ) {
    return await this.clientesService.actualizarCliente(id, dto, auditCtx);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async eliminar(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @AuditContext() auditCtx: IAuditContext,
  ) {
    return await this.clientesService.eliminarCliente(id, auditCtx);
  }

  @Get(':id/evaluar-credito')
  async evaluarMargen(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Query('monto') montoStr: string,
  ) {
    const monto = parseFloat(montoStr) || 0;
    return await this.clientesService.evaluarMargenCredito(id, monto);
  }

  @Post(':id/abonos')
  @HttpCode(HttpStatus.CREATED)
  async registrarAbono(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: RegistrarAbonoDto,
    @AuditContext() auditCtx: IAuditContext,
  ) {
    dto.id_cliente = id; // Asegura coherencia con la ruta URL
    return await this.clientesService.registrarAbono(dto, auditCtx);
  }

  @Get(':id/cuenta-corriente')
  async obtenerLibroMayor(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return await this.clientesService.obtenerLibroMayor(id);
  }
}
