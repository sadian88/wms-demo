import { addDays } from './clock'
import type { PickupOrder, SkuItem } from './inventory'
import { linePrice, reconcile, type ReconDay } from './invoicing'

interface WindowOptions {
  todayStr: string
  /** Largo de la ventana en días, contando hoy. */
  days: number
  inScope: (warehouseId: string) => boolean
}

export interface SalesDay {
  date: string
  invoicedCOP: number
  deliveredCOP: number
  invoicedCount: number
}

export interface SalesOverview {
  /** Un punto por día, del más antiguo a hoy; los días sin movimiento van en cero. */
  days: SalesDay[]
  invoicedCOP: number
  deliveredCOP: number
  invoicedCount: number
  /** Facturado en la ventana inmediatamente anterior, del mismo largo. */
  previousInvoicedCOP: number
  /** Variación frente a la ventana anterior. `null` si no hay base para comparar. */
  deltaPct: number | null
  /** Valor promedio por factura. `null` si no hubo facturas. */
  ticketCOP: number | null
}

const EMPTY_DAY = (date: string): ReconDay => ({
  date,
  invoicedCOP: 0,
  invoicedCount: 0,
  deliveredCOP: 0,
  deliveriesCount: 0,
})

/** Facturado y entregado por día en la ventana, comparado con la ventana anterior. */
export function salesOverview(
  orders: PickupOrder[],
  skus: SkuItem[],
  { todayStr, days, inScope }: WindowOptions
): SalesOverview {
  // Sin `fromDate`: una entrega de hoy sobre una factura vieja también cuenta.
  const byDate = new Map(
    reconcile(orders, skus, { todayStr, inScope }).byDay.map((d) => [d.date, d])
  )
  const start = addDays(todayStr, -(days * 2 - 1))
  const all = Array.from({ length: days * 2 }, (_, i) => {
    const date = addDays(start, i)
    return byDate.get(date) ?? EMPTY_DAY(date)
  })
  const previous = all.slice(0, days)
  const current = all.slice(days)

  const sum = (rows: ReconDay[], pick: (d: ReconDay) => number) =>
    rows.reduce((acc, d) => acc + pick(d), 0)
  const invoicedCOP = sum(current, (d) => d.invoicedCOP)
  const invoicedCount = sum(current, (d) => d.invoicedCount)
  const previousInvoicedCOP = sum(previous, (d) => d.invoicedCOP)

  return {
    days: current.map((d) => ({
      date: d.date,
      invoicedCOP: d.invoicedCOP,
      deliveredCOP: d.deliveredCOP,
      invoicedCount: d.invoicedCount,
    })),
    invoicedCOP,
    deliveredCOP: sum(current, (d) => d.deliveredCOP),
    invoicedCount,
    previousInvoicedCOP,
    deltaPct:
      previousInvoicedCOP > 0
        ? ((invoicedCOP - previousInvoicedCOP) / previousInvoicedCOP) * 100
        : null,
    ticketCOP: invoicedCount > 0 ? invoicedCOP / invoicedCount : null,
  }
}

export interface ProductSales {
  sku: string
  name: string
  category: string
  unitMeasure: string
  units: number
  revenueCOP: number
}

/** Ventas por producto de las facturas vigentes emitidas en la ventana, de mayor a menor valor. */
export function productSales(
  orders: PickupOrder[],
  skus: SkuItem[],
  { todayStr, days, inScope }: WindowOptions
): ProductSales[] {
  const skuMap = new Map(skus.map((s) => [s.sku, s]))
  const from = addDays(todayStr, -(days - 1))
  const bySku = new Map<string, ProductSales>()

  for (const o of orders) {
    if (!inScope(o.warehouse) || o.invoice?.status !== 'Emitida') continue
    const issued = o.invoice.issuedAt.slice(0, 10)
    if (issued < from || issued > todayStr) continue
    for (const l of o.lines) {
      const sku = skuMap.get(l.sku)
      const row = bySku.get(l.sku) ?? {
        sku: l.sku,
        name: sku?.name ?? l.sku,
        category: sku?.category ?? 'Sin categoría',
        unitMeasure: sku?.unitMeasure ?? 'Unidad',
        units: 0,
        revenueCOP: 0,
      }
      row.units += l.qtyOrdered
      row.revenueCOP += l.qtyOrdered * linePrice(l, skuMap)
      bySku.set(l.sku, row)
    }
  }
  return [...bySku.values()].sort((a, b) => b.revenueCOP - a.revenueCOP)
}

export interface CategorySales {
  category: string
  units: number
  revenueCOP: number
}

export function categorySales(products: ProductSales[]): CategorySales[] {
  const byCategory = new Map<string, CategorySales>()
  for (const p of products) {
    const row = byCategory.get(p.category) ?? {
      category: p.category,
      units: 0,
      revenueCOP: 0,
    }
    row.units += p.units
    row.revenueCOP += p.revenueCOP
    byCategory.set(p.category, row)
  }
  return [...byCategory.values()].sort((a, b) => b.revenueCOP - a.revenueCOP)
}
