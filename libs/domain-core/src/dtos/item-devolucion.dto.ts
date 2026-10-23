import { IsNumber, IsPositive } from 'class-validator';
import { IsUUIDOrNil } from '../validators/is-uuid-or-nil.decorator';

/**
 * Sub-payload que representa cada artículo devuelto dentro de una solicitud de Nota de Crédito (RF-09).
 *
 * Resolución S-03: Emplea `@IsUUIDOrNil` en lugar de `@IsUUID('4')` para admitir legítimamente
 * la devolución de artículos vendidos bajo modalidad de Venta Rápida / Comodín
 * (`00000000-0000-0000-0000-000000000000`).
 */
export class ItemDevolucionDto {
  @IsUUIDOrNil({
    message:
      'id_producto debe ser un UUIDv4 válido o el UUID reservado del comodín',
  })
  id_producto!: string;

  @IsNumber({}, { message: 'cantidad a devolver debe ser un número válido' })
  @IsPositive({ message: 'cantidad a devolver debe ser mayor a 0' })
  cantidad!: number;
}
