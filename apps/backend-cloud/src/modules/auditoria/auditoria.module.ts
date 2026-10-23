import { Global, Module } from '@nestjs/common';
import { AuditoriaController } from './controllers/auditoria.controller';
import { AuditoriaService } from './services/auditoria.service';

@Global()
@Module({
  controllers: [AuditoriaController],
  providers: [AuditoriaService],
  exports: [AuditoriaService],
})
export class AuditoriaModule {}
