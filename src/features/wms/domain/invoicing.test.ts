import { describe, expect, it } from 'vitest'
import { TODAY_STR } from './clock'
import type { PickupOrder, SkuItem } from './inventory'
import {
  canDeliver,
  deliveryBlockReason,
  findOrderByInvoice,
  normalizeInvoiceNumber,
  orderTotals,
  parseInvoicesCsv,
  parseLocaleNumber,
  reconcile,
  suggestSku,
  type InvoiceImportContext,
} from './invoicing'

const skus: SkuItem[] = [
  {
    sku: 'POR-60120-CAL',
    name: 'Porcelanato Calacatta 60x120',
    category: 'Porcelanatos',
    unitMeasure: 'Caja',
    unitCost: 100000,
    unitPrice: 140000,
    maxDiscountPct: 8,
    requiresExpiry: false,
    conversions: [{ targetUnit: 'm²', factor: 1.44 }],
  },
  {
    sku: 'ADH-FLEX-25K',
    name: 'Adhesivo flexible 25 kg',
    category: 'Adhesivos y Morteros',
    unitMeasure: 'Saco',
    unitCost: 38000,
    unitPrice: 49500,
    maxDiscountPct: 5,
    requiresExpiry: true,
  },
]

function order(overrides: Partial<PickupOrder> = {}): PickupOrder {
  return {
    id: 'PED-1',
    createdAt: '2026-10-19',
    readyAt: null,
    customer: 'Constructora Sur',
    customerRut: '900.111.222-3',
    channel: 'Mostrador',
    warehouse: 'BOD-CEN-01',
    status: 'Reservado',
    lines: [
      { sku: 'POR-60120-CAL', qtyOrdered: 10, qtyPickedUp: 4, allocations: [] },
    ],
    pickups: [],
    invoice: {
      number: 'FV-10452',
      issuedAt: '2026-10-19',
      status: 'Emitida',
      paymentMethod: 'Transferencia',
      source: 'Siigo (CSV)',
      issuedBy: 'Natalia Cano',
    },
    ...overrides,
  }
}

function ctx(
  overrides: Partial<InvoiceImportContext> = {}
): InvoiceImportContext {
  return {
    skus,
    warehouseIds: ['BOD-CEN-01', 'BOD-MOR-04'],
    defaultWarehouse: 'BOD-CEN-01',
    availability: new Map([
      ['BOD-CEN-01|POR-60120-CAL', 50],
      ['BOD-CEN-01|ADH-FLEX-25K', 5],
    ]),
    existingInvoices: new Map(),
    defaultPrefix: 'FV',
    todayStr: TODAY_STR,
    ...overrides,
  }
}

describe('números de factura', () => {
  it('normaliza prefijos y separadores', () => {
    expect(normalizeInvoiceNumber('fv 10452')).toBe('FV-10452')
    expect(normalizeInvoiceNumber('FV10452')).toBe('FV-10452')
    expect(normalizeInvoiceNumber(' fv_10452 ')).toBe('FV-10452')
  })

  it('encuentra el pedido por número completo o solo por consecutivo', () => {
    const orders = [order(), order({ id: 'PED-2', invoice: null })]
    expect(findOrderByInvoice(orders, 'fv-10452')?.id).toBe('PED-1')
    expect(findOrderByInvoice(orders, '10452')?.id).toBe('PED-1')
    expect(findOrderByInvoice(orders, 'FV-99999')).toBeUndefined()
    expect(findOrderByInvoice(orders, '12')).toBeUndefined()
  })
})

describe('lectura de números en formato colombiano', () => {
  it.each([
    ['1.234,50', 1234.5],
    ['105000', 105000],
    ['$ 1.200.000', 1200000],
    ['1,234.50', 1234.5],
    ['12,5', 12.5],
    ['28.8', 28.8],
  ])('interpreta %s como %s', (raw, expected) => {
    expect(parseLocaleNumber(raw)).toBe(expected)
  })
})

describe('entrega validada con factura', () => {
  it('permite entregar solo con factura emitida y saldo', () => {
    expect(canDeliver(order())).toBe(true)
    expect(deliveryBlockReason(order())).toBeNull()
  })

  it('bloquea pedidos sin factura, con factura anulada, entregados o cancelados', () => {
    expect(deliveryBlockReason(order({ invoice: null }))).toBe('sin_factura')
    expect(
      deliveryBlockReason(
        order({ invoice: { ...order().invoice!, status: 'Anulada' } })
      )
    ).toBe('factura_anulada')
    expect(deliveryBlockReason(order({ status: 'Entregado' }))).toBe(
      'ya_entregado'
    )
    expect(deliveryBlockReason(order({ status: 'Cancelado' }))).toBe(
      'cancelado'
    )
  })

  it('valora el pedido con el precio de venta, no con el costo', () => {
    const map = new Map(skus.map((s) => [s.sku, s]))
    const t = orderTotals(order(), map)
    expect(t.totalCOP).toBe(10 * 140000)
    expect(t.deliveredCOP).toBe(4 * 140000)
    expect(t.pendingUnits).toBe(6)
  })
})

describe('importación de facturas desde CSV', () => {
  const csv = `factura;fecha;nit;cliente;sku;cantidad;precio;medio de pago;vendedor
FV-10500;20/10/2026;900.123.456-7;Constructora Andina;POR-60120-CAL;10;142.000;Transferencia;Laura
FV-10500;20/10/2026;900.123.456-7;Constructora Andina;ADH-FLEX-25K;2;51.000;Transferencia;Laura
FV-10501;2026-10-20;1.020.456.789;Instalaciones Norte;POR-60120-CAL;20;;Efectivo;Diego`

  it('agrupa las líneas por factura y detecta separador y columnas', () => {
    const res = parseInvoicesCsv(csv, ctx())
    expect(res.fatal).toEqual([])
    expect(res.invoices).toHaveLength(2)
    const first = res.invoices[0]
    expect(first.number).toBe('FV-10500')
    expect(first.issuedAt).toBe('2026-10-20')
    expect(first.lines).toHaveLength(2)
    expect(first.totalCOP).toBe(10 * 142000 + 2 * 51000)
    expect(first.paymentMethod).toBe('Transferencia')
    expect(first.action).toBe('importar')
    // Sin precio en el archivo se usa el del catálogo.
    expect(res.invoices[1].lines[0].unitPrice).toBe(140000)
    expect(res.invoices[1].paymentMethod).toBe('Efectivo')
  })

  it('consume el stock en orden: la segunda factura no puede reservar lo ya comprometido', () => {
    const res = parseInvoicesCsv(csv, ctx())
    // 50 disponibles: 10 + 20 caben. Con solo 25 disponibles la segunda no cabe.
    expect(res.invoices.every((i) => i.action === 'importar')).toBe(true)
    const tight = parseInvoicesCsv(
      csv,
      ctx({
        availability: new Map([
          ['BOD-CEN-01|POR-60120-CAL', 25],
          ['BOD-CEN-01|ADH-FLEX-25K', 5],
        ]),
      })
    )
    expect(tight.invoices[0].action).toBe('importar')
    expect(tight.invoices[1].action).toBe('omitir')
    expect(
      tight.invoices[1].issues.some((i) =>
        i.message.includes('Stock insuficiente')
      )
    ).toBe(true)
  })

  it('rechaza SKUs que no existen y avisa de la fila', () => {
    const res = parseInvoicesCsv(
      'factura,sku,cantidad\nFV-1,NO-EXISTE,3',
      ctx()
    )
    expect(res.invoices[0].action).toBe('omitir')
    const error = res.invoices[0].issues.find((i) => i.level === 'error')
    expect(error?.message).toContain('NO-EXISTE')
  })

  it('omite facturas ya cargadas para no duplicar la reserva', () => {
    const res = parseInvoicesCsv(
      csv,
      ctx({
        existingInvoices: new Map([
          ['FV-10500', { orderId: 'PED-9', voided: false, delivered: false }],
        ]),
      })
    )
    expect(res.invoices[0].action).toBe('omitir')
    expect(res.invoices[0].issues[0].message).toContain('PED-9')
    expect(res.invoices[1].action).toBe('importar')
  })

  it('anula una factura ya cargada cuando el archivo la trae anulada', () => {
    const res = parseInvoicesCsv(
      'factura,sku,cantidad,estado\nFV-10500,POR-60120-CAL,10,Anulada',
      ctx({
        existingInvoices: new Map([
          ['FV-10500', { orderId: 'PED-9', voided: false, delivered: true }],
        ]),
      })
    )
    expect(res.invoices[0].action).toBe('anular')
    expect(res.invoices[0].issues[0].level).toBe('warning')
  })

  it('convierte m² a cajas con el factor del producto, redondeando hacia arriba', () => {
    const res = parseInvoicesCsv(
      'factura,sku,cantidad,unidad\nFV-7,POR-60120-CAL,28.8,m²',
      ctx()
    )
    expect(res.invoices[0].lines[0].qty).toBe(20)
    expect(res.invoices[0].lines[0].note).toContain('m²')
    const rounded = parseInvoicesCsv(
      'factura,sku,cantidad,unidad\nFV-8,POR-60120-CAL,30,m²',
      ctx()
    )
    expect(rounded.invoices[0].lines[0].qty).toBe(21)
  })

  it('antepone el prefijo por defecto cuando solo llega el consecutivo', () => {
    const res = parseInvoicesCsv(
      'factura,sku,cantidad\n10777,POR-60120-CAL,1',
      ctx()
    )
    expect(res.invoices[0].number).toBe('FV-10777')
  })

  it('falla con un mensaje claro si faltan columnas obligatorias', () => {
    const res = parseInvoicesCsv('cliente,total\nA,100', ctx())
    expect(res.fatal.length).toBeGreaterThan(0)
    expect(res.invoices).toEqual([])
  })
})

describe('conciliación facturado · entregado · pendiente', () => {
  const all = () => true

  it('suma facturado, entregado y pendiente solo de facturas vigentes', () => {
    const delivered = order({
      id: 'PED-2',
      status: 'Entregado',
      lines: [
        { sku: 'ADH-FLEX-25K', qtyOrdered: 4, qtyPickedUp: 4, allocations: [] },
      ],
      invoice: { ...order().invoice!, number: 'FV-10453' },
    })
    const summary = reconcile([order(), delivered], skus, {
      todayStr: TODAY_STR,
      inScope: all,
    })
    expect(summary.invoicedCOP).toBe(10 * 140000 + 4 * 49500)
    expect(summary.deliveredCOP).toBe(4 * 140000 + 4 * 49500)
    expect(summary.pendingCOP).toBe(6 * 140000)
    expect(summary.invoicedCount).toBe(2)
  })

  it('marca la factura anulada con mercancía ya entregada como excepción crítica', () => {
    const voided = order({
      id: 'PED-3',
      status: 'Cancelado',
      invoice: { ...order().invoice!, number: 'FV-10441', status: 'Anulada' },
    })
    const summary = reconcile([voided], skus, {
      todayStr: TODAY_STR,
      inScope: all,
    })
    expect(summary.exceptions).toHaveLength(1)
    expect(summary.exceptions[0].flags).toContain('anulada_con_entregas')
    // Una factura anulada no cuenta como facturada.
    expect(summary.invoicedCOP).toBe(0)
  })

  it('marca como vencidas las facturas sin retirar hace más de 7 días y los pedidos sin factura', () => {
    const stale = order({
      id: 'PED-4',
      createdAt: '2026-10-08',
      invoice: {
        ...order().invoice!,
        number: 'FV-10398',
        issuedAt: '2026-10-08',
      },
    })
    const unbilled = order({
      id: 'PED-5',
      createdAt: '2026-10-01',
      invoice: null,
    })
    const summary = reconcile([stale, unbilled], skus, {
      todayStr: TODAY_STR,
      inScope: all,
    })
    const flagsById = Object.fromEntries(
      summary.rows.map((r) => [r.orderId, r.flags])
    )
    expect(flagsById['PED-4']).toContain('pendiente_vencida')
    expect(flagsById['PED-5']).toContain('sin_facturar_vencida')
    expect(summary.unbilledCount).toBe(1)
  })

  it('respeta el alcance de bodegas del usuario', () => {
    const summary = reconcile([order()], skus, {
      todayStr: TODAY_STR,
      inScope: (wh) => wh === 'BOD-OBR-02',
    })
    expect(summary.rows).toHaveLength(0)
  })
})

describe('generación automática de SKU', () => {
  it('sugiere el siguiente consecutivo por categoría', () => {
    expect(
      suggestSku('Porcelanatos', ['POR-0001', 'POR-0007', 'CER-0003'])
    ).toBe('POR-0008')
    expect(suggestSku('Cerámicas', [])).toBe('CER-0001')
  })

  it('usa tres letras de la categoría cuando no está mapeada', () => {
    expect(suggestSku('Herramientas', [])).toBe('HER-0001')
  })
})
