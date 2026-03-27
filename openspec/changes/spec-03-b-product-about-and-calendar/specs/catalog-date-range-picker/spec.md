## ADDED Requirements

### Requirement: Calendario visual para selección de rango de fechas
La sección "Check Availability" en la página de detalle del producto DEBE usar un componente Calendar de shadcn en modo range, visible inline (no en popover), para que el usuario seleccione fecha de inicio y fin de renta.

#### Scenario: Calendario siempre visible
- **WHEN** el usuario visita la página de detalle del producto
- **THEN** el calendario se muestra completo dentro de la card de disponibilidad sin necesidad de abrir un popover

#### Scenario: Selección de rango de fechas
- **WHEN** el usuario hace clic en una fecha de inicio y luego en una fecha de fin
- **THEN** el rango seleccionado se resalta visualmente con verde oscuro (#2d6a4f) en los extremos y verde claro (#dcfce7) en los días intermedios

#### Scenario: Fechas pasadas deshabilitadas
- **WHEN** el calendario se renderiza
- **THEN** las fechas anteriores a hoy están deshabilitadas y no son seleccionables

### Requirement: Resumen de rango seleccionado
Debajo del calendario DEBE mostrarse un resumen visual del rango seleccionado con iconos de calendario y las fechas formateadas.

#### Scenario: Rango completo seleccionado
- **WHEN** el usuario selecciona inicio (Mar 15) y fin (Mar 18)
- **THEN** se muestra: `[calendar-icon] Mar 15, 2026 → [calendar-icon] Mar 18, 2026` con estilo verde oscuro

#### Scenario: Sin rango seleccionado
- **WHEN** el usuario no ha seleccionado fechas
- **THEN** el resumen no se muestra o muestra placeholder indicando seleccionar fechas

### Requirement: Integración con API de disponibilidad existente
El calendario DEBE mantener la integración con el endpoint `/api/availability` existente, haciendo la consulta con debounce cuando se selecciona un rango válido.

#### Scenario: Consulta de disponibilidad tras selección
- **WHEN** el usuario selecciona un rango válido (inicio < fin)
- **THEN** el sistema consulta `/api/availability?productId={id}&start={start}&end={end}` con un debounce de 400ms y muestra el resultado

#### Scenario: Estado de carga
- **WHEN** la consulta de disponibilidad está en curso
- **THEN** se muestra un indicador de carga debajo del calendario
