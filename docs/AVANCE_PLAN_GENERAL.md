# Avance frente a las notas de la reunión · Decor Cerámicas

**Fecha de corte:** octubre de 2026
**Origen:** notas de la reunión del 14 de octubre (propuesta de software a la medida, fase logística)

---

## 1. La necesidad puntual

Andrés Mejía Fuertes y Gustavo identificaron como problema principal la **falta de control riguroso en las entregas de mercancía en bodega**: hay discrepancias entre lo que sale físicamente y lo que se factura, y los cuadernos y sellos manuales dejan abierta la puerta a fraudes.

El flujo operativo que describieron:

> compra y recepción registrada en el software (con **foto** y cantidad de roturas) → pedidos o remisiones de los **asesores** → **facturación en caja** con medio de pago → **entrega en bodega validada con el número de factura**.

## 2. Qué resuelve hoy la demostración

| Requerimiento de las notas | Estado | Dónde |
|---|---|---|
| Recepción de compra con registro fotográfico y cuantitativo de roturas | ✅ | 3.1 Recepción · foto obligatoria si hay dañadas; reclamo automático |
| Pedidos de asesores | ✅ | 4.1 Pedidos y facturas · perfil *Asesor* con descuento máximo por producto |
| Facturación en caja con medio de pago | ✅ | 4.1 · número de factura y medio de pago; prefijos configurables |
| **Entrega en bodega validada con el número de factura** | ✅ | 4.2 Entrega en bodega · bloquea sin factura, anulada, ya entregada o de otra bodega |
| Entregas parciales y saldo pendiente | ✅ | 4.2 · por línea, con historial de remisiones |
| Eliminar cuadernos y registros manuales; trazabilidad de quién entregó | ✅ | Cada movimiento queda a nombre de la persona (usuarios reales con ingreso) |
| Inventario físico y contable al día, de forma independiente | ✅ (parcial) | 4.3 Conciliación facturado · entregado · pendiente |
| Operar en paralelo con Siigo: cargar las ventas del día por CSV | ✅ | 4.1 · lectura de CSV con revisión previa; anulaciones |
| Creación de usuarios con permisos restringidos por rol | ✅ | 7.2 Usuarios · 6 perfiles y alcance por bodega |
| Conversión entre unidades de medida (caja ↔ m², saco ↔ kg) | ✅ | 2.4 Catálogo · también al cargar facturas en m² |
| Catálogo con SKU automático, precio, costo, margen y descuento máximo | ✅ | 2.4 Catálogo |
| Prefijos de facturación y puntos de venta | ✅ | 7.4 Facturación y cajas |
| Mercancía por reclamar, devoluciones, vencimientos de lotes | ✅ | 6.1 y 6.2 |
| Traslados entre bodegas | ✅ | 2.3 Traspasos |

## 3. Pendiente (no está en esta demostración)

Estos puntos salieron en la reunión pero corresponden a fases posteriores o dependen de información externa:

- **Facturación electrónica real y móvil** para asesores, con envío a la DIAN. Hoy el número de factura se registra en caja o llega de Siigo.
- **Integración con la DIAN**: crear terceros desde el RUT (régimen de IVA, retenciones) y descargar facturas de compra. Depende de la documentación que enviará Andrés Mejía.
- **Integración directa con Siigo**: Siigo es cerrado y sin API abierta. Antonio Díaz S. investiga la carga del CSV de ventas del día (ya soportada en la demo) u otro método.
- **Proveedores y órdenes de compra** como módulo propio (la recepción hoy se hace contra un número de documento).
- **Contabilidad, cartera y nómina electrónica** (fases 2 y 3 de la propuesta).
- **Servidor y base de datos**: la demostración guarda todo en el navegador.

## 4. Pantallas y perfiles

| Pantalla | ADM | JB | OPE | ASE | CAJ | GER |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| 1.1 Resumen del día | ✅ | ✅ | ✅ | ✅ | ✅ | 👁 |
| 2.1 Existencias | ✅ | ✅ | 👁 | 👁 | — | 👁 |
| 2.2 Movimientos | ✅ | ✅ | — | — | — | 👁 |
| 2.3 Traspasos | ✅ | ✅ | ✅ | — | — | — |
| 2.4 Catálogo | ✅ | ✅ | 👁 | 👁 | — | 👁 |
| 3.1 Recepción | ✅ | ✅ | ✅ | — | — | — |
| 4.1 Pedidos y facturas | ✅ | ✅ | 👁 | ✅ pedidos | ✅ factura | 👁 |
| 4.2 Entrega en bodega | ✅ | ✅ | ✅ | — | — | — |
| 4.3 Conciliación | ✅ | ✅ | — | — | 👁 | 👁 |
| 5.1 Daños y mermas | ✅ | ✅ ≤ $ 1,2 M | ✅ registra | — | — | ✅ > $ 1,2 M |
| 5.2 Conteos | ✅ | ✅ | ✅ ciego | — | — | — |
| 5.3 Ajustes | ✅ | ✅ ≤ $ 1,2 M | — | — | — | ✅ > $ 1,2 M |
| 6.1 Reclamos y devoluciones | ✅ | ✅ | — | — | — | 👁 |
| 6.2 Rezagados y vencimientos | ✅ | ✅ | — | — | — | 👁 |
| 7.x Configuración | ✅ | — | — | — | — | — |

(✅ opera · 👁 solo lectura · — sin acceso. «Apariencia» está disponible para todos los perfiles.)

## 5. Reglas de dominio

1. **Partida** = producto + bodega + vencimiento (opcional). Sin control de tono y calibre.
2. **Cinco estados excluyentes**: disponible, reservado, dañado, en reclamo y en tránsito. Cada unidad está en un solo estado a la vez.
3. **Reserva FEFO**: al crear un pedido o cargar una factura se reserva primero lo que vence antes.
4. **Entrega con factura**: solo se entrega un pedido con factura vigente. Una factura anulada libera el stock reservado; si ya había entregas, queda marcada en Conciliación.
5. **Precios**: los totales de pedidos y facturas usan el **precio de venta** (no el costo). El costo y el margen los ven solo ADM, JB y GER.
6. **Umbral de aprobación**: el Jefe de Bodega aprueba bajas y ajustes hasta **$ 1.200.000**; sobre ese valor aprueba Gerencia. El Administrador aprueba cualquier monto.
7. **Alertas**: rezagado ≥ 60 días sin salidas (crítico ≥ 90); por vencer ≤ 30 días; factura sin retirar > 7 días.

## 6. Decisiones de diseño de la interfaz

- Una idea por pantalla: encabezado, una banda de resumen y una lista. El detalle vive detrás de un clic.
- Máximo 5 columnas visibles; en celular, filas apiladas.
- Texto base de 14 px, objetivos táctiles de 44 px en los flujos de bodega.
- El color solo comunica estado, y siempre acompañado de texto.
- Los flujos de bodega (recepción, entrega) son guiados, de un paso a la vez, pensados para celular.
