# Brief — E-commerce Template (Multi-Tenant)

## Que es

Template reutilizable de e-commerce para renta de equipo, dirigido al mercado de Estados Unidos. Cada instancia es una tienda independiente que comparte la misma base de datos, aislada por `STORE_ID`. Los clientes navegan un catalogo con disponibilidad en tiempo real, seleccionan fechas de renta, agregan items al carrito y pagan el 50% de anticipo con tarjeta online. El 50% restante se liquida en efectivo al momento de la entrega.

## Modelo de negocio

El template se vende a multiples clientes. Cada cliente recibe su propio frontend (desplegado en Vercel con su dominio), pero todos comparten una sola base de datos PostgreSQL. El aislamiento de datos se garantiza por la variable de entorno `STORE_ID` que filtra todas las queries. Ver [ADR-005](decisions/adr-005-multi-tenant-shared-db.md).

## Problema que resuelve

Los negocios de renta coordinan reservas por telefono o mensajeria, sin visibilidad de disponibilidad ni cobros online. Esto genera doble-reservas, perdida de clientes que no quieren esperar respuesta, y trabajo manual innecesario.

## Flujo en una linea

Cliente navega catalogo → selecciona fechas + productos → checkout con email y telefono → paga 50% online con Square → admin coordina entrega por contacto directo → cliente paga 50% restante en efectivo al recibir.

## Primer cliente

Festejos Aurora (Texas, EE.UU.)

## Estado

🟡 En desarrollo
