# Roles, Permisos y Visibilidad del Panel Admin

> Estado: borrador inicial
> Módulo: `admin-access`

## Propósito

Definir la jerarquía de roles, qué acciones puede ejecutar cada rol y qué partes
del panel se muestran o se ocultan según el usuario autenticado.

## Alcance

- jerarquía ROOT > ADMIN > EMPLOYEE
- permisos de lectura y escritura
- visibilidad de navegación por rol
- restricciones de acceso a acciones sensibles

## Fuentes a fusionar

- `openspec/specs/role-system/spec.md`
- `openspec/specs/admin-shell-complete/spec.md`

## Notas de migración

La regla general de permisos debe vivir aquí y no duplicarse dentro de cada spec
de dominio.
