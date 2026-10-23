import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AuditoriaModule } from '../auditoria/auditoria.module';
import { ClientesService } from './services/clientes.service';
import { ClientesController } from './controllers/clientes.controller';

@Module({
  imports: [DatabaseModule, AuditoriaModule],
  controllers: [ClientesController],
  providers: [ClientesService],
  exports: [ClientesService],
})
export class ClientesModule {}
