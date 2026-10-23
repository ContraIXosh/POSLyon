import {
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  IReglasNegocioSucursal,
  ModoNodoLan,
  PlanComercial,
} from '@poslyon/domain-core';

export class CrearSucursalDto {
  @IsString({ message: 'nombre debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'nombre es obligatorio' })
  @MinLength(3, { message: 'nombre debe tener al menos 3 caracteres' })
  @MaxLength(100, { message: 'nombre no puede exceder 100 caracteres' })
  nombre!: string;

  @IsString({ message: 'direccion debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'direccion es obligatoria' })
  @MinLength(5, { message: 'direccion debe tener al menos 5 caracteres' })
  @MaxLength(255, { message: 'direccion no puede exceder 255 caracteres' })
  direccion!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  telefono?: string;

  @IsOptional()
  @IsEnum(PlanComercial, { message: 'plan_activo debe ser un PlanComercial válido' })
  plan_activo?: PlanComercial;

  @IsOptional()
  @IsEnum(ModoNodoLan, { message: 'modo_nodo_lan debe ser un ModoNodoLan válido' })
  modo_nodo_lan?: ModoNodoLan;

  @IsOptional()
  @IsObject({ message: 'reglas_negocio debe ser un objeto JSON válido' })
  reglas_negocio?: Partial<IReglasNegocioSucursal>;
}
