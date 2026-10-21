import {
  PAYMENT_METHODS,
  PICKUP_OVERDUE_DAYS,
  daysBetween,
  type OrderLine,
  type PaymentMethod,
  type PickupOrder,
  type SkuItem,
} from './inventory'

/* -------------------------------------------------------------------------- */
/*  Valoración de pedidos y facturas                                           */
/* -------------------------------------------------------------------------- */

export function linePrice(
  line: OrderLine,
  skuMap: Map<string, SkuItem>
): number {
  return line.unitPrice ?? skuMap.get(line.sku)?.unitPrice ?? 0
}

export function orderTotals(order: PickupOrder, skuMap: Map<string, SkuItem>) {
  let orderedUnits = 0
  let deliveredUnits = 0
  let totalCOP = 0
  let deliveredCOP = 0
  for (const l of order.lines) {
    const price = linePrice(l, skuMap)
    orderedUnits += l.qtyOrdered
    deliveredUnits += l.qtyPickedUp
    totalCOP += l.qtyOrdered * price
    deliveredCOP += l.qtyPickedUp * price
  }
  return {
    orderedUnits,
    deliveredUnits,
    pendingUnits: orderedUnits - deliveredUnits,
    totalCOP,
    deliveredCOP,
    pendingCOP: totalCOP - deliveredCOP,
  }
}

/** Una factura emitida y vigente habilita la entrega en bodega. */
export function canDeliver(order: PickupOrder): boolean {
  return (
    order.invoice?.status === 'Emitida' &&
    (order.status === 'Reservado' ||
      order.status === 'Preparado' ||
      order.status === 'Retiro parcial')
  )
}

export type DeliveryBlock =
  'sin_factura' | 'factura_anulada' | 'ya_entregado' | 'cancelado'

export function deliveryBlockReason(order: PickupOrder): DeliveryBlock | null {
  // Una factura anulada explica mejor el bloqueo que el estado «Cancelado» del pedido.
  if (order.invoice?.status === 'Anulada') return 'factura_anulada'
  if (order.status === 'Entregado') return 'ya_entregado'
  if (order.status === 'Cancelado') return 'cancelado'
  if (!order.invoice) return 'sin_factura'
  return null
}

export const DELIVERY_BLOCK_MESSAGE: Record<DeliveryBlock, string> = {
  sin_factura:
    'Este pedido aún no tiene factura. Pásalo por caja antes de entregar.',
  factura_anulada: 'La factura fue anulada. No se puede entregar mercancía.',
  ya_entregado: 'Esta factura ya fue entregada completa.',
  cancelado: 'El pedido está cancelado.',
}

/** Normaliza un número de factura para comparar: FV 10452 = fv-10452. */
export function normalizeInvoiceNumber(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^([A-Z]+)(\d)/, '$1-$2')
}

export function findOrderByInvoice(
  orders: PickupOrder[],
  rawNumber: string
): PickupOrder | undefined {
  const target = normalizeInvoiceNumber(rawNumber)
  if (!target) return undefined
  const exact = orders.find(
    (o) => o.invoice && normalizeInvoiceNumber(o.invoice.number) === target
  )
  if (exact) return exact
  // Permite buscar solo por el consecutivo (10452) sin escribir el prefijo.
  const digits = target.replace(/\D/g, '')
  if (digits.length < 3) return undefined
  const matches = orders.filter(
    (o) =>
      o.invoice &&
      normalizeInvoiceNumber(o.invoice.number).replace(/\D/g, '') === digits
  )
  return matches.length === 1 ? matches[0] : undefined
}

/* -------------------------------------------------------------------------- */
/*  Importación de facturas desde CSV (Siigo u otros)                          */
/* -------------------------------------------------------------------------- */

export interface InvoiceImportIssue {
  level: 'error' | 'warning'
  message: string
}

export interface ParsedInvoiceLine {
  sku: string
  skuName: string
  /** Cantidad en unidad base del SKU (cajas, sacos…). */
  qty: number
  unitPrice: number
  note?: string
}

export interface ParsedInvoice {
  number: string
  issuedAt: string
  customer: string
  customerNit: string
  advisor: string
  paymentMethod: PaymentMethod
  warehouse: string
  lines: ParsedInvoiceLine[]
  totalCOP: number
  voided: boolean
  /** importar = crea pedido y reserva · anular = anula una factura ya importada · omitir = no hace nada */
  action: 'importar' | 'anular' | 'omitir'
  issues: InvoiceImportIssue[]
}

export interface InvoiceImportContext {
  skus: SkuItem[]
  warehouseIds: string[]
  defaultWarehouse: string
  /** Disponible por `${warehouse}|${sku}` para validar reserva. */
  availability: Map<string, number>
  /** Facturas ya cargadas (número normalizado → pedido). */
  existingInvoices: Map<
    string,
    { orderId: string; voided: boolean; delivered: boolean }
  >
  /** Prefijo que se antepone cuando el archivo trae solo el consecutivo (10452). */
  defaultPrefix: string
  todayStr: string
}

export interface InvoiceImportPreview {
  invoices: ParsedInvoice[]
  /** Errores que impiden leer el archivo completo (columnas faltantes, vacío). */
  fatal: string[]
  detectedColumns: Record<string, string>
}

type Field =
  | 'invoice'
  | 'date'
  | 'nit'
  | 'customer'
  | 'sku'
  | 'qty'
  | 'unit'
  | 'price'
  | 'warehouse'
  | 'payment'
  | 'advisor'
  | 'status'

const HEADER_ALIASES: Record<Field, string[]> = {
  invoice: [
    'factura',
    'nfactura',
    'numerofactura',
    'nrofactura',
    'numero',
    'consecutivo',
    'documento',
    'comprobante',
    'nrodocumento',
    'numerodocumento',
  ],
  date: ['fecha', 'fechaelaboracion', 'fechafactura', 'fechaemision'],
  nit: [
    'nit',
    'identificacion',
    'cedula',
    'ccnit',
    'nitcliente',
    'documentocliente',
    'idcliente',
  ],
  customer: ['cliente', 'razonsocial', 'tercero', 'nombrecliente', 'nombre'],
  sku: [
    'sku',
    'codigo',
    'codigoproducto',
    'referencia',
    'producto',
    'codproducto',
    'item',
  ],
  qty: ['cantidad', 'cant', 'qty', 'unidades'],
  unit: ['unidad', 'unidadmedida', 'um'],
  price: [
    'precio',
    'preciounitario',
    'valorunitario',
    'vrunitario',
    'vlrunitario',
    'valorunit',
    'preciounit',
  ],
  warehouse: ['bodega', 'almacen', 'sede'],
  payment: [
    'mediodepago',
    'mediopago',
    'formadepago',
    'formapago',
    'pago',
    'fpago',
  ],
  advisor: ['vendedor', 'asesor', 'comercial', 'nombrevendedor'],
  status: ['estado', 'estadofactura'],
}

function normalizeHeader(h: string): string {
  return h
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

function detectDelimiter(headerLine: string): string {
  const counts = [';', '\t', ','].map((d) => ({
    d,
    n: headerLine.split(d).length - 1,
  }))
  counts.sort((a, b) => b.n - a.n)
  return counts[0].n > 0 ? counts[0].d : ','
}

/** Divide una línea CSV respetando comillas. */
export function splitCsvLine(line: string, delimiter: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"'
        i++
      } else if (ch === '"') {
        inQuotes = false
      } else {
        cur += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === delimiter) {
      out.push(cur.trim())
      cur = ''
    } else {
      cur += ch
    }
  }
  out.push(cur.trim())
  return out
}

/** Interpreta números en formato colombiano (1.234,50) o internacional (1,234.50). */
export function parseLocaleNumber(raw: string): number {
  let s = raw.replace(/[^\d.,-]/g, '')
  if (!s) return NaN
  const lastDot = s.lastIndexOf('.')
  const lastComma = s.lastIndexOf(',')
  if (lastDot !== -1 && lastComma !== -1) {
    // El último separador es el decimal.
    if (lastComma > lastDot) s = s.replace(/\./g, '').replace(',', '.')
    else s = s.replace(/,/g, '')
  } else if (lastComma !== -1) {
    const after = s.length - lastComma - 1
    s =
      after === 3 && s.split(',').length > 1
        ? s.replace(/,/g, '')
        : s.replace(',', '.')
  } else if (lastDot !== -1) {
    const after = s.length - lastDot - 1
    if (after === 3 && /^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '')
  }
  return Number(s)
}

function parseDate(raw: string, fallback: string): string {
  const s = raw.trim()
  if (!s) return fallback
  let m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/)
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`
  m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/)
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
  return fallback
}

function parsePayment(raw: string): PaymentMethod {
  const s = normalizeHeader(raw)
  if (!s) return 'Crédito'
  if (s.includes('efect')) return 'Efectivo'
  if (s.includes('transf') || s.includes('consign') || s.includes('pse'))
    return 'Transferencia'
  if (s.includes('tarj') || s.includes('datafono')) return 'Tarjeta'
  if (s.includes('cheq')) return 'Cheque'
  if (s.includes('mixt')) return 'Mixto'
  if (s.includes('cred')) return 'Crédito'
  const direct = PAYMENT_METHODS.find((p) => normalizeHeader(p) === s)
  return direct ?? 'Crédito'
}

function toBaseQty(
  qty: number,
  unitRaw: string,
  sku: SkuItem
): { qty: number; note?: string } {
  const unit = unitRaw.trim()
  if (!unit) return { qty }
  const u = normalizeHeader(unit)
  if (u === normalizeHeader(sku.unitMeasure)) return { qty }
  const conv = sku.conversions?.find((c) => normalizeHeader(c.targetUnit) === u)
  if (!conv || conv.factor <= 0) return { qty }
  const base = qty / conv.factor
  const rounded = Math.ceil(base - 1e-9)
  return {
    qty: rounded,
    note: `${qty} ${conv.targetUnit} → ${rounded} ${sku.unitMeasure.toLowerCase()}(s)`,
  }
}

export function parseInvoicesCsv(
  text: string,
  ctx: InvoiceImportContext
): InvoiceImportPreview {
  const fatal: string[] = []
  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0)

  if (lines.length < 2) {
    return {
      invoices: [],
      fatal: ['El archivo está vacío o solo tiene encabezados.'],
      detectedColumns: {},
    }
  }

  const delimiter = detectDelimiter(lines[0])
  const headers = splitCsvLine(lines[0], delimiter)
  const colIndex = new Map<Field, number>()
  const detectedColumns: Record<string, string> = {}
  headers.forEach((h, i) => {
    const norm = normalizeHeader(h)
    for (const [field, aliases] of Object.entries(HEADER_ALIASES) as [
      Field,
      string[],
    ][]) {
      if (!colIndex.has(field) && aliases.includes(norm)) {
        colIndex.set(field, i)
        detectedColumns[field] = h
      }
    }
  })

  for (const required of ['invoice', 'sku', 'qty'] as Field[]) {
    if (!colIndex.has(required)) {
      const label = {
        invoice: 'N° de factura',
        sku: 'SKU o código',
        qty: 'cantidad',
      }[required as 'invoice' | 'sku' | 'qty']
      fatal.push(`No se encontró la columna de ${label}.`)
    }
  }
  if (fatal.length > 0) return { invoices: [], fatal, detectedColumns }

  const skuMap = new Map(ctx.skus.map((s) => [s.sku.toUpperCase(), s]))
  const get = (cols: string[], f: Field) => {
    const i = colIndex.get(f)
    return i === undefined ? '' : (cols[i] ?? '').trim()
  }

  const grouped = new Map<string, ParsedInvoice>()
  // Disponibilidad que se va consumiendo a medida que se leen facturas.
  const remaining = new Map(ctx.availability)

  lines.slice(1).forEach((row, idx) => {
    const cols = splitCsvLine(row, delimiter)
    const rowNo = idx + 2
    const numberRaw = get(cols, 'invoice')
    if (!numberRaw) return
    const normalized = normalizeInvoiceNumber(numberRaw)
    const number = /^\d+$/.test(normalized)
      ? `${ctx.defaultPrefix}-${normalized}`
      : normalized

    let inv = grouped.get(number)
    if (!inv) {
      const wh = get(cols, 'warehouse') || ctx.defaultWarehouse
      const statusRaw = get(cols, 'status')
      inv = {
        number,
        issuedAt: parseDate(get(cols, 'date'), ctx.todayStr),
        customer: get(cols, 'customer') || 'Cliente sin nombre',
        customerNit: get(cols, 'nit'),
        advisor: get(cols, 'advisor'),
        paymentMethod: parsePayment(get(cols, 'payment')),
        warehouse: wh,
        lines: [],
        totalCOP: 0,
        voided: /anul/i.test(statusRaw),
        action: 'importar',
        issues: [],
      }
      if (!ctx.warehouseIds.includes(wh)) {
        inv.issues.push({
          level: 'error',
          message: `La bodega «${wh}» no existe en la estructura activa.`,
        })
      }
      if (!inv.customerNit) {
        inv.issues.push({
          level: 'warning',
          message: 'La factura no trae NIT o cédula del cliente.',
        })
      }
      grouped.set(number, inv)
    }

    const skuCode = get(cols, 'sku').toUpperCase()
    const sku = skuMap.get(skuCode)
    if (!sku) {
      inv.issues.push({
        level: 'error',
        message: `Fila ${rowNo}: el SKU «${get(cols, 'sku')}» no existe en el catálogo.`,
      })
      return
    }
    const qtyRaw = parseLocaleNumber(get(cols, 'qty'))
    if (!Number.isFinite(qtyRaw) || qtyRaw <= 0) {
      inv.issues.push({
        level: 'error',
        message: `Fila ${rowNo}: cantidad inválida («${get(cols, 'qty')}»).`,
      })
      return
    }
    const converted = toBaseQty(qtyRaw, get(cols, 'unit'), sku)
    let qty = converted.qty
    if (!Number.isInteger(qty)) {
      qty = Math.ceil(qty)
      inv.issues.push({
        level: 'warning',
        message: `Fila ${rowNo}: la cantidad de ${sku.sku} no es entera; se redondeó a ${qty}.`,
      })
    }
    const priceRaw = parseLocaleNumber(get(cols, 'price'))
    const unitPrice =
      Number.isFinite(priceRaw) && priceRaw >= 0 ? priceRaw : sku.unitPrice

    const existingLine = inv.lines.find((l) => l.sku === sku.sku)
    if (existingLine) {
      existingLine.qty += qty
    } else {
      inv.lines.push({
        sku: sku.sku,
        skuName: sku.name,
        qty,
        unitPrice,
        note: converted.note,
      })
    }
    inv.totalCOP += qty * unitPrice
  })

  const invoices = [...grouped.values()]

  for (const inv of invoices) {
    const existing = ctx.existingInvoices.get(inv.number)

    if (inv.voided) {
      if (existing && !existing.voided) {
        inv.action = 'anular'
        inv.issues = inv.issues.filter((i) => i.level !== 'error')
        if (existing.delivered) {
          inv.issues.push({
            level: 'warning',
            message:
              'Ya tiene entregas registradas: quedará marcada para revisión en Conciliación.',
          })
        }
      } else if (existing?.voided) {
        inv.action = 'omitir'
        inv.issues = [
          { level: 'warning', message: 'Ya estaba anulada en el sistema.' },
        ]
      } else {
        inv.action = 'omitir'
        inv.issues = [
          {
            level: 'warning',
            message: 'Viene anulada y nunca se cargó: se omite.',
          },
        ]
      }
      continue
    }

    if (existing) {
      inv.action = 'omitir'
      inv.issues = [
        {
          level: 'warning',
          message: `Ya cargada en el pedido ${existing.orderId}: se omite para no duplicar la reserva.`,
        },
      ]
      continue
    }

    if (
      inv.lines.length === 0 &&
      !inv.issues.some((i) => i.level === 'error')
    ) {
      inv.issues.push({
        level: 'error',
        message: 'La factura no tiene líneas válidas.',
      })
    }

    // Validar stock solo si no hay errores previos de bodega.
    if (!inv.issues.some((i) => i.level === 'error')) {
      for (const l of inv.lines) {
        const key = `${inv.warehouse}|${l.sku}`
        const avail = remaining.get(key) ?? 0
        if (avail < l.qty) {
          inv.issues.push({
            level: 'error',
            message: `Stock insuficiente de ${l.sku} en ${inv.warehouse}: disponible ${avail}, factura ${l.qty}.`,
          })
        }
      }
      if (!inv.issues.some((i) => i.level === 'error')) {
        for (const l of inv.lines) {
          const key = `${inv.warehouse}|${l.sku}`
          remaining.set(key, (remaining.get(key) ?? 0) - l.qty)
        }
      }
    }

    if (inv.issues.some((i) => i.level === 'error')) inv.action = 'omitir'
  }

  return { invoices, fatal, detectedColumns }
}

export const SIIGO_CSV_TEMPLATE = `factura;fecha;nit;cliente;sku;cantidad;precio;bodega;medio de pago;vendedor
FV-10452;2026-10-20;900.123.456-7;Constructora Andina SAS;POR-60120-CAL;30;142000;BOD-CEN-01;Transferencia;Laura Gómez
FV-10452;2026-10-20;900.123.456-7;Constructora Andina SAS;POR-20120-ROB;12;129000;BOD-CEN-01;Transferencia;Laura Gómez
FV-10453;2026-10-20;1.020.456.789;Instalaciones Norte;CER-4545-TER;40;78500;BOD-CEN-01;Efectivo;Diego Ruiz
FV-10454;2026-10-20;900.555.321-2;Remodelaciones del Valle;ADH-FLEX-25K;20;51000;BOD-MOR-04;Crédito;Diego Ruiz`

/* -------------------------------------------------------------------------- */
/*  Conciliación facturado · entregado · pendiente                             */
/* -------------------------------------------------------------------------- */

export type ReconStatus =
  'Entregada' | 'Entrega parcial' | 'Pendiente' | 'Anulada' | 'Sin facturar'

export type ReconFlag =
  'anulada_con_entregas' | 'pendiente_vencida' | 'sin_facturar_vencida'

export const RECON_FLAG_LABEL: Record<ReconFlag, string> = {
  anulada_con_entregas: 'Factura anulada con mercancía ya entregada',
  pendiente_vencida: `Facturada y sin retirar hace más de ${PICKUP_OVERDUE_DAYS} días`,
  sin_facturar_vencida: `Pedido sin facturar hace más de ${PICKUP_OVERDUE_DAYS} días (stock bloqueado)`,
}

export interface ReconRow {
  orderId: string
  invoiceNumber: string | null
  customer: string
  warehouse: string
  /** Fecha de factura, o de creación si aún no se factura. */
  date: string
  status: ReconStatus
  invoicedUnits: number
  deliveredUnits: number
  pendingUnits: number
  invoicedCOP: number
  deliveredCOP: number
  pendingCOP: number
  ageDays: number
  flags: ReconFlag[]
  lastDeliveryBy: string | null
}

export interface ReconDay {
  date: string
  invoicedCOP: number
  invoicedCount: number
  deliveredCOP: number
  deliveriesCount: number
}

export interface ReconSummary {
  rows: ReconRow[]
  exceptions: ReconRow[]
  byDay: ReconDay[]
  invoicedCOP: number
  deliveredCOP: number
  pendingCOP: number
  invoicedCount: number
  voidedCount: number
  unbilledCount: number
  deliveredPct: number
}

export function reconcile(
  orders: PickupOrder[],
  skus: SkuItem[],
  opts: {
    todayStr: string
    inScope: (wh: string) => boolean
    fromDate?: string
  }
): ReconSummary {
  const skuMap = new Map(skus.map((s) => [s.sku, s]))
  const rows: ReconRow[] = []
  const dayMap = new Map<string, ReconDay>()
  const day = (d: string) => {
    let r = dayMap.get(d)
    if (!r) {
      r = {
        date: d,
        invoicedCOP: 0,
        invoicedCount: 0,
        deliveredCOP: 0,
        deliveriesCount: 0,
      }
      dayMap.set(d, r)
    }
    return r
  }

  let invoicedCOP = 0
  let deliveredCOP = 0
  let pendingCOP = 0
  let invoicedCount = 0
  let voidedCount = 0
  let unbilledCount = 0

  for (const o of orders) {
    if (!opts.inScope(o.warehouse)) continue
    if (o.status === 'Cancelado' && !o.invoice) continue
    const t = orderTotals(o, skuMap)
    const inv = o.invoice
    const date = inv?.issuedAt ?? o.createdAt
    if (opts.fromDate && date < opts.fromDate) continue

    let status: ReconStatus
    if (!inv) status = 'Sin facturar'
    else if (inv.status === 'Anulada') status = 'Anulada'
    else if (o.status === 'Entregado') status = 'Entregada'
    else if (t.deliveredUnits > 0) status = 'Entrega parcial'
    else status = 'Pendiente'

    const ageDays = daysBetween(date, opts.todayStr)
    const flags: ReconFlag[] = []
    if (status === 'Anulada' && t.deliveredUnits > 0)
      flags.push('anulada_con_entregas')
    if (
      (status === 'Pendiente' || status === 'Entrega parcial') &&
      ageDays > PICKUP_OVERDUE_DAYS
    ) {
      flags.push('pendiente_vencida')
    }
    if (status === 'Sin facturar' && ageDays > PICKUP_OVERDUE_DAYS) {
      flags.push('sin_facturar_vencida')
    }

    const lastPickup = o.pickups[o.pickups.length - 1]
    const countsAsInvoiced = status !== 'Sin facturar' && status !== 'Anulada'

    rows.push({
      orderId: o.id,
      invoiceNumber: inv?.number ?? null,
      customer: o.customer,
      warehouse: o.warehouse,
      date,
      status,
      invoicedUnits: countsAsInvoiced ? t.orderedUnits : 0,
      deliveredUnits: t.deliveredUnits,
      pendingUnits: countsAsInvoiced ? t.pendingUnits : 0,
      invoicedCOP: countsAsInvoiced ? t.totalCOP : 0,
      deliveredCOP: t.deliveredCOP,
      pendingCOP: countsAsInvoiced ? t.pendingCOP : 0,
      ageDays,
      flags,
      lastDeliveryBy: lastPickup?.deliveredBy ?? null,
    })

    if (countsAsInvoiced) {
      invoicedCOP += t.totalCOP
      deliveredCOP += t.deliveredCOP
      pendingCOP += t.pendingCOP
      invoicedCount++
      const d = day(date)
      d.invoicedCOP += t.totalCOP
      d.invoicedCount++
    }
    if (status === 'Anulada') voidedCount++
    if (status === 'Sin facturar') unbilledCount++

    for (const p of o.pickups) {
      const pd = p.ts.slice(0, 10)
      if (opts.fromDate && pd < opts.fromDate) continue
      const value = p.items.reduce(
        (s, it) =>
          s +
          it.qty *
            (o.lines.find((l) => l.sku === it.sku)?.unitPrice ??
              skuMap.get(it.sku)?.unitPrice ??
              0),
        0
      )
      const d = day(pd)
      d.deliveredCOP += value
      d.deliveriesCount++
    }
  }

  const order: Record<ReconStatus, number> = {
    Anulada: 0,
    'Sin facturar': 1,
    Pendiente: 2,
    'Entrega parcial': 3,
    Entregada: 4,
  }
  rows.sort(
    (a, b) =>
      b.flags.length - a.flags.length ||
      order[a.status] - order[b.status] ||
      b.date.localeCompare(a.date)
  )

  return {
    rows,
    exceptions: rows.filter((r) => r.flags.length > 0),
    byDay: [...dayMap.values()].sort((a, b) => b.date.localeCompare(a.date)),
    invoicedCOP,
    deliveredCOP,
    pendingCOP,
    invoicedCount,
    voidedCount,
    unbilledCount,
    deliveredPct:
      invoicedCOP > 0 ? Math.min(100, (deliveredCOP / invoicedCOP) * 100) : 0,
  }
}

/** Genera un prefijo de SKU legible a partir de la categoría. */
const CATEGORY_PREFIX: Record<string, string> = {
  Porcelanatos: 'POR',
  Cerámicas: 'CER',
  Revestimientos: 'REV',
  'Adhesivos y Morteros': 'ADH',
  'Químicos y Selladores': 'QUI',
  'Perfiles y Accesorios': 'PER',
}

export function suggestSku(category: string, existing: string[]): string {
  const prefix =
    CATEGORY_PREFIX[category] ??
    category
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^A-Za-z]/g, '')
      .slice(0, 3)
      .toUpperCase()
      .padEnd(3, 'X')
  let max = 0
  const re = new RegExp(`^${prefix}-(\\d{3,})$`)
  for (const s of existing) {
    const m = s.match(re)
    if (m) max = Math.max(max, Number(m[1]))
  }
  return `${prefix}-${String(max + 1).padStart(4, '0')}`
}
