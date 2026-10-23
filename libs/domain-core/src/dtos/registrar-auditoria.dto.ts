import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsObject,
} from 'class-validator';
import { AccionAuditoria } from '../enums/accion-auditoria.enum';
import { IsUUIDOrNil } from '../validators/is-uuid-or-nil.decorator';

/**
 * DTO estructurado para registrar un evento forense inmutable en la tabla `AUDITORIA` (RF-19 / RNF-03).
 *
 * Admite `@IsUUIDOrNil` en `id_usuario` (para soportar `UUID_SYSTEM_BOT`) y en `id_registro_afectado`
 * (para soportar eventos sobre `UUID_ARTICULO_COMODIN`).
 */
export class RegistrarAuditoriaDto {
  @IsUUIDOrNil({
    message:
      'id_usuario debe ser un UUIDv4 válido o UUID_SYSTEM_BOT (00000000-0000-0000-0000-000000000001)',
  })
  id_usuario!: string;

  @IsString()
  @IsNotEmpty({ message: 'tabla_afectada es obligatoria' })
  tabla_afectada!: string;

  @IsUUIDOrNil({
    message:
      'id_registro_afectado debe ser un UUIDv4 válido o un UUID reservado de sistema (Resolución O-09)',
  })
  id_registro_afectado!: string;

  @IsEnum(AccionAuditoria, {
    message:
      'accion debe pertenecer al catálogo universal canónico AccionAuditoria (Resolución S-04)',
  })
  accion!: AccionAuditoria;

  @IsOptional()
  @IsObject({
    message: 'valor_anterior debe ser un snapshot JSON estructurado (O-12)',
  })
  valor_anterior?: Record<string, unknown> | null;

  @IsOptional()
  @IsObject({
    message: 'valor_nuevo debe ser un snapshot JSON estructurado (O-12)',
  })
  valor_nuevo?: Record<string, unknown> | null;

  @IsString()
  @IsNotEmpty({
    message:
      'El motivo forense es incondicionalmente obligatorio en toda auditoría (RF-19)',
  })
  motivo!: string;
}
