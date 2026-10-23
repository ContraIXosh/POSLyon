import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CrearDevolucionDto, CrearVentaDto } from '@poslyon/domain-core';
import { HealthService } from './health.service';

/**
 * Controlador de Diagnóstico de Infraestructura y Laboratorio de Validación de Dominio (Paso 1.1).
 *
 * Expone endpoints para verificar en Postman:
 * 1. `GET /api/health`: Estado del servidor, reloj monótono (S-10), identidades canónicas (S-03) y PostgreSQL.
 * 2. `POST /api/health/validar-venta-dto`: Prueba en vivo del `ValidationPipe` global con `CrearVentaDto`.
 * 3. `POST /api/health/simular-devolucion`: Prueba en vivo de `@IsUUIDOrNil` (S-03) con el Nil UUID del Artículo Comodín
 *    y ejecución del núcleo funcional `DevolucionesDomainService`.
 */
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  async checkHealth() {
    return await this.healthService.verificarEstadoSistema();
  }

  @Post('validar-venta-dto')
  @HttpCode(HttpStatus.OK)
  validarVentaDto(@Body() dto: CrearVentaDto) {
    return this.healthService.procesarValidacionVentaDto(dto);
  }

  @Post('simular-devolucion')
  @HttpCode(HttpStatus.OK)
  simularDevolucion(@Body() dto: CrearDevolucionDto) {
    return this.healthService.simularDevolucionConDominioPuro(dto);
  }
}
