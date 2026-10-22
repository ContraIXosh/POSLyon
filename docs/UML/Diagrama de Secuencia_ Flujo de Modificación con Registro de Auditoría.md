sequenceDiagram
    autonumber
    actor Admin as Administrador
    participant UI as Frontend (React / Web Panel)
    participant Controller as Backend API (NestJS Controller)
    participant Interceptor as AuditContextInterceptor
    participant Service as ProductosService
    participant DB as PostgreSQL (Transaccional)
    participant Auditoria as Tabla AUDITORIA

    Admin->>UI: Modifica precio de producto ($1.200 -> $1.500)
    UI->>Controller: PUT /api/productos/uuid-123<br/>{ precio_minorista: 1500, version: 1, motivo: "Aumento por inflación" }
    
    Controller->>Interceptor: Intercepta petición HTTP
    note over Interceptor: Extrae metadatos forenses del contexto HTTP:<br/>id_usuario (JWT), IP origen, ruta y motivo.<br/>Inyecta auditContext en la ejecución.
    Interceptor->>Service: Invoca actualizarProducto(uuid-123, dto, auditContext)
    
    note over Service, DB: FASE 1: Apertura de Transacción ACID Unificada
    Service->>DB: BEGIN TRANSACTION
    
    Service->>DB: SELECT * FROM productos_sucursal WHERE id_producto = 'uuid-123' FOR UPDATE
    DB-->>Service: Retorna ESTADO ACTUAL { precio_minorista: 1200, version: 1 }
    note over Service: Captura valor_anterior fiel desde la base de datos

    note over Service, DB: FASE 2: Mutación con Control de Concurrencia Optimista (OCC)
    Service->>DB: UPDATE productos_sucursal<br/>SET precio_minorista = 1500, version = version + 1, updated_at = NOW()<br/>WHERE id_producto = 'uuid-123' AND version = 1

    alt [OCC Conflicto: 0 filas afectadas (Modificación concurrente por otro usuario)]
        DB-->>Service: Rows affected: 0
        Service->>DB: ROLLBACK TRANSACTION
        Service-->>Controller: Lanza ConflictException("El registro fue modificado por otro usuario")
        Controller-->>UI: HTTP 409 Conflict { error: "OCC_CONFLICT", current_version: 2 }
        UI-->>Admin: Muestra alerta: "Conflicto de edición. Recargando datos actualizados..."
    else [OCC Exitoso: 1 fila afectada]
        DB-->>Service: Rows affected: 1 (OK)
        note over Service: Construye snapshot real de valor_nuevo: { precio_minorista: 1500, version: 2 }

        note over Service, Auditoria: FASE 3: Registro Forense Atómico (Misma Transacción)
        Service->>DB: INSERT INTO auditoria (id, id_usuario, tabla_afectada, id_registro_afectado, accion, valor_anterior, valor_nuevo, motivo, fecha)<br/>VALUES (UUIDv4(), Admin.id, 'PRODUCTO_SUCURSAL', 'uuid-123', 'MODIFICACION', '{"precio_minorista":1200,"version":1}', '{"precio_minorista":1500,"version":2}', 'Aumento por inflación', NOW())

        alt [Falla en persistencia de auditoría (Falla de disco / Violación)]
            DB-->>Service: Error SQL en tabla AUDITORIA
            Service->>DB: ROLLBACK TRANSACTION (Garantía RF-19: sin auditoría no hay mutación)
            Service-->>Controller: Lanza InternalServerErrorException("Fallo en registro de auditoría atómica")
            Controller-->>UI: HTTP 500 Internal Server Error
            UI-->>Admin: Notifica error del sistema (la mutación no se aplicó)
        else [Auditoría persistida exitosamente]
            DB-->>Service: INSERT OK (1 fila)
            Service->>DB: COMMIT TRANSACTION
            Service-->>Controller: Retorna entidad actualizada { id: 'uuid-123', precio_minorista: 1500, version: 2 }
            Controller-->>UI: HTTP 200 OK (Producto actualizado con trazabilidad forense atómica)
            UI-->>Admin: Muestra notificación de éxito y actualiza UI a Versión 2
        end
    end
