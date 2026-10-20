# Estado de Avance del Plan General · Plataforma WMS Esencial

**Proyecto:** WMS Esencial para Operaciones Medianas de Materiales de Construcción  
**Fecha de corte:** Octubre 2026  
**Versión de la plataforma:** 2.0.0 · WMS Esencial  

---

## 1. Visión y Propósito del Sistema

El sistema está acotado para entregar visibilidad total sobre la mercadería de una operación mediana (7 módulos, 16 pantallas y 4 perfiles), respondiendo en tiempo real las 6 preguntas críticas del negocio sin zonas ciegas ni doble conteo:

| Pregunta del negocio | Pantalla donde se responde |
|---|---|
| 1. ¿Qué tengo **en existencia**? | **2.1 Existencias** |
| 2. ¿Qué está **por entregar** (vendido, pendiente de retiro en bodega)? | **4.1 Pedidos por entregar** · **4.2 Mostrador de retiro** |
| 3. ¿Qué está **dañado**? | **5.1 Daños y mermas** |
| 4. ¿Qué tengo **por reclamar** (a proveedor o devoluciones de clientes)? | **6.1 Reclamos y devoluciones** |
| 5. ¿Qué está **rezagado o por vencer**? | **6.2 Rezagados y vencimientos** |
| 6. ¿Qué se **perdió** (faltantes de conteo y bajas aprobadas)? | **5.2 Conteos** · **5.3 Ajustes** · **2.2 Movimientos** |

La pantalla inicial (**1.1 Mapa de mercancía**) consolida estas 6 categorías con unidades, valor en USD y alertas accionables del día.

---

## 2. Reglas de Dominio y Umbrales Operativos

1. **Unidad de control (Partida)**: Cada partida se define por **SKU + Bodega + Fecha de vencimiento** (opcional para productos que no vencen). No se utiliza control de Tono/Calibre.
2. **5 Estados físicos sin doble conteo**: Cada unidad en bodega está en **un único estado** a la vez: `Disponible`, `Reservado`, `Dañado`, `En reclamo` o `En tránsito`. Las salidas definitivas (`Entrega`, `Baja`, `Devolución a proveedor`, `Ajuste de conteo negativo`) salen del inventario físico y quedan registradas en el kárdex inmutable.
3. **Reserva FEFO automática**: Al cargar un pedido manual o por CSV, el sistema asigna primero la partida que vence antes (`allocateFefo`).
4. **Umbrales de control y alertas**:
   - **Aprobación dual por valor (`USD 300`)**: El Jefe de Bodega (`JB`) aprueba bajas y ajustes hasta **USD 300**; sobre **USD 300** aprueba Gerencia (`GER`). El Administrador (`ADM`) puede aprobar cualquier monto.
   - **Mercadería rezagada**: `≥ 60 días` sin salidas (`Crítico ≥ 90 días`).
   - **Mercadería por vencer**: `≤ 30 días` para su fecha de vencimiento.
   - **Pedidos sin retirar**: `> 7 días` preparados sin que el cliente acuda a retirar en bodega.

---

## 3. Jerarquía Organizacional y Aprovisionamiento Comercial

Se mantienen los 3 casos de estructura multi-almacén y multi-bodega contratados por suscripción:
1. **Caso 1 (`CASE_1`)**: Sin Casa Matriz · 1 Almacén (`ALM-QUI`) con 1 Bodega atada por defecto (`BOD-CEN-01`).
2. **Caso 2 (`CASE_2`)**: Sin Casa Matriz · 1 Almacén (`ALM-QUI`) con 2 Bodegas (`BOD-CEN-01` atada por defecto + `BOD-MOR-04` adicional contratada).
3. **Caso 3 (`CASE_3`)**: Con Casa Matriz (`Casa Matriz Ceramix Constructora`) · 2 Almacenes (`ALM-QUI` y `ALM-REN`), cada uno con su bodega atada por defecto + 1 bodega adicional (4 bodegas en total).

---

## 4. Matriz de Avance por Módulo (7 Módulos · 16 Pantallas)

| Módulo | Nombre | Pantallas | Estado | Descripción Funcional |
|---|---|---|---|---|
| **M1** | **Panel** | 1.1 | **100% Funcional** | Mapa de mercancía con las 6 categorías en unidades y USD, barra de distribución física y panel "Requiere acción hoy". |
| **M2** | **Inventario** | 2.1, 2.2, 2.3 | **100% Funcional** | Existencias por partida y estado con filtro FEFO, kárdex inmutable de movimientos y traspasos entre bodegas con guía. |
| **M3** | **Entradas** | 3.1 | **100% Funcional** | Recepción contra OC o guía con vencimiento y apertura automática de reclamo a proveedor por unidades dañadas o faltantes. |
| **M4** | **Salidas** | 4.1, 4.2 | **100% Funcional** | Pedidos por entregar (alta manual e importación CSV con reserva FEFO) y mostrador de retiro total o parcial en bodega. |
| **M5** | **Control de pérdidas** | 5.1, 5.2, 5.3 | **100% Funcional** | Registro de daños con evidencia, programación y captura de conteos ciegos, y aprobación de bajas/ajustes según umbral USD 300. |
| **M6** | **Reclamos y rezagados** | 6.1, 6.2 | **100% Funcional** | Reclamos a proveedor y devoluciones de clientes (nota de crédito, reintegro o daño) y monitor de rezagados (≥60d/90d) y vencimientos (≤30d). |
| **M7** | **Configuración** | 7.1, 7.2, 7.3, 7.4 | **100% Funcional** | Estructura multi-bodega (Casos 1, 2 y 3), simulación de los 4 perfiles RBAC, catálogo de productos y apariencia. |

---

## 5. Matriz de Perfiles Operativos (4 Roles RBAC)

| Pantalla | ADM (Administrador) | JB (Jefe de Bodega) | OPE (Operario) | GER (Gerencia) |
|---|:-:|:-:|:-:|:-:|
| **1.1 Mapa de mercancía** | ✅ | ✅ | — | 👁 Lectura |
| **2.1 Existencias** | ✅ | ✅ | 👁 Lectura | 👁 Lectura |
| **2.2 Movimientos** | ✅ | ✅ | — | 👁 Lectura |
| **2.3 Traspasos** | ✅ | ✅ Aprueba | ✅ Despacha / Recibe | — |
| **3.1 Recepción** | ✅ | ✅ | ✅ Recibe | — |
| **4.1 Pedidos por entregar** | ✅ | ✅ | 👁 Lectura | 👁 Lectura |
| **4.2 Mostrador de retiro** | ✅ | ✅ | ✅ Entrega | — |
| **5.1 Daños y mermas** | ✅ | ✅ Aprueba ≤ USD 300 | ✅ Registra | ✅ Aprueba > USD 300 |
| **5.2 Conteos** | ✅ | ✅ Programa | ✅ Conteo ciego | — |
| **5.3 Ajustes y aprobaciones** | ✅ | ✅ Aprueba ≤ USD 300 | — | ✅ Aprueba > USD 300 |
| **6.1 Reclamos y devoluciones** | ✅ | ✅ | — | 👁 Lectura |
| **6.2 Rezagados y vencimientos** | ✅ | ✅ | — | 👁 Lectura |
| **7.x Configuración** | ✅ (7.1–7.4) | 7.4 Apariencia | 7.4 Apariencia | 7.4 Apariencia |

---

## 6. Funcionalidades Excluidas por Alcance (Operación Mediana)

- **Control de Tono y Calibre**: Eliminado para simplificar la operación a SKU + cantidad + fecha de vencimiento.
- **Ubicaciones Pasillo-Rack-Nivel-Bin, Putaway dirigido y olas de picking**: No requeridos en bodegas medianas sin radiofrecuencia dedicada.
- **Módulo de Compras y Reabastecimiento (M6 anterior)**: La gestión de órdenes de compra reside en el sistema administrativo/ERP; el WMS recibe contra documento en `3.1`.
- **Transporte y Última Milla / TMS (M8 anterior)**: Las salidas operan mayoritariamente bajo modalidad de retiro en bodega (`4.1` y `4.2`).
- **Conectores API de Ventas y Facturación SII**: Los pedidos ingresan manualmente o mediante importación CSV.
