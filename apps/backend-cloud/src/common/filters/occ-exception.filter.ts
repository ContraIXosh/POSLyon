import {
  ArgumentsHost,
  Catch,
  ConflictException,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { OptimisticLockVersionMismatchError } from 'typeorm';

export interface OccConflictResponse {
  statusCode: number;
  error: string;
  codigo: string;
  mensaje: string;
  timestamp: string;
  path: string;
  detalles?: Record<string, any>;
}

/**
 * Filtro de Excepciones para Control de Concurrencia Optimista (`OccExceptionFilter` — RF-19 / RNF-01).
 *
 * Captura colisiones de versión concurrente (disparadas por TypeORM `OptimisticLockVersionMismatchError`
 * o por `ConflictException` explícita en servicios transaccionales de POSLyon) y normaliza la salida HTTP
 * con código de estado 409 Conflict, informando al cliente la necesidad de recargar los datos o realizar
 * reconciliación (Merge Aditivo offline / actualización de vista en mostrador).
 */
@Catch(ConflictException, OptimisticLockVersionMismatchError)
export class OccExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(OccExceptionFilter.name);

  catch(
    exception: ConflictException | OptimisticLockVersionMismatchError,
    host: ArgumentsHost,
  ) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let mensaje =
      'El registro fue modificado concurrentemente por otra transacción. Por favor, recargue el estado más reciente e intente nuevamente.';
    let detalles: Record<string, any> | undefined;

    if (exception instanceof ConflictException) {
      const res = exception.getResponse();
      if (typeof res === 'string') {
        mensaje = res;
      } else if (typeof res === 'object' && res !== null) {
        const obj = res as Record<string, any>;
        mensaje = obj.message || obj.mensaje || mensaje;
        detalles = obj.detalles;
      }
    } else if (exception instanceof OptimisticLockVersionMismatchError) {
      mensaje = `Colisión OCC en entidad ${(exception as any).entity}: la versión en base de datos ya avanzó a ${(exception as any).actualVersion}.`;
      detalles = {
        expectedVersion: (exception as any).expectedVersion,
        actualVersion: (exception as any).actualVersion,
      };
    }

    this.logger.warn(
      `Colisión OCC detectada en [${request.method}] ${request.url} - Motivo: ${mensaje}`,
    );

    const payload: OccConflictResponse = {
      statusCode: HttpStatus.CONFLICT,
      error: 'Conflict',
      codigo: 'OCC_VERSION_MISMATCH',
      mensaje,
      timestamp: new Date().toISOString(),
      path: request.originalUrl || request.url,
      ...(detalles ? { detalles } : {}),
    };

    response.status(HttpStatus.CONFLICT).json(payload);
  }
}
