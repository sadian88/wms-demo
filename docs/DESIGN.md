---
name: Plataforma WMS / OMS / TMS Ligero
description: Sistema de diseño flat, visualmente liviano y guiado por gráficos para operaciones logísticas multi-bodega
colors:
  primary-cobalt: "#2952cc"
  primary-cobalt-hover: "#1f3fa3"
  primary-cobalt-tint: "#eff4ff"
  surface-white: "#ffffff"
  surface-alabaster: "#f7f8fa"
  surface-subtle: "#f1f3f7"
  ink-primary: "#111625"
  ink-secondary: "#4b5568"
  ink-muted: "#687387"
  border-hairline: "#e4e7ee"
  status-optimal: "#0d9488"
  status-warning: "#d97706"
  status-critical: "#e11d48"
typography:
  headline:
    fontFamily: "DM Sans, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: "-0.02em"
  title:
    fontFamily: "DM Sans, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "DM Sans, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "IBM Plex Mono, ui-monospace, SFMono-Regular, monospace"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.2
rounded:
  sm: "6px"
  md: "8px"
  pill: "9999px"
spacing:
  xs: "6px"
  sm: "12px"
  md: "20px"
  lg: "28px"
components:
  button-primary:
    backgroundColor: "{colors.primary-cobalt}"
    textColor: "{colors.surface-white}"
    rounded: "{rounded.sm}"
    padding: "8px 14px"
  button-primary-hover:
    backgroundColor: "{colors.primary-cobalt-hover}"
  button-secondary:
    backgroundColor: "{colors.surface-subtle}"
    textColor: "{colors.ink-primary}"
    rounded: "{rounded.sm}"
    padding: "8px 14px"
  card-flat:
    backgroundColor: "{colors.surface-white}"
    textColor: "{colors.ink-primary}"
    rounded: "{rounded.md}"
    padding: "20px"
---

# Design System: Plataforma WMS / OMS / TMS Ligero

## 1. Overview

**Creative North Star: "The Weightless Control Room"**

La interfaz está concebida como una sala de control silenciosa, plana y luminosa donde la complejidad de 67 pantallas logísticas se destila en señales visuales inmediatas. Inspirada en la precisión técnica de Linear (Light) y Stripe Dashboard, reemplaza los bloques de texto densos y las tablas interminables por gráficos SVG integrados (anillos de proporción, barras horizontales comparativas, embudos de flujo y bullet charts de capacidad).

El sistema rechaza explícitamente las interfaces oscuras pesadas, las sombras decorativas combinadas con bordes (`ghost-cards`), las tarjetas anidadas dentro de tarjetas, los bordes laterales gruesos (`border-left > 1px`) y la saturación de explicaciones textuales.

**Key Characteristics:**
- **Gráficos antes que texto:** Toda vista principal resume sus métricas mediante visualización directa (anillos, barras de progreso, sparklines) antes de presentar cualquier fila de tabla.
- **Divulgación progresiva obligatoria:** Ninguna tabla muestra más de 6 columnas por defecto; las fórmulas técnicas y el desglose de los 8 estados de stock se despliegan a petición del usuario.
- **Superficie 100% clara y plana:** Lienzo en blanco puro (`#ffffff`) sobre estructura alabastro fría (`#f7f8fa`), separada únicamente por líneas de `1px` (`#e4e7ee`).
- **Regla para futuros módulos (Módulos 3 al 11):** Cada nuevo módulo debe seguir la estructura de 3 niveles: (1) Cabecera compacta sin subtítulos largos, (2) Banda visual gráfica de 2 a 3 paneles planos, y (3) Lista o tabla limpia con barras visuales en celda.

## 2. Colors

La paleta nace de la semilla `seed-129` en espacio perceptual OKLCH (`oklch(0.450 0.150 260.0)`), priorizando el blanco puro para la superficie de trabajo y reservando el cobalto para interacciones e indicadores clave.

### Primary
- **Technical Cobalt** (`#2952cc` / `oklch(0.48 0.17 260)`): Acción primaria, selección activa en navegación, barras principales de datos y enlaces interactivos. Siempre lleva texto en blanco puro (`#ffffff`).
- **Deep Cobalt Hover** (`#1f3fa3` / `oklch(0.40 0.16 260)`): Estado `:hover` y `:active` de botones primarios.
- **Cobalt Mist** (`#eff4ff` / `oklch(0.96 0.02 260)`): Fondo de selección activa en el menú lateral y resaltado suave de filas o pestañas activas.

### Secondary
- **Teal Optimal** (`#0d9488` / `oklch(0.60 0.13 180)`): Indicador semántico de cumplimiento OTIF en meta, stock disponible y ubicaciones activas.
- **Amber Attention** (`#d97706` / `oklch(0.66 0.16 65)`): Alertas de severidad media/alta, ubicaciones en conteo, brechas de abastecimiento y etiquetas de rezago.
- **Coral Critical** (`#e11d48` / `oklch(0.56 0.21 15)`): Quiebres de stock críticos, bloqueos de calidad y mermas sobre el umbral.

### Neutral
- **Pure White Canvas** (`#ffffff` / `oklch(1.000 0.000 0)`): Superficie principal de paneles, gráficos y tablas.
- **Cool Alabaster** (`#f7f8fa` / `oklch(0.978 0.004 260)`): Fondo general de la aplicación y del menú lateral claro.
- **Subtle Slate Surface** (`#f1f3f7` / `oklch(0.958 0.006 260)`): Fondo de controles secundarios, cabeceras de tabla y barras de progreso vacías.
- **Deep Ink** (`#111625` / `oklch(0.20 0.02 260)`): Texto principal y cifras clave (contraste `16.4:1` contra blanco).
- **Slate Secondary** (`#4b5568` / `oklch(0.45 0.02 260)`): Etiquetas de lectura y texto secundario (contraste `7.2:1`).
- **Muted Slate** (`#687387` / `oklch(0.56 0.02 260)`): Metadatos y ejes de gráficos (contraste `4.7:1`, cumpliendo AA).
- **Hairline Divider** (`#e4e7ee` / `oklch(0.92 0.006 260)`): Único color de borde estructural (`1px solid`).

### Named Rules
**The 10% Color Budget Rule.** Al menos el 90% de cualquier pantalla debe estar compuesta por `Pure White Canvas`, `Cool Alabaster` y `Deep Ink`. Los colores semánticos aparecen exclusivamente en barras de gráficos, puntos de estado (`8px dots`) y botones primarios.

**The White-On-Saturated Rule.** Cualquier botón o píldora con fondo saturado (`Technical Cobalt`, `Teal Optimal`, `Coral Critical`) utiliza texto en blanco puro (`#ffffff`), nunca texto oscuro.

## 3. Typography

**Display & Body Font:** `Inter` (con fallback a `-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`)
**Label/Mono Font:** `JetBrains Mono` (con fallback a `ui-monospace, SFMono-Regular, monospace`)

**Character:** Una sola familia sans-serif neutra y geométrica con números tabulares (`font-variant-numeric: tabular-nums`) activados globalmente para que todas las cifras, porcentajes y conteos de stock se alineen verticalmente sin esfuerzo visual.

### Hierarchy
- **Headline** (`600`, `1.125rem / 18px`, `line-height: 1.35`, `letter-spacing: -0.015em`): Título de la pantalla activa. Sin subtítulos largos debajo.
- **Title** (`600`, `0.9375rem / 15px`, `line-height: 1.4`): Títulos de bloques gráficos o secciones.
- **Metric Value** (`600`, `1.5rem / 24px`, `line-height: 1.15`, `tabular-nums`): Cifras principales acompañadas siempre de un indicador visual o gráfico.
- **Body** (`400` y `500`, `0.8125rem / 13px`, `line-height: 1.5`): Contenido de tablas, listas y controles.
- **Label / Code** (`500`, `0.75rem / 12px`, `line-height: 1.2`, `monospace`): Códigos de pantalla (`1.1`, `2.3`), SKUs (`SKU-EL-1040`), códigos de bodega (`BOD-CEN-01`) y ubicaciones (`A-01-01-B04`).

### Named Rules
**The Tabular Data Rule.** Todo número, KPI, cantidad de stock, porcentaje o código de ubicación aplica `tabular-nums` para permitir lectura vertical instantánea.

**The No-Subtitle Rule.** Los encabezados de sección y de pantalla no llevan párrafos explicativos debajo. Si una fórmula o regla de negocio necesita explicación, se coloca dentro de un desplegable `<details>` discreto.

## 4. Elevation

El sistema es **estrictamente plano (Flat-First)**. La jerarquía espacial no se construye con sombras difusas, sino mediante el contraste limpio entre el fondo `Cool Alabaster` (`#f7f8fa`) y los contenedores `Pure White Canvas` (`#ffffff`) delimitados por un borde único de `1px solid #e4e7ee`.

### Shadow Vocabulary
- **Rest State (`none`)**: Todos los paneles, tarjetas, tablas y botones en reposo tienen `box-shadow: none`.
- **Floating Overlay (`0 8px 20px -4px rgba(17, 22, 37, 0.08)`)**: Reservado exclusivamente para modales emergentes (`dialog`) y notificaciones flotantes (`toast`).

### Named Rules
**The Zero-Shadow Card Rule.** Está prohibido combinar `border: 1px solid` con `box-shadow` en paneles o tarjetas de contenido. Todo contenedor en el flujo de la página es 100% plano.

**The No-Nested-Cards Rule.** Nunca se coloca una tarjeta con borde dentro de otra tarjeta con borde. Dentro de un panel blanco, las sub-secciones se separan únicamente con espacio en blanco o una línea divisoria horizontal (`border-t`).

## 5. Components

### Buttons
- **Shape:** Bordes suavemente redondeados (`6px`).
- **Primary:** Fondo `Technical Cobalt` (`#2952cc`), texto blanco (`#ffffff`), peso `500`, tamaño `13px`, padding `7px 14px`, sin sombra.
- **Hover / Focus:** Transición de `150ms cubic-bezier(0.22, 1, 0.36, 1)` hacia `#1f3fa3`; anillo de foco visible de `2px` en `#2952cc`.
- **Secondary / Ghost:** Fondo `#f1f3f7`, texto `#111625`, sin borde o con borde `#e4e7ee` en botones de filtro.

### Status Pills & Dots
- **Style:** En lugar de cajas grandes coloreadas, los estados usan un punto circular de `7px` (`status-dot`) acompañado de texto limpio o una píldora suave de `6px` de radio (`padding: 2px 8px`, peso `500`, `12px`).

### Flat Panels (Containers)
- **Corner Style:** Radio moderado de `8px`.
- **Background:** `#ffffff` sobre lienzo `#f7f8fa`.
- **Shadow Strategy:** `none` (100% flat).
- **Border:** `1px solid #e4e7ee`.
- **Internal Padding:** `20px` constantes.

### Data Charts (Inline SVG)
- **Style:** Gráficos vectoriales ligeros integrados en el flujo:
  - **Donut / Ring Charts:** Grosor de trazo de `10px`, colores semánticos planos y cifra central clara.
  - **Horizontal Bar & Bullet Charts:** Altura de barra de `8px` con radio completo (`9999px`) sobre pista `#f1f3f7`, mostrando proporción real frente a capacidad o meta.
  - **Pipeline / Funnel Bars:** Bloques horizontales conectados con proporción visual e indicador numérico directo.

### Navigation (Light Sidebar + Compact Topbar)
- **Sidebar:** Fondo claro `#f7f8fa`, ancho fijo `264px`, borde derecho `1px solid #e4e7ee`. Módulos limpios sin contadores verbosos; ítem activo con fondo `#eff4ff` y texto `#2952cc` en peso `600`.
- **Topbar:** Altura compacta (`56px`), fondo `#ffffff`, borde inferior `1px solid #e4e7ee`. Contiene el selector de Rol RBAC, Bodega y Canal en una sola línea limpia, sin banners secundarios debajo.

## 6. Do's and Don'ts

### Do:
- **Do** iniciar cada pantalla de los 11 módulos con 2 o 3 bloques gráficos visuales (anillos SVG, barras comparativas o embudos de etapa) antes de mostrar cualquier tabla.
- **Do** limitar las tablas a un máximo de 5–6 columnas visibles e incluir micro-barras de progreso dentro de las celdas numéricas para facilitar la comparación visual.
- **Do** ocultar las fórmulas matemáticas (Stock Físico, ATP, Brecha) y el desglose de los 8 estados dentro de un desplegable limpio (`Ver desglose de estados`) para no saturar la vista.
- **Do** usar superficies claras (`#ffffff` y `#f7f8fa`) con divisores de `1px solid #e4e7ee` y radios de `6px` a `8px`.

### Don't:
- **Don't** usar barras laterales oscuras (`bg-slate-950`) ni tarjetas negras que generen saltos bruscos de contraste.
- **Don't** anidar tarjetas con borde dentro de otras tarjetas con borde (*nested cards*).
- **Don't** usar `border-left` mayor a `1px` como franja decorativa en alertas o tarjetas.
- **Don't** escribir párrafos explicativos largos ni subtítulos redundantes debajo de cada título de sección.
- **Don't** mostrar 10 columnas numéricas simultáneas en una tabla sin jerarquía visual.
