import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AuditoriaModule } from '../auditoria/auditoria.module';
import { DevolucionesService } from './services/devoluciones.service';
import { DevolucionesController } from './controllers/devoluciones.controller';

@Module({
  imports: [DatabaseModule, AuditoriaModule],
  controllers: [DevolucionesController],
  providers: [DevolucionesService],
  exports: [DevolucionesService],
})
export class DevolucionesModule {}
