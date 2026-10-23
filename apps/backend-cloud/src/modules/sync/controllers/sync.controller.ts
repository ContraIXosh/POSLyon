import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  SyncPushDto,
  SyncPullQueryDto,
  SyncCuentaCorrienteDeltaDto,
  IAuditContext,
} from '@poslyon/domain-core';
import { AuditContext } from '../../../common/interceptors/audit-context.interceptor';
import { SyncService } from '../services/sync.service';

@Controller('sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post('push')
  @HttpCode(HttpStatus.OK)
  async push(
    @Body() dto: SyncPushDto,
    @AuditContext() auditCtx: IAuditContext,
  ) {
    return await this.syncService.procesarPush(dto, auditCtx);
  }

  @Get('pull')
  @HttpCode(HttpStatus.OK)
  async pull(@Query() query: SyncPullQueryDto) {
    return await this.syncService.procesarPull(query);
  }

  @Post('cuenta-corriente-delta')
  @HttpCode(HttpStatus.OK)
  async cuentaCorrienteDelta(
    @Body() delta: SyncCuentaCorrienteDeltaDto,
    @AuditContext() auditCtx: IAuditContext,
  ) {
    return await this.syncService.aplicarDeltaCuentaCorriente(delta, auditCtx);
  }
}
