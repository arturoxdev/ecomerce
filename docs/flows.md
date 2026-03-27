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
    B -->|Inventario| E[Editar precio / stock / fotos]
    B -->|Calendario| F[Vista de entregas y devoluciones próximas]
    B -->|Configuración| G[Cambiar modo delivery / depósito]
```

---

## Máquina de Estados: Order

```mermaid
stateDiagram-v2
    [*] --> PENDING: Checkout iniciado, AUTHORIZE exitoso
    PENDING --> CONFIRMED: Stock OK + CAPTURE exitoso
    PENDING --> CANCELLED: Stock insuficiente (VOID) o error de pago
    CONFIRMED --> DELIVERED: Admin marca como entregado
    DELIVERED --> RETURNED: Admin marca equipo devuelto
    CONFIRMED --> CANCELLED: Cancelación manual (Fase 2)
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
