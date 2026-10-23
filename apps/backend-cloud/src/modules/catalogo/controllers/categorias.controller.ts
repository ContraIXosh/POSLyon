import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { IAuditContext } from '@poslyon/domain-core';
import { AuditContext } from '../../../common/interceptors/audit-context.interceptor';
import { CategoriasService } from '../services/categorias.service';
import { CrearCategoriaDto } from '../dtos/crear-categoria.dto';

@Controller('catalogo/categorias')
export class CategoriasController {
  constructor(private readonly categoriasService: CategoriasService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async crear(
    @Body() dto: CrearCategoriaDto,
    @AuditContext() auditCtx: IAuditContext,
  ) {
    return await this.categoriasService.crearCategoria(dto, auditCtx);
  }

  @Get()
  async listar() {
    return await this.categoriasService.listarCategorias();
  }
}
