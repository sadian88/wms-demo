# Product

## Register

product

## Users

Equipo operativo y administrativo de una **PyME comercializadora y distribuidora de productos para la construcción especializados en Cerámica, Porcelanato, Revestimientos e Insumos de Instalación** (adhesivos, fragües, niveladores, perfiles y guardapolvos). Incluye Jefes de Bodega (`JB`), Administradores (`ADM`), Compradores (`COM`), Coordinadores de Despacho a Obra/Transporte (`TRA`), Auditores (`AUD`), Inspectores de Calidad (`CAL`), Operarios de Patio/Picking (`REC`, `PCK`, `PKG`) y Gerencia (`GER`).

## Product Purpose

Plataforma integral de gestión de bodegas (WMS), control de inventario multi-bodega sin doble conteo, preparación de despachos y logística ligera de última milla (TMS) adaptada a las particularidades del rubro cerámico:
- Control estricto por **Lote, Tono y Calibre** (evitando mezclar partidas distintas en un mismo pedido de obra o cliente).
- Control de **vencimiento (FEFO)** en sacos de adhesivos, morteros y fragües sensibles a la humedad.
- Gestión de **alta carga física (kg/pallet)**, fragilidad (mermas por rotura de palmetas/cajas despuntadas) y equivalencia comercial en **Cajas / m² / Pallets**.

## Brand Personality

Preciso, liviano, sereno. Inspirado en la claridad funcional de **Linear (Light Mode)** y **Stripe Dashboard**: superficies planas en blanco puro, jerarquía tipográfica nítida, acento cobalto técnico reservado para acciones e indicadores clave, y gráficos limpios que reemplazan párrafos explicativos.

## Anti-references

- Interfaces oscuras pesadas o bloques negros dominantes que cansan la vista en jornadas largas.
- Sobrecarga de texto, subtítulos redundantes y explicaciones de fórmulas visibles todo el tiempo.
- Tarjetas anidadas dentro de tarjetas ("box-in-box clutter") o sombras difusas decorativas (`ghost-cards`).
- Bordes laterales gruesos de colores (`border-left > 1px`) en alertas o tarjetas.
- Tablas saturadas de 12+ columnas visibles por defecto sin apoyo gráfico ni divulgación progresiva.

## Design Principles

1. **Gráfico Primero, Tabla Después (Visual-First Scanning)**: Toda pantalla abre con una síntesis gráfica (anillos SVG, barras de progreso, bullet charts o embudos de flujo) que responde "¿cómo estamos hoy?" en menos de 3 segundos.
2. **Divulgación Progresiva (Progressive Disclosure)**: Las fórmulas técnicas, desgloses de 8 estados y metadatos secundarios viven ocultos tras desplegables limpios (`Ver desglose`) o vistas de detalle, manteniendo la vista principal despejada.
3. **Arquitectura Plana de 1px (Flat & Weightless)**: Cero sombras decorativas. La estructura se define mediante aire generoso, contraste sutil entre blanco puro (`#FFFFFF`) y gris alabastro frío (`#F7F8FA`), y líneas divisoras de `1px`.
4. **Cero Redundancia Textual**: Si un título o un gráfico ya comunica el dato, se elimina el subtítulo explicativo. Máximo 3 puntos de datos por bloque visual.
5. **Color Semántico con Propósito (10% Rule)**: El 90% de la interfaz es neutra y luminosa; el color solo aparece para indicar acción primaria (Cobalto) o estado operativo (Esmeralda = óptimo, Ámbar = atención, Coral = crítico).

## Accessibility & Inclusion

- Cumplimiento estricto **WCAG AA / AAA**: texto principal con contraste `≥ 11:1` sobre fondo blanco y texto secundario `≥ 4.8:1`.
- Soporte completo para `@media (prefers-reduced-motion: reduce)`.
- Indicadores de estado que nunca dependen únicamente del color (siempre acompañados de forma, etiqueta breve o proporción gráfica).
