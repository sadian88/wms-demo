import { describe, expect, it } from 'vitest'
import { addDays } from './clock'
import { categorySales, productSales, salesOverview } from './dashboard'
import type { PickupOrder, SkuItem } from './inventory'

const TODAY = '2026-10-20'

const skus: SkuItem[] = [
  {
    sku: 'POR-1',
    name: 'Porcelanato 1',
    category: 'Porcelanatos',
    unitMeasure: 'Caja',
    unitCost: 100,
    unitPrice: 200,
    maxDiscountPct: 5,
    requiresExpiry: false,
  },
  {
    sku: 'ADH-1',
    name: 'Adhesivo 1',
    category: 'Adhesivos y Morteros',
    unitMeasure: 'Saco',
    unitCost: 10,
    unitPrice: 50,
    maxDiscountPct: 5,
    requiresExpiry: false,
  },
]

function order(
  id: string,
  issuedAt: string,
  lines: { sku: string; qty: number; picked?: number }[],
  overrides: Partial<PickupOrder> = {}
): PickupOrder {
  return {
    id,
    createdAt: issuedAt,
    readyAt: null,
    customer: 'Cliente',
    customerRut: '1',
    channel: 'Mostrador',
    warehouse: 'BOD-CEN-01',
    status: 'Reservado',
    lines: lines.map((l) => ({
      sku: l.sku,
      qtyOrdered: l.qty,
      qtyPickedUp: l.picked ?? 0,
      allocations: [],
    })),
    pickups: [],
    invoice: {
      number: `FV-${id}`,
      issuedAt,
      status: 'Emitida',
      paymentMethod: 'Efectivo',
      source: 'Caja',
      issuedBy: 'Caja',
    },
    ...overrides,
  }
}

const opts = { todayStr: TODAY, days: 7, inScope: () => true }

describe('addDays', () => {
  it('cruza el cambio de mes y de año', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01')
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31')
  })
})

describe('salesOverview', () => {
  it('rellena con ceros los días sin movimiento y termina hoy', () => {
    const o = salesOverview(
      [order('A', '2026-10-18', [{ sku: 'POR-1', qty: 2 }])],
      skus,
      opts
    )
    expect(o.days).toHaveLength(7)
    expect(o.days[0].date).toBe('2026-10-14')
    expect(o.days[6].date).toBe(TODAY)
    expect(o.days.find((d) => d.date === '2026-10-18')?.invoicedCOP).toBe(400)
    expect(o.days.find((d) => d.date === '2026-10-19')?.invoicedCOP).toBe(0)
    expect(o.invoicedCOP).toBe(400)
    expect(o.invoicedCount).toBe(1)
    expect(o.ticketCOP).toBe(400)
  })

  it('compara con la ventana anterior y no inventa variación sin base', () => {
    const orders = [
      order('A', '2026-10-10', [{ sku: 'POR-1', qty: 1 }]), // ventana anterior: 200
      order('B', '2026-10-19', [{ sku: 'POR-1', qty: 3 }]), // ventana actual: 600
    ]
    expect(salesOverview(orders, skus, opts).deltaPct).toBe(200)
    expect(salesOverview([orders[1]], skus, opts).deltaPct).toBeNull()
  })

  it('ignora facturas anuladas y bodegas fuera de alcance', () => {
    const voided = order('A', '2026-10-19', [{ sku: 'POR-1', qty: 1 }])
    voided.invoice!.status = 'Anulada'
    const other = order('B', '2026-10-19', [{ sku: 'POR-1', qty: 1 }], {
      warehouse: 'BOD-MOR-04',
    })
    const o = salesOverview([voided, other], skus, {
      ...opts,
      inScope: (w) => w === 'BOD-CEN-01',
    })
    expect(o.invoicedCOP).toBe(0)
    expect(o.ticketCOP).toBeNull()
  })

  it('cuenta la entrega de hoy aunque la factura sea anterior a la ventana', () => {
    const o = order('A', '2026-09-01', [{ sku: 'POR-1', qty: 2, picked: 1 }], {
      pickups: [
        {
          ts: `${TODAY} 10:00`,
          receivedByName: 'X',
          receivedByRut: '1',
          docRef: 'REM-1',
          items: [{ sku: 'POR-1', qty: 1 }],
        },
      ],
    })
    const ov = salesOverview([o], skus, opts)
    expect(ov.days[6].deliveredCOP).toBe(200)
    expect(ov.invoicedCOP).toBe(0)
  })
})

describe('productSales y categorySales', () => {
  const orders = [
    order('A', '2026-10-19', [
      { sku: 'POR-1', qty: 2 },
      { sku: 'ADH-1', qty: 10 },
    ]),
    order('B', '2026-10-20', [{ sku: 'ADH-1', qty: 4 }]),
    order('C', '2026-09-01', [{ sku: 'POR-1', qty: 99 }]), // fuera de la ventana
  ]

  it('suma por producto dentro de la ventana y ordena por valor', () => {
    const rows = productSales(orders, skus, opts)
    expect(rows.map((r) => r.sku)).toEqual(['ADH-1', 'POR-1'])
    expect(rows[0]).toMatchObject({ units: 14, revenueCOP: 700 })
    expect(rows[1]).toMatchObject({ units: 2, revenueCOP: 400 })
  })

  it('agrupa por categoría', () => {
    const cats = categorySales(productSales(orders, skus, opts))
    expect(cats).toEqual([
      { category: 'Adhesivos y Morteros', units: 14, revenueCOP: 700 },
      { category: 'Porcelanatos', units: 2, revenueCOP: 400 },
    ])
  })
})
