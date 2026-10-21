import type { Tone } from '@/features/wms/components/kit'
import { TODAY_STR } from '@/features/wms/domain/clock'
import {
  PICKUP_OVERDUE_DAYS,
  daysBetween,
  type PickupOrder,
  type SkuItem,
} from '@/features/wms/domain/inventory'
import {
  normalizeInvoiceNumber,
  orderTotals,
} from '@/features/wms/domain/invoicing'
import { shortDate } from '../ui-helpers'

/** Estado «de negocio» de un pedido, pensado para leerse de un vistazo. */
export type OrderState =
  | 'sin_facturar'
  | 'por_entregar'
  | 'parcial'
  | 'atrasado'
  | 'entregado'
  | 'anulado'
  | 'cancelado'

export interface OrderView {
  order: PickupOrder
  state: OrderState
  totalCOP: number
  deliveredCOP: number
  pendingCOP: number
  /** Avance de la entrega, 0 a 100, ponderado por valor. */
  deliveredPct: number
  /** Días desde que el pedido quedó listo (o se creó). */
  ageDays: number
  hasDeliveries: boolean
}

const ACTIVE_STATUSES: PickupOrder['status'][] = [
  'Reservado',
  'Preparado',
  'Retiro parcial',
]

export function isActiveOrder(o: PickupOrder): boolean {
  return ACTIVE_STATUSES.includes(o.status)
}

export function buildView(
  order: PickupOrder,
  skuMap: Map<string, SkuItem>
): OrderView {
  const t = orderTotals(order, skuMap)
  const ageDays = daysBetween(order.readyAt ?? order.createdAt, TODAY_STR)
  const hasDeliveries = t.deliveredUnits > 0
  const deliveredPct =
    t.totalCOP > 0
      ? (t.deliveredCOP / t.totalCOP) * 100
      : t.orderedUnits > 0
        ? (t.deliveredUnits / t.orderedUnits) * 100
        : 0

  let state: OrderState
  if (order.invoice?.status === 'Anulada') state = 'anulado'
  else if (order.status === 'Cancelado') state = 'cancelado'
  else if (order.status === 'Entregado') state = 'entregado'
  else if (!order.invoice) state = 'sin_facturar'
  else if (ageDays > PICKUP_OVERDUE_DAYS) state = 'atrasado'
  else if (hasDeliveries) state = 'parcial'
  else state = 'por_entregar'

  return {
    order,
    state,
    totalCOP: t.totalCOP,
    deliveredCOP: t.deliveredCOP,
    pendingCOP: t.pendingCOP,
    deliveredPct,
    ageDays,
    hasDeliveries,
  }
}

/** Pedidos con factura vigente que todavía tienen mercancía por entregar. */
export function isToDeliver(v: OrderView): boolean {
  return (
    v.state === 'por_entregar' ||
    v.state === 'parcial' ||
    v.state === 'atrasado'
  )
}

export function pillFor(v: OrderView): { tone: Tone; label: string } {
  switch (v.state) {
    case 'sin_facturar':
      return { tone: 'warning', label: 'Sin facturar' }
    case 'por_entregar':
      return { tone: 'info', label: 'Por entregar' }
    case 'parcial':
      return {
        tone: 'warning',
        label: `Entrega parcial · ${Math.round(v.deliveredPct)}%`,
      }
    case 'atrasado':
      return { tone: 'danger', label: `Atrasado · ${v.ageDays} días` }
    case 'entregado':
      return { tone: 'success', label: 'Entregado' }
    case 'anulado':
      return { tone: 'danger', label: 'Anulada' }
    case 'cancelado':
      return { tone: 'neutral', label: 'Cancelado' }
  }
}

/** Orden de la lista: primero lo que necesita atención. */
export const STATE_RANK: Record<OrderState, number> = {
  atrasado: 0,
  sin_facturar: 1,
  parcial: 2,
  por_entregar: 3,
  entregado: 4,
  anulado: 5,
  cancelado: 6,
}

const digitsOf = (s: string) => s.replace(/\D/g, '')

/** Busca por cliente, NIT, n.º de factura o n.º de pedido. */
export function matchesQuery(o: PickupOrder, rawQuery: string): boolean {
  const q = rawQuery.trim().toLowerCase()
  if (!q) return true
  if (o.customer.toLowerCase().includes(q)) return true
  if (o.id.toLowerCase().includes(q)) return true
  if (o.customerRut.toLowerCase().includes(q)) return true
  const qDigits = digitsOf(q)
  if (qDigits.length >= 3 && digitsOf(o.customerRut).includes(qDigits)) {
    return true
  }
  if (o.invoice) {
    const number = normalizeInvoiceNumber(o.invoice.number)
    if (number.toLowerCase().includes(q)) return true
    if (number.includes(normalizeInvoiceNumber(rawQuery))) return true
  }
  return false
}

/** «Porcelanato Pulido Calacatta 60x120 cm (Caja 1.44 m²)» → sin el paréntesis final. */
export function shortName(name: string): string {
  return name.replace(/\s*\([^)]*\)\s*$/, '').trim()
}

/** 2026-10-18 15:20 → «18 oct. · 15:20» */
export function stamp(ts: string): string {
  const time = ts.slice(11, 16)
  return time ? `${shortDate(ts)} · ${time}` : shortDate(ts)
}

export const CHANNELS: PickupOrder['channel'][] = ['Mostrador', 'Obra', 'Web']

/** Roles que pueden hacer cada acción de esta pantalla. */
export const CAN_CREATE_ORDER = ['ADM', 'JB', 'ASE']
export const CAN_INVOICE = ['ADM', 'JB', 'CAJ']
export const CAN_GO_DELIVER = ['ADM', 'JB', 'OPE']
export const CAN_CANCEL_ORDER = ['ADM', 'JB', 'ASE']

/** «Caja» → «cajas», «Unidad» → «unidades», «m²» → «m²». */
export function unitPlural(unit: string): string {
  const u = unit.toLowerCase()
  if (['m²', 'm2', 'm', 'kg', 'g'].includes(u)) return u
  if (u.endsWith('ón')) return `${u.slice(0, -2)}ones`
  if (/[aeiou]$/.test(u)) return `${u}s`
  return `${u}es`
}
