# Diagrama de Máquina de Estados: Ciclo de Vida de Turno de Caja

Este diagrama formaliza el ciclo de vida de la entidad `TURNO_CAJA`, garantizando la coexistencia armoniosa entre el principio de **Instantánea Contable Inmutable** (POSLyon.md) y la capacidad de **Rectificación y Re-apertura Auditada por Administrador** (ERS RF-17), eliminando la ambigüedad señalada en el hallazgo **O-16**.

```mermaid
stateDiagram-v2
    [*] --> ABIERTO: Cajero inicia turno con fondo de caja (monto_inicial_efectivo)

    ABIERTO --> ABIERTO: Registro de ventas (efectivo/digital), abonos de cuentas corrientes y sangrías/egresos

    ABIERTO --> CERRADO: Cajero ejecuta "Cierre Ciego" declarando efectivo_declarado
    note right of CERRADO
        Guardas:
        - Cajero NO tiene visibilidad de efectivo_esperado
        Side Effects:
        - Sistema calcula internamente:
          efectivo_esperado = FondoInicial + VentasEfectivo + AbonosEfectivo - Egresos
          diferencia_caja = efectivo_declarado - efectivo_esperado
        - Asienta fecha_cierre = NOW()
        - Congela instantánea histórica del cajero
        - Bloquea la terminal para nuevas ventas en ese turno
    end note

    CERRADO --> RECTIFICADO: Administrador corrige discrepancia de conteo o billetes rezagados
    note right of RECTIFICADO
        Guardas:
        - Permiso de Administrador requerido
        - Motivo textual obligatorio en AUDITORIA
        Side Effects:
        - Preserva intactos efectivo_declarado y fecha_cierre originales del cajero
        - Asienta campos de auditoría:
          efectivo_rectificado, fecha_rectificacion, id_usuario_rectifica
        - Inmutabiliza la contabilidad fiscal
    end note

    CERRADO --> REABIERTO_AUDITADO: Administrador autoriza re-apertura excepcional (ej. corte de energía prolongado)
    note right of REABIERTO_AUDITADO
        Guardas:
        - Autorización de Administrador con motivo formal
        Side Effects:
        - Registro forense en AUDITORIA ('REAPERTURA_TURNO_CAJA')
        - Habilita temporalmente la carga de comprobantes pendientes
    end note

    REABIERTO_AUDITADO --> RECTIFICADO: Cierre definitivo post-reapertura con nuevo arqueo
    note right of RECTIFICADO
        Recalcula diferencia_caja final
        y sella el turno de forma inmutable
    end note

    CERRADO --> [*]
    RECTIFICADO --> [*]
```

## Principios Arquitectónicos del Ciclo de Turno

1. **Cierre Ciego Estricto (RF-17):** El cajero declara el monto físico en gaveta sin conocer el valor esperado calculado por el software, impidiendo la sustracción o compensación manual de sobrantes.
2. **Inmutabilidad de la Declaración Original:** El paso al estado `RECTIFICADO` jamás sobrescribe lo que el cajero declaró al cerrar su turno. Ambas cifras (lo declarado originalmente por el operario y lo rectificado por la supervisión) se conservan con fines forenses y análisis de desempeño.
3. **Vínculo Transaccional con Ventas (C-06):** Toda venta confirmada referencia obligatoriamente `id_turno_caja`, permitiendo reconstruir en cualquier momento el libro diario y arqueo del turno.
