# Flujos — Festejos Aurora

## Flujo 1: Reserva y Checkout

El flujo principal del negocio. El cliente navega el catálogo, selecciona fechas y productos, completa el checkout con sus datos de contacto, y paga el 50% de anticipo con tarjeta. El sistema valida disponibilidad de forma atómica para evitar overbooking.

```mermaid
sequenceDiagram
    participant U as Cliente
    participant UI as Next.js
    participant API as API Routes
    participant SQ as Square
    participant DB as PostgreSQL

    U->>UI: Selecciona producto + fechas + cantidad
    UI->>API: GET /availability?productId&start&end
    API->>DB: SELECT SUM(quantity) FROM availability WHERE fechas se cruzan
    DB-->>API: stock ocupado
    API-->>UI: stock disponible
    UI-->>U: Muestra disponibilidad en tiempo real

    U->>UI: Agrega al carrito → va al checkout
    U->>UI: Ingresa email + teléfono + datos de entrega
    U->>UI: Ingresa datos de tarjeta (Square SDK tokeniza)
    UI->>API: POST /checkout {token, items, fechas, cliente}

    API->>SQ: POST /payments (autocomplete: false) → AUTHORIZE
    SQ-->>API: payment_id, status: AUTHORIZED

    API->>DB: BEGIN TRANSACTION
    API->>DB: SELECT SUM(quantity) FOR UPDATE (lock)
    DB-->>API: stock ocupado actualizado

    alt Stock insuficiente
        API->>SQ: POST /payments/{id}/cancel → VOID
        API->>DB: ROLLBACK
        API-->>UI: Error — sin disponibilidad
        UI-->>U: "Ya no hay disponibilidad para esas fechas"
    else Stock OK
        API->>DB: INSERT availability (producto, fechas, qty)
        API->>DB: INSERT order (cliente, items, status: CONFIRMED)
        API->>SQ: POST /payments/{id}/complete → CAPTURE
        API->>DB: UPDATE order.paymentStatus = CAPTURED
        API->>DB: COMMIT
        API-->>UI: Éxito + order_id
        UI-->>U: Página de confirmación ✅
    end
```

---

## Flujo 2: Verificación de Disponibilidad (Lógica Core)

Cómo el sistema calcula unidades disponibles para un rango de fechas dado, considerando tanto productos FIXED (brincolines) como PER_UNIT (sillas).

```mermaid
flowchart TD
    A[Usuario selecciona fechas] --> B[Query: SUM availability WHERE fechas se cruzan]
    B --> C{Tipo de producto}
    C -->|FIXED stock=1| D{ocupado >= 1?}
    C -->|PER_UNIT stock=N| E[disponible = stock - ocupado]
    D -->|Sí| F[❌ No disponible]
    D -->|No| G[✅ Disponible]
    E --> H{disponible > 0?}
    H -->|No| F
    H -->|Sí| I[✅ Mostrar cantidad disponible]
```

---

## Flujo 3: Gestión desde el Panel Admin

La administradora gestiona pedidos, inventario y calendario desde `/admin`. No hay notificaciones automáticas — la admin coordina todo manualmente por teléfono/email.

```mermaid
flowchart TD
    A[Admin abre panel] --> B{¿Qué sección?}
    B -->|Pedidos| C[Lista de pedidos con email + teléfono]
    C --> D[Admin contacta cliente para coordinar entrega]
    C --> M[Crear orden manual]
    M --> M1[Sheet: buscar producto + calendario single + cliente + método]
    M1 --> M2{¿amountPaid >= total?}
    M2 -->|Sí| M3[CONFIRMED + CAPTURED + payment_method elegido]
    M2 -->|No| M4[CONFIRMED + AUTHORIZED + adelanto]
    M4 --> M5[Botón 'Marcar como pagada' → CAPTURED]
    C --> CN[Cancelar orden]
    CN --> CN1[Libera availability + status=CANCELLED]
    CN1 --> CN2{¿Stripe CAPTURED?}
    CN2 -->|No| CN3[paymentStatus=VOIDED]
    CN2 -->|Sí| CN4[paymentStatus permanece CAPTURED · refund manual en Stripe Dashboard]
    B -->|Inventario| E[Editar precio / stock / fotos]
    B -->|Calendario| F[Vista de entregas y devoluciones próximas]
    B -->|Configuración| G[Cambiar modo delivery / depósito]
```

### Reglas clave de órdenes manuales (PR-001)

- Sólo `ROOT`/`ADMIN` ven los botones "Crear orden", "Marcar como pagada" y "Cancelar". `EMPLOYEE` no.
- El admin puede reservar **HOY** desde el sheet (asimétrico con el carrito público que exige `>= mañana`).
- Las órdenes manuales no llaman a Stripe ni envían email; persisten `payment_method = CASH | TRANSFER`.
- Stripe siempre persiste `payment_method = CARD`. Las órdenes Stripe se confirman vía webhook, no con el botón "Marcar como pagada".
- Cancelar es idempotente: rechaza segundas llamadas en `CANCELLED`/`DELIVERED`/`RETURNED`.
- Ver [ADR-007](decisions/adr-007-manual-orders-and-payment-method.md) para el detalle de decisiones.

---

## Máquina de Estados: Order

```mermaid
stateDiagram-v2
    [*] --> PENDING: Checkout iniciado, AUTHORIZE exitoso
    PENDING --> CONFIRMED: Stock OK + CAPTURE exitoso
    [*] --> CONFIRMED: Orden manual (PR-001)
    PENDING --> CANCELLED: Stock insuficiente (VOID) o error de pago
    CONFIRMED --> DELIVERED: Admin marca como entregado
    DELIVERED --> RETURNED: Admin marca equipo devuelto
    CONFIRMED --> CANCELLED: Cancelación manual desde admin (PR-001)
```

| Estado | Descripción |
|---|---|
| PENDING | Anticipo autorizado en Square, pendiente de confirmar disponibilidad |
| CONFIRMED | 50% capturado, equipo apartado para las fechas |
| DELIVERED | Equipo entregado al cliente, 50% restante cobrado en efectivo |
| RETURNED | Equipo devuelto, ciclo completo |
| CANCELLED | Pedido cancelado (VOID en Square o cancelación manual) |

---

## Máquina de Estados: PaymentStatus

```mermaid
stateDiagram-v2
    [*] --> AUTHORIZED: Square AUTHORIZE exitoso
    AUTHORIZED --> CAPTURED: Stock OK → CAPTURE
    AUTHORIZED --> VOIDED: Stock insuficiente → VOID
    AUTHORIZED --> FAILED: Error en CAPTURE o VOID
```
