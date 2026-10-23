import { Module } from '@nestjs/common';
import { SucursalesController } from './controllers/sucursales.controller';
import { SucursalesService } from './services/sucursales.service';

@Module({
  controllers: [SucursalesController],
  providers: [SucursalesService],
  exports: [SucursalesService],
})
export class SucursalesModule {}
