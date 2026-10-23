import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './modules/health/health.module';
import { AuditoriaModule } from './modules/auditoria/auditoria.module';
import { SucursalesModule } from './modules/sucursales/sucursales.module';
import { UsuariosModule } from './modules/usuarios/usuarios.module';
import { CatalogoModule } from './modules/catalogo/catalogo.module';
import { CajaModule } from './modules/caja/caja.module';
import { ClientesModule } from './modules/clientes/clientes.module';
import { ProveedoresModule } from './modules/proveedores/proveedores.module';
import { VentasModule } from './modules/ventas/ventas.module';
import { DevolucionesModule } from './modules/devoluciones/devoluciones.module';
import { InventarioAvanzadoModule } from './modules/inventario-avanzado/inventario-avanzado.module';
import { SyncModule } from './modules/sync/sync.module';

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
    CajaModule,
    ClientesModule,
    ProveedoresModule,
    VentasModule,
    DevolucionesModule,
    InventarioAvanzadoModule,
    SyncModule,
  ],
})
export class AppModule {}
