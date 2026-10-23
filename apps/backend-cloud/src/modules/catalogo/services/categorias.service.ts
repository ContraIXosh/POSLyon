import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';
import { AccionAuditoria, IAuditContext } from '@poslyon/domain-core';
import { POSLYON_DATA_SOURCE } from '../../../database/database.module';
import { AuditoriaService } from '../../auditoria/services/auditoria.service';
import { CrearCategoriaDto } from '../dtos/crear-categoria.dto';
import { CategoriaEntity } from '../entities/categoria.entity';

@Injectable()
export class CategoriasService {
  constructor(
    @Inject(POSLYON_DATA_SOURCE)
    private readonly dataSource: DataSource,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  async crearCategoria(
    dto: CrearCategoriaDto,
    auditCtx: IAuditContext,
  ): Promise<CategoriaEntity> {
    const id = randomUUID();

    return await this.auditoriaService.ejecutarTransaccionAuditada({
      auditContext: {
        ...auditCtx,
        accion: AccionAuditoria.CREACION,
        motivo: auditCtx.motivo || 'Alta de categoría de producto',
      },
      tablaAfectada: 'CATEGORIA',
      idRegistroAfectado: id,
      obtenerSnapshotPrevio: async () => null,
      mutacion: async (manager) => {
        const existentes = await manager.query(
          `SELECT id FROM categoria WHERE LOWER(nombre) = LOWER($1)`,
          [dto.nombre.trim()],
        );
        if (existentes.length > 0) {
          throw new ConflictException(
            `Ya existe una categoría con el nombre '${dto.nombre}'.`,
          );
        }

        const [cat] = await manager.query(
          `INSERT INTO categoria (id, nombre, descripcion, activo, version, created_at, updated_at)
           VALUES ($1, $2, $3, true, 1, NOW(), NOW())
           RETURNING *;`,
          [id, dto.nombre.trim(), dto.descripcion || null],
        );

        return {
          resultado: cat as CategoriaEntity,
        };
      },
    });
  }

  async listarCategorias(): Promise<CategoriaEntity[]> {
    if (!this.dataSource.isInitialized) return [];
    return await this.dataSource.query(
      `SELECT id, nombre, descripcion, activo, version, created_at, updated_at
       FROM categoria WHERE activo = true ORDER BY nombre ASC`,
    );
  }
}
