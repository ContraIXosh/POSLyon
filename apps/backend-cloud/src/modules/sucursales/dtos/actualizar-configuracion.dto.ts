import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import {
  IReglasNegocioSucursal,
  ModoNodoLan,
  PlanComercial,
} from '@poslyon/domain-core';

export class ActualizarConfiguracionDto {
  @IsOptional()
  @IsEnum(PlanComercial, { message: 'plan_activo debe ser un PlanComercial válido' })
  plan_activo?: PlanComercial;

  @IsOptional()
  @IsEnum(ModoNodoLan, { message: 'modo_nodo_lan debe ser un ModoNodoLan válido' })
  modo_nodo_lan?: ModoNodoLan;

  @IsOptional()
  @IsObject({ message: 'reglas_negocio debe ser un objeto JSON estructurado' })
  reglas_negocio?: Partial<IReglasNegocioSucursal>;

  @IsInt({ message: 'version debe ser un número entero (Control OCC)' })
  @Min(1, { message: 'version debe ser mayor o igual a 1' })
  version!: number;

  @IsString({ message: 'motivo es obligatorio para auditoría forense (RF-19)' })
  @IsNotEmpty({ message: 'motivo no puede estar vacío' })
  motivo!: string;
}
