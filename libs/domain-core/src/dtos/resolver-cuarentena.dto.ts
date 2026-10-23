import { IsUUID, IsString, IsNotEmpty, IsIn } from 'class-validator';
import { EstadoCuarentena } from '../enums/estado-cuarentena.enum';

/**
 * DTO para resolver una Alerta de Cuarentena generada por faltantes en preparación guiada (RF-02 / C-23).
 * Restringe `estado_resolucion` exclusivamente a los estados terminales válidos (`MERMA_CONFIRMADA` o `FALSA_ALARMA`).
 */
export class ResolverCuarentenaDto {
  @IsUUID('4', { message: 'id_alerta debe ser un UUIDv4 válido' })
  id_alerta!: string;

  @IsIn([EstadoCuarentena.MERMA_CONFIRMADA, EstadoCuarentena.FALSA_ALARMA], {
    message:
      'estado_resolucion debe ser MERMA_CONFIRMADA o FALSA_ALARMA (no se permite regresar a PENDIENTE)',
  })
  estado_resolucion!:
    | EstadoCuarentena.MERMA_CONFIRMADA
    | EstadoCuarentena.FALSA_ALARMA;

  @IsString({ message: 'observacion debe ser un texto' })
  @IsNotEmpty({
    message:
      'La observación forense es obligatoria para resolver una cuarentena de stock',
  })
  observacion!: string;
}
