import { Module } from '@nestjs/common';
import { CajaController } from './controllers/caja.controller';
import { MetodosPagoController } from './controllers/metodos-pago.controller';
import { CajaService } from './services/caja.service';
import { MetodosPagoService } from './services/metodos-pago.service';

@Module({
  controllers: [CajaController, MetodosPagoController],
  providers: [CajaService, MetodosPagoService],
  exports: [CajaService, MetodosPagoService],
})
export class CajaModule {}
