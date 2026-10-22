---
name: mentor-trazabilidad-sdd
description: >-
  Agente educativo (Nivel Licenciatura en Sistemas 0 a 100) y auditor de trazabilidad
  post-implementación (Requisitos ERS <-> UML/ERD <-> File-Level Specs <-> Código).
  Activar al finalizar cada funcionalidad o módulo para generar el documento en
  docs/trazabilidad/ y actualizar MEMORY.md.
---

# 🎓 Skill: Mentor Educativo SDD y Auditor de Trazabilidad Post-Implementación

## 1. Propósito
Este skill garantiza dos objetivos críticos en el desarrollo de **POSLyon**:
1. **Formación Académica (0 a 100):** Explicar con rigor de Licenciatura en Sistemas cada decisión de ingeniería de software, patrón de diseño, principio SOLID, estructura de datos y mecanismo transaccional empleado en el código.
2. **Trazabilidad Bidireccional Documentada (`docs/trazabilidad/`):** Generar al término de cada funcionalidad un documento formal que demuestre qué parte exacta del ERS, del ERD, de los Diagramas UML y de los *File-Level Specs* se transformó en qué archivo, clase y método del código fuente.

---

## 2. Flujo de Ejecución Obligatorio al Cerrar una Funcionalidad

Cada vez que se completa un módulo o funcionalidad:

1. **Crear/Actualizar el Documento de Trazabilidad** en `docs/trazabilidad/<NN>-<slug-funcionalidad>.md`.
2. **Actualizar `MEMORY.md`** en la raíz del repositorio con el progreso alcanzado, estado de pruebas y siguiente paso para asegurar continuidad entre Fedora Linux y Windows.
3. **Proveer la Guía de Laboratorio (Postman / Tests)** para que el estudiante valide empíricamente el comportamiento.

---

## 3. Plantilla Oficial para `docs/trazabilidad/<NN>-<slug-funcionalidad>.md`

```markdown
# 🧭 Reporte de Trazabilidad e Ingeniería: [Nombre de la Funcionalidad / Módulo]

> **Fecha:** YYYY-MM-DD  
> **Nivel de Acoplamiento:** [Nivel 0: Dominio Puro | Nivel 1: Infraestructura | Nivel 2: Maestros | Nivel 3: Operativo | Nivel 4: Orquestador]  
> **Estado:** Implementado y Verificado

---

## 1. 🔗 Matriz de Trazabilidad Bidireccional (De la Especificación al Código)

| Requisito (ERS) | Entidad / Campo (ERD) | Diagrama UML (Secuencia / Estado) | File-Level Spec | Archivo y Símbolo Implementado |
| :--- | :--- | :--- | :--- | :--- |
| `RF-XX` (Descripción breve) | `TABLA.columna` (Tipo, PK/FK) | `Diagrama X` (Paso N / Estado Y) | `Spec Módulo Z` (Sección M) | `ruta/archivo.ts` (`Clase.metodo()`) |

---

## 2. 🎓 Cátedra de Ingeniería de Sistemas (Explicación de 0 a 100)

### 2.1. ¿Qué construimos y por qué en este orden?
[Explicación conceptual clara del rol de este componente en la arquitectura y su grado de acoplamiento].

### 2.2. Anatomía Técnica: Patrones, Principios SOLID, Anti-Patrones y Teoría de Sistemas
Para cada concepto o archivo implementado, desarrollar obligatoriamente:
- **Fundamento Teórico Formal:** Nombre técnico exacto en Ciencias de la Computación / Ingeniería en Sistemas (ej: Teoría de Autómatas y Harel Statecharts, Estándares RFC como RFC 4122 o RFC 9110, Type Erasure vs. Metaprogramación/Reflexión, Acoplamiento Aferente/Eferente $C_a / C_e$, Principios ADP/SDP de Robert C. Martin, Álgebra Relacional de Codd).
- **❌ El Mal Diseño (Enfoque Novato / Anti-Patrón):** Explicar cómo suele programarse erróneamente y por qué falla en producción (explosión combinatoria, pérdida de integridad referencial, condiciones de carrera, corrupción de datos).
- **✅ El Diseño de Ingeniería (Enfoque Profesional en POSLyon):** Explicar paso a paso cómo lo resuelve nuestro código, por qué se usan determinados decoradores, banderas del compilador o estructuras de datos.

### 2.3. Bitácora de Decisiones Arquitectónicas (ADR)
- **Decisión Tomada:** [Qué se eligió].
- **Alternativas Descartadas:**
  - *Alternativa A:* [Por qué se descartó técnicamente].
  - *Alternativa B:* [Por qué se descartó técnicamente].
- **Trade-off Aceptado y Mitigación:** [Costo asumido y cómo se controla].

---

## 3. 🧪 Verificación Empírica (Postman / Tests Unitarios)
- **Comandos ejecutados:** `...`
- **Casos probados (Happy Path y Edge Cases):**
  1. [Caso 1]
  2. [Caso 2]
```
