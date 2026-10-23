import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { IAuditContext } from '@poslyon/domain-core';
import { AuditContext } from '../../../common/interceptors/audit-context.interceptor';
import { PermisosService } from '../services/permisos.service';
import { AsignarPermisosDto } from '../dtos/asignar-permisos.dto';
import {
  PermisosGuard,
  RequirePermissions,
} from '../guards/permisos.guard';

@Controller('permisos')
export class PermisosController {
  constructor(private readonly permisosService: PermisosService) {}

  @Get()
  async listarPermisos() {
    return await this.permisosService.listarPermisos();
  }

  @Post('asignar/:idUsuario')
  @HttpCode(HttpStatus.OK)
  async asignarPermisos(
    @Param('idUsuario') idUsuario: string,
    @Body() dto: AsignarPermisosDto,
    @AuditContext() auditCtx: IAuditContext,
  ) {
    return await this.permisosService.asignarPermisosAUsuario(
      idUsuario,
      dto,
      auditCtx,
    );
  }

  /**
   * Endpoint de laboratorio para verificar en Postman y tests unitarios
   * el funcionamiento del `PermisosGuard` y el Bypass Dueño (RF-20).
   */
  @Get('laboratorio-guard-rf20')
  @UseGuards(PermisosGuard)
  @RequirePermissions('VENTAS_COBRAR_DIRECTO')
  probarGuardBypassDueno() {
    return {
      status: 'AUTORIZADO_POR_PBAC',
      mensaje:
        'Acceso exitoso al módulo protegido por permiso VENTAS_COBRAR_DIRECTO (o Bypass Dueño RF-20).',
    };
  }
}
