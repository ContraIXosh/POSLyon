import {
  Body,
  ConflictException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
  Param,
  Post,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import {
  AccionAuditoria,
  IAuditContext,
  RegistrarAuditoriaDto,
} from '@poslyon/domain-core';
import {
  AuditContext,
  AuditContextInterceptor,
} from '../../../common/interceptors/audit-context.interceptor';
import { AuditoriaService } from '../services/auditoria.service';

export interface SimularTransaccionDto {
  id_registro: string;
  tabla?: string;
  precio_anterior: number;
  precio_nuevo: number;
  version_esperada: number;
  version_actual_en_bd: number;
  simular_fallo_auditoria?: boolean;
}

/**
 * Controlador de Auditoría Forense y Laboratorio Transaccional (Paso 1.2 — RF-19 / RNF-03).
 */
@Controller('auditoria')
@UseInterceptors(AuditContextInterceptor)
export class AuditoriaController {
  constructor(private readonly auditoriaService: AuditoriaService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async registrarEvento(@Body() dto: RegistrarAuditoriaDto) {
    return await this.auditoriaService.registrarEventoDirecto(dto);
  }

  @Get('registro/:id')
  async obtenerHistorialRegistro(
    @Param('id') id: string,
    @Query('limite') limite?: string,
  ) {
    return await this.auditoriaService.consultarHistorial({
      idRegistro: id,
      limite: limite ? Number(limite) : 50,
    });
  }

  @Get('tabla/:nombre')
  async obtenerHistorialTabla(
    @Param('nombre') nombre: string,
    @Query('limite') limite?: string,
  ) {
    return await this.auditoriaService.consultarHistorial({
      tabla: nombre,
      limite: limite ? Number(limite) : 50,
    });
  }

  /**
   * Laboratorio Interactivo para Postman: Simula una transacción con control OCC (HTTP 409)
   * y atomicidad estricta C-25 / C-26 (ROLLBACK total si falla la auditoría).
   */
  @Post('laboratorio-transaccion-auditada')
  @HttpCode(HttpStatus.OK)
  async simularTransaccionAuditada(
    @Body() dto: SimularTransaccionDto,
    @AuditContext() ctx: IAuditContext,
  ) {
    const tablaAfectada = dto.tabla || 'PRODUCTO_SUCURSAL';

    return await this.auditoriaService.ejecutarTransaccionAuditada({
      auditContext: {
        ...ctx,
        accion: AccionAuditoria.MODIFICACION,
      },
      tablaAfectada,
      idRegistroAfectado: dto.id_registro,
      obtenerSnapshotPrevio: async () => {
        return {
          id: dto.id_registro,
          precio_minorista: dto.precio_anterior,
          version: dto.version_actual_en_bd,
        };
      },
      mutacion: async () => {
        // Validación del Control de Concurrencia Optimista (OCC)
        if (dto.version_esperada !== dto.version_actual_en_bd) {
          throw new ConflictException(
            `Conflicto OCC en ${tablaAfectada}:${dto.id_registro}. La versión esperada era ${dto.version_esperada}, pero en base de datos ya avanzó a la versión ${dto.version_actual_en_bd}.`,
          );
        }

        if (dto.simular_fallo_auditoria) {
          throw new InternalServerErrorException(
            'Fallo simulado de disco/red en el paso de auditoría: se ejecuta ROLLBACK de la mutación de negocio.',
          );
        }

        return {
          resultado: {
            id_registro: dto.id_registro,
            precio_minorista: dto.precio_nuevo,
            version: dto.version_actual_en_bd + 1,
            estado_transaccion: 'MUTACION_APLICADA_Y_AUDITADA_ATOMICAMENTE',
          },
        };
      },
      obtenerSnapshotNuevo: async (_manager, res) => {
        return {
          id: dto.id_registro,
          precio_minorista: res.precio_minorista,
          version: res.version,
        };
      },
    });
  }
}
