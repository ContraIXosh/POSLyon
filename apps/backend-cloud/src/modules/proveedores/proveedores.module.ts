import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AuditoriaModule } from '../auditoria/auditoria.module';
import { ProveedoresService } from './services/proveedores.service';
import { ProveedoresController } from './controllers/proveedores.controller';

@Module({
  imports: [DatabaseModule, AuditoriaModule],
  controllers: [ProveedoresController],
  providers: [ProveedoresService],
  exports: [ProveedoresService],
})
export class ProveedoresModule {}
