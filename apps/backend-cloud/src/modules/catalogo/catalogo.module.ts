import { Module } from '@nestjs/common';
import { CatalogoController } from './controllers/catalogo.controller';
import { CategoriasController } from './controllers/categorias.controller';
import { CatalogoService } from './services/catalogo.service';
import { CategoriasService } from './services/categorias.service';

@Module({
  controllers: [CatalogoController, CategoriasController],
  providers: [CatalogoService, CategoriasService],
  exports: [CatalogoService, CategoriasService],
})
export class CatalogoModule {}
