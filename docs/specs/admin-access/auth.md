# Autenticación y Sesiones del Panel Admin

> Estado: borrador inicial
> Módulo: `admin-access`

## Propósito

Definir cómo ingresan los usuarios al panel admin, cómo se mantienen sus
sesiones y cómo se protegen las rutas administrativas.

## Alcance

- login por credenciales
- sesiones persistidas
- logout
- middleware de protección de rutas admin

## Fuentes a fusionar

- `openspec/specs/auth-system/spec.md`
- reglas históricas relacionadas de `openspec/changes/admin-dashboard/specs/admin-product-management/spec.md`

## Notas de migración

Este archivo debe absorber toda la lógica de acceso al panel admin para que no
se repita luego en specs de catálogo u órdenes.
