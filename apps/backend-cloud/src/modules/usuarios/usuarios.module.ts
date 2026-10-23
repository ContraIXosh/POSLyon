import { Global, Module } from '@nestjs/common';
import { UsuariosController } from './controllers/usuarios.controller';
import { PermisosController } from './controllers/permisos.controller';
import { UsuariosService } from './services/usuarios.service';
import { PermisosService } from './services/permisos.service';
import { PermisosGuard } from './guards/permisos.guard';

@Global()
@Module({
  controllers: [UsuariosController, PermisosController],
  providers: [UsuariosService, PermisosService, PermisosGuard],
  exports: [UsuariosService, PermisosService, PermisosGuard],
})
export class UsuariosModule {}
