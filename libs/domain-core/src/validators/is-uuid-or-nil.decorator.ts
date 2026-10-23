import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';
import {
  UUID_ARTICULO_COMODIN,
  UUID_SYSTEM_BOT,
} from '../constants/comodin.constants';

/**
 * Mapa inmutable de identificadores UUID especiales reservados por la arquitectura POSLyon (Resolución S-03).
 * - PRODUCTO_COMODIN: Nil UUID (RFC 4122 §4.1.7) para ventas rápidas sin catálogo previo (RF-12).
 * - SYSTEM_BOT: Identidad reservada para procesos automáticos (Garbage Collection, alertas post-sync RF-07).
 */
export const RESERVED_UUIDS = {
  PRODUCTO_COMODIN: UUID_ARTICULO_COMODIN,
  SYSTEM_BOT: UUID_SYSTEM_BOT,
} as const;

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Función pura de predicado que verifica si un valor es un UUIDv4 estándar (RFC 4122)
 * o uno de los UUIDs reservados de sistema (Nil UUID / System Bot).
 */
export function esUuidV4OReservado(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  if (
    value === RESERVED_UUIDS.PRODUCTO_COMODIN ||
    value === RESERVED_UUIDS.SYSTEM_BOT
  ) {
    return true;
  }
  return UUID_V4_REGEX.test(value);
}

/**
 * Decorador de validación declarativa customizado (Resolución S-03).
 *
 * Admite identificadores UUIDv4 estándar de la aplicación o los UUIDs reservados de sistema
 * (`00000000-0000-0000-0000-000000000000` para Artículo Comodín y `00000000-0000-0000-0000-000000000001`
 * para SYSTEM_BOT). Evita el rechazo falso positivo que produce `@IsUUID('4')` cuando un cliente
 * devuelve un Artículo Comodín en `ItemDevolucionDto` o cuando un worker asienta auditorías automáticas.
 */
export function IsUUIDOrNil(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isUUIDOrNil',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown, _args: ValidationArguments): boolean {
          return esUuidV4OReservado(value);
        },
        defaultMessage(args: ValidationArguments): string {
          return `${args.property} debe ser un UUIDv4 válido o un UUID reservado de sistema (${RESERVED_UUIDS.PRODUCTO_COMODIN} / ${RESERVED_UUIDS.SYSTEM_BOT})`;
        },
      },
    });
  };
}
