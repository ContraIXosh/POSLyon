import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './modules/health/health.module';
import { AuditoriaModule } from './modules/auditoria/auditoria.module';
import { SucursalesModule } from './modules/sucursales/sucursales.module';
import { UsuariosModule } from './modules/usuarios/usuarios.module';
import { CatalogoModule } from './modules/catalogo/catalogo.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    DatabaseModule,
    HealthModule,
    AuditoriaModule,
    SucursalesModule,
    UsuariosModule,
    CatalogoModule,
  ],
})
export class AppModule {}
