import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AuditoriaModule } from '../auditoria/auditoria.module';
import { ReconciliacionService } from './services/reconciliacion.service';
import { CuarentenaService } from './services/cuarentena.service';
import { Transferencias2pcService } from './services/transferencias-2pc.service';
import { InventarioAvanzadoController } from './controllers/inventario-avanzado.controller';

@Module({
  imports: [DatabaseModule, AuditoriaModule],
  controllers: [InventarioAvanzadoController],
  providers: [
    ReconciliacionService,
    CuarentenaService,
    Transferencias2pcService,
  ],
  exports: [
    ReconciliacionService,
    CuarentenaService,
    Transferencias2pcService,
  ],
})
export class InventarioAvanzadoModule {}
