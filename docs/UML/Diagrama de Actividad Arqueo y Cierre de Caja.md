flowchart TD

    subgraph FASE1 ["FASE 1: Apertura de Turno"]
        A(["Inicio de Turno"]) --> B["Cajero declara Fondo Inicial de Efectivo<br/>(monto_inicial_efectivo)"]
        B --> C["Sistema valida monto >= 0<br/>Crea TURNO_CAJA con estado = 'ABIERTO'"]
    end

    subgraph FASE2 ["FASE 2: Operaciones durante el Turno (Discriminación de Medios)"]
        C --> D{"Operación Comercial"}
        
        %% Entradas de efectivo físico
        D -->|Venta Contado Efectivo| E1["Suma a VentasEfectivo<br/>(PAGO_VENTA afecta_caja_fisica = true)"]
        D -->|Abono CC en Efectivo| E2["Suma a AbonosEfectivo<br/>(MOVIMIENTO_CAJA afecta_caja_fisica = true)"]
        D -->|Ingreso Manual Declarado| E3["Suma a IngresosManuales<br/>(MOVIMIENTO_CAJA INGRESO)"]
        
        %% Egresos de efectivo físico
        D -->|Devolución/NC en Efectivo| S1["Suma a DevolucionesEfectivo<br/>(MOVIMIENTO_CAJA EGRESO - RF-10)"]
        D -->|Sangría / Retiro a Caja Fuerte| S2["Suma a SangriasRetiros<br/>(MOVIMIENTO_CAJA EGRESO de seguridad)"]
        D -->|Pago a Proveedor en Efectivo| S3["Suma a PagosProveedoresEfectivo<br/>(MOVIMIENTO_CAJA EGRESO de mostrador)"]
        
        %% Flujos que no mueven efectivo físico
        D -->|Cobro Digital: Tarjeta / QR / Transf.| ND1["Registra en TotalCobrosDigitales<br/>(afecta_caja_fisica = false)"]
        D -->|Abono CC por Transferencia Bancaria| ND2["Registra en TotalCobrosDigitales<br/>(afecta_caja_fisica = false)"]
        D -->|Venta a Fiado / Cuenta Corriente| ND3["Asienta cargo en CUENTA_CORRIENTE<br/>(No toca caja)"]
    end

    %% Convergencia hacia el arqueo
    E1 --> H
    E2 --> H
    E3 --> H
    S1 --> H
    S2 --> H
    S3 --> H
    ND1 --> H
    ND2 --> H
    ND3 --> H

    subgraph FASE3 ["FASE 3: Cierre Ciego en Mostrador (RF-17)"]
        H["Cajero solicita Cerrar Turno"] --> CC1["UI POS activa Pantalla de Arqueo Ciego<br/>(Oculta estrictamente el Efectivo Esperado)"]
        CC1 --> CC2["Cajero cuenta físicamente billetes y monedas en gaveta"]
        CC2 --> CC3["Cajero ingresa y confirma 'efectivo_declarado'"]
    end

    subgraph FASE4 ["FASE 4: Cálculo Automatizado de Discrepancia y Cierre de Turno"]
        CC3 --> CALC["Sistema ejecuta Fórmula Canónica en SQLite:<br/>EfectivoEsperado = monto_inicial_efectivo<br/>+ VentasEfectivo + AbonosEfectivo + IngresosManuales<br/>- DevolucionesEfectivo - SangriasRetiros - PagosProveedoresEfectivo"]
        
        CALC --> COMP["Sistema calcula Discrepancia:<br/>diferencia_caja = efectivo_declarado - EfectivoEsperado"]
        
        COMP --> PERSIST["UPDATE TURNO_CAJA SET<br/>fecha_cierre = NOW(),<br/>efectivo_declarado = declarado,<br/>diferencia_caja = diferencia,<br/>estado = 'CERRADO'"]
        
        PERSIST --> EVAL_DISC{"¿diferencia_caja == 0?"}
        
        EVAL_DISC -->|Sí| C_OK["Turno CERRADO Cuadrado<br/>(Diferencia = $0.00)"]
        EVAL_DISC -->|No: Declarado < Esperado| C_FALT["Turno CERRADO con FALTANTE<br/>Registra evento en AUDITORIA<br/>(Alerta preventiva para administración)"]
        EVAL_DISC -->|No: Declarado > Esperado| C_SOBR["Turno CERRADO con SOBRANTE<br/>Registra evento en AUDITORIA<br/>(Alerta preventiva para administración)"]
        
        C_OK --> SYNC_CLOUD["Push Sync a PostgreSQL en la Nube<br/>Genera Reporte Z consolidado"]
        C_FALT --> SYNC_CLOUD
        C_SOBR --> SYNC_CLOUD
    end

    subgraph FASE5 ["FASE 5: Rectificación Administrativa (O-16 / Auditoría Posterior)"]
        SYNC_CLOUD --> ADM_REV{"Administrador / Dueño<br/>audita el Turno Cerrado"}
        
        ADM_REV -->|Sin discrepancia o aceptada| FIN_TURNO(["Turno Definitivamente Cerrado"])
        
        ADM_REV -->|Discrepancia justificada por error humano| RECT["Administrador asienta:<br/>1. efectivo_rectificado<br/>2. motivo_rectificacion en AUDITORIA<br/>3. id_usuario_rectifica = admin_uuid<br/>4. fecha_rectificacion = NOW()"]
        
        RECT --> RECT_TRANS["UPDATE TURNO_CAJA SET<br/>estado = 'RECTIFICADO',<br/>efectivo_rectificado = rectificado,<br/>id_usuario_rectifica = admin_uuid<br/>(Preserva 'efectivo_declarado' original inmutable)"]
        
        RECT_TRANS --> FIN_TURNO
    end
