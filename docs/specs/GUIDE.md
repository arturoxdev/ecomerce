# Guide

## Objetivo

Mantener specs cortos, encontrables y editables. La prioridad es que el árbol
sea fácil de navegar y que editar un comportamiento no implique buscar entre
demasiados archivos.

## Principios

- Un módulo = un dominio funcional.
- Un spec = una capability coherente.
- No crear specs pequeños por cada botón o microinteracción.
- No mezclar varios dominios en el mismo archivo.
- Empezar con pocos archivos y dividir solo cuando duela mantener.

## Orden para documentar

1. Crear `README.md` raíz de `docs/specs`.
2. Crear esta `GUIDE.md`.
3. Crear `README.md` por módulo.
4. Crear y poblar los 10 specs core.
5. Agregar specs diferidos solo cuando ya sean necesarios.

## Cuándo dividir un spec

Divide un spec solo si pasa al menos una de estas:

- Supera aproximadamente 150 a 250 líneas.
- Mezcla más de una razón fuerte de cambio.
- Ya no se puede leer en 5 minutos.
- Cuesta encontrar dónde editar una regla puntual.

## Qué debe tener un spec

- Título claro.
- Propósito.
- Alcance.
- Reglas de negocio.
- Escenarios clave.
- Restricciones, errores o exclusiones.
- Fuentes a fusionar si viene de varios specs previos.

## Qué no debe tener

- Duplicación de reglas ya definidas en otro spec.
- Decisiones triviales de implementación.
- Detalles accidentales que no afectan el comportamiento.
- Checklist de tareas demasiado fino.

## Regla de mantenimiento

Primero actualizar el spec, luego el código y después los tests. Si una regla se
puede describir una sola vez, descríbela una sola vez y referencia ese spec.

## Convenciones

- Nombres de archivo simples y estables.
- Nombres de archivo en inglés, contenido en español.
- `README.md` del módulo corto; el detalle vive en los specs.
- `openspec/` queda como fuente histórica de migración, pero `docs/specs/` es la
  referencia operativa diaria.

## Regla de crecimiento

No abras un archivo nuevo solo porque el sistema creció un poco. Abre un archivo
nuevo solo cuando el existente ya sea incómodo de leer o mezcle demasiadas cosas.
