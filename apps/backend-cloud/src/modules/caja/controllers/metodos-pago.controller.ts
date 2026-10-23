import { Controller, Get } from '@nestjs/common';
import { MetodosPagoService } from '../services/metodos-pago.service';

@Controller('caja/metodos-pago')
export class MetodosPagoController {
  constructor(private readonly metodosPagoService: MetodosPagoService) {}

  @Get()
  async listar() {
    return await this.metodosPagoService.listarMetodosPago();
  }
}
