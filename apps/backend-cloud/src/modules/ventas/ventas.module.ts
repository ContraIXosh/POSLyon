import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AuditoriaModule } from '../auditoria/auditoria.module';
import { VentasService } from './services/ventas.service';
import { PromocionesService } from './services/promociones.service';
import { VentasController } from './controllers/ventas.controller';
import { PromocionesController } from './controllers/promociones.controller';

@Module({
  imports: [DatabaseModule, AuditoriaModule],
  controllers: [VentasController, PromocionesController],
  providers: [VentasService, PromocionesService],
  exports: [VentasService, PromocionesService],
})
export class VentasModule {}
