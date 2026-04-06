---
paths:
  - "app/lib/data/**/*.ts"
---

# Reglas del Data Access Layer (DAL)

## Estructura de un archivo en /src/data

Todo archivo sigue este orden:

```
import 'server-only'
import { db } from '@/lib/db'
import { tabla } from '@/lib/schema'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { getCurrentUser } from './auth'
```

## Plantilla de lectura

```
export async function getEntidades() {
  const currentUser = await getCurrentUser()
  if (!currentUser.isAdmin) throw new Error('No autorizado')

  return db.select({
    id: tabla.id,
    nombre: tabla.nombre,
    // NUNCA seleccionar: password, token, datos sensibles
  }).from(tabla)
}
```

## Plantilla de mutación

```
import { validationProblem, internalProblem } from '@/lib/problems'

export async function crearEntidad(_prev: FormState, formData: FormData): Promise<FormState> {
  // 1. Verificar quién es
  await requireWriteAccess()

  // 2. Validar con Zod
  const parsed = entidadSchema.safeParse({ nombre: formData.get('nombre') })
  if (!parsed.success) return validationProblem(parsed.error)

  // 3. Ejecutar con Drizzle
  try {
    await db.insert(tabla).values(parsed.data)
  } catch (e) {
    if (isUniqueViolation(e)) return uniqueViolationProblem('nombre', 'Ya existe')
    return internalProblem('Failed to create entity')
  }

  // 4. Revalidar caché
  revalidatePath('/entidades')
  return { success: true }
}
```

**Importante:** Los errores SIEMPRE deben ser `ProblemDetail` (RFC 9457). Ver `.claude/rules/rfc9457-problem-details.md` para la referencia completa.

## Checklist antes de terminar un archivo

- [ ] Tiene import 'server-only' al inicio
- [ ] Llama getCurrentUser() antes de operar
- [ ] Valida permisos antes de regresar datos o mutar
- [ ] Los selects especifican solo columnas seguras
- [ ] Las mutaciones validan tipo de cada argumento
- [ ] Las mutaciones llaman revalidatePath al final
- [ ] Ningún componente importa db directamente
