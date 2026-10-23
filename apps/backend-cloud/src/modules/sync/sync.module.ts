import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AuditoriaModule } from '../auditoria/auditoria.module';
import { SyncService } from './services/sync.service';
import { SyncController } from './controllers/sync.controller';

@Module({
  imports: [DatabaseModule, AuditoriaModule],
  controllers: [SyncController],
  providers: [SyncService],
  exports: [SyncService],
})
export class SyncModule {}
