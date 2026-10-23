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
import { AplicarPromocionDto, IAuditContext } from '@poslyon/domain-core';
import { AuditContext } from '../../../common/interceptors/audit-context.interceptor';
import { PromocionesService } from '../services/promociones.service';
import { CrearPromocionDto } from '../dtos/crear-promocion.dto';

@Controller('promociones')
export class PromocionesController {
  constructor(private readonly promocionesService: PromocionesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async crear(
    @Body() dto: CrearPromocionDto,
    @AuditContext() auditCtx: IAuditContext,
  ) {
    return await this.promocionesService.crearPromocion(dto, auditCtx);
  }

  @Get()
  async listar(@Query('id_sucursal', new ParseUUIDPipe({ version: '4' })) idSucursal: string) {
    return await this.promocionesService.listarPromociones(idSucursal);
  }

  @Post('evaluar')
  @HttpCode(HttpStatus.OK)
  async evaluarCarrito(@Body() dto: AplicarPromocionDto) {
    return await this.promocionesService.evaluarCarrito(dto);
  }
}
