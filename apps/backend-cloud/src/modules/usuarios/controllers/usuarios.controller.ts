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
import { UsuariosService } from '../services/usuarios.service';
import { CrearUsuarioDto } from '../dtos/crear-usuario.dto';
import { ActualizarUsuarioDto } from '../dtos/actualizar-usuario.dto';
import { AsignarSucursalDto } from '../dtos/asignar-sucursal.dto';

@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async crear(
    @Body() dto: CrearUsuarioDto,
    @AuditContext() auditCtx: IAuditContext,
  ) {
    return await this.usuariosService.crearUsuario(dto, auditCtx);
  }

  @Get()
  async listar(@Query('incluirInactivos') incluir?: string) {
    return await this.usuariosService.listarUsuarios(incluir === 'true');
  }

  @Get(':id')
  async obtenerPorId(@Param('id') id: string) {
    return await this.usuariosService.obtenerPorId(id);
  }

  @Put(':id')
  async actualizar(
    @Param('id') id: string,
    @Body() dto: ActualizarUsuarioDto,
    @AuditContext() auditCtx: IAuditContext,
  ) {
    return await this.usuariosService.actualizarUsuario(id, dto, auditCtx);
  }

  @Post(':id/sucursales')
  async asignarSucursal(
    @Param('id') id: string,
    @Body() dto: AsignarSucursalDto,
    @AuditContext() auditCtx: IAuditContext,
  ) {
    return await this.usuariosService.asignarSucursal(id, dto, auditCtx);
  }

  @Delete(':id')
  async eliminarLogico(
    @Param('id') id: string,
    @Query('version') version: string,
    @Query('motivo') motivo: string,
    @AuditContext() auditCtx: IAuditContext,
  ) {
    return await this.usuariosService.eliminarUsuarioLogico(
      id,
      Number(version || 1),
      motivo || 'Baja lógica de usuario',
      auditCtx,
    );
  }
}
