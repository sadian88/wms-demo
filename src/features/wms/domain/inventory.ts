export type StockState =
  | 'disponible'
  | 'reservado'
  | 'danado'
  | 'reclamo'
  | 'transito'

export type RoleCode = 'ADM' | 'JB' | 'OPE' | 'GER' | 'ASE' | 'CAJ'

export const APPROVAL_THRESHOLD_COP = 1_200_000
export const APPROVAL_THRESHOLD_USD = APPROVAL_THRESHOLD_COP
export const STALE_DAYS = 60
export const CRITICAL_STALE_DAYS = 90
export const EXPIRY_WARN_DAYS = 30
export const PICKUP_OVERDUE_DAYS = 7

export type StandardUnit =
  | 'Caja'
  | 'Saco'
  | 'Balde'
  | 'Tira'
  | 'Rollo'
  | 'Unidad'
  | 'm²'
  | 'm'
  | 'kg'
  | 'g'
  | 'Litro'
  | 'Galón'
  | string

export interface UnitConversion {
  targetUnit: StandardUnit
  factor: number // 1 unitMeasure = factor targetUnit (ej: 1 Caja = 1.44 m²)
  description?: string
}

export interface SkuItem {
  sku: string
  name: string
  category: string
  unitMeasure: StandardUnit
  /** Costo de adquisición por unidad base (valoriza el inventario). */
  unitCost: number
  /** Precio de venta por unidad base antes de IVA (valoriza facturas y pedidos). */
  unitPrice: number
  /** Descuento máximo que un asesor puede otorgar, en %. */
  maxDiscountPct: number
  requiresExpiry: boolean
  conversions?: UnitConversion[]
}

/** Margen bruto en % sobre el precio de venta. */
export function marginPct(
  sku: Pick<SkuItem, 'unitCost' | 'unitPrice'>
): number {
  if (sku.unitPrice <= 0) return 0
  return Number(
    (((sku.unitPrice - sku.unitCost) / sku.unitPrice) * 100).toFixed(1)
  )
}

export function convertBaseToSecondary(
  baseQty: number,
  factor: number
): number {
  if (factor <= 0) return baseQty
  return Number((baseQty * factor).toFixed(2))
}

export function convertSecondaryToBase(
  secondaryQty: number,
  factor: number
): number {
  if (factor <= 0) return secondaryQty
  return Number((secondaryQty / factor).toFixed(2))
}

export function formatQtyWithEquivalent(
  qty: number,
  sku?: SkuItem | null
): string {
  if (!sku) return `${qty} uds`
  const baseUnit = sku.unitMeasure
  const conv = sku.conversions?.[0]
  if (!conv || conv.factor <= 0 || conv.targetUnit === baseUnit) {
    return `${qty.toLocaleString('es-CO')} ${baseUnit.toLowerCase()}${qty !== 1 ? 's' : ''}`
  }
  const equiv = Number((qty * conv.factor).toFixed(2)).toLocaleString('es-CO', {
    maximumFractionDigits: 2,
  })
  return `${qty.toLocaleString('es-CO')} ${baseUnit.toLowerCase()}${qty !== 1 ? 's' : ''} (~${equiv} ${conv.targetUnit})`
}

export interface Partida {
  id: string
  sku: string
  warehouse: string
  expiry: string | null
  lastOutAt: string
  receivedAt: string
  supplier: string
  qty: Record<StockState, number>
}

export type MovementType =
  | 'Ingreso'
  | 'Reserva'
  | 'Liberación'
  | 'Entrega'
  | 'Daño'
  | 'Baja'
  | 'Traspaso salida'
  | 'Traspaso entrada'
  | 'Reclamo'
  | 'Reintegro'
  | 'Devolución cliente'
  | 'Devolución proveedor'
  | 'Ajuste conteo'

export interface Movement {
  id: string
  ts: string
  type: MovementType
  partidaId: string
  sku: string
  warehouse: string
  fromState: StockState | null
  toState: StockState | null
  qty: number
  ref: string
  user: string
}

export interface Allocation {
  partidaId: string
  qty: number
  expiry: string | null
}

export interface OrderLine {
  sku: string
  qtyOrdered: number
  qtyPickedUp: number
  /** Precio de venta unitario facturado (COP). Si falta se usa el del catálogo. */
  unitPrice?: number
  allocations: Allocation[]
}

export type PaymentMethod =
  | 'Efectivo'
  | 'Transferencia'
  | 'Tarjeta'
  | 'Crédito'
  | 'Cheque'
  | 'Mixto'

export const PAYMENT_METHODS: PaymentMethod[] = [
  'Efectivo',
  'Transferencia',
  'Tarjeta',
  'Crédito',
  'Cheque',
  'Mixto',
]

export type InvoiceSource = 'Siigo (CSV)' | 'Caja' | 'Móvil'

/** Factura asociada a un pedido. Sin factura emitida no se puede entregar. */
export interface InvoiceInfo {
  /** Número completo con prefijo, ej. FV-10452. */
  number: string
  issuedAt: string
  status: 'Emitida' | 'Anulada'
  paymentMethod: PaymentMethod
  source: InvoiceSource
  issuedBy: string
  voidedAt?: string
  voidReason?: string
}

export type PickupOrderStatus =
  | 'Reservado'
  | 'Preparado'
  | 'Retiro parcial'
  | 'Entregado'
  | 'Cancelado'

export interface PickupRecord {
  ts: string
  receivedByName: string
  receivedByRut: string
  docRef: string
  items: { sku: string; qty: number }[]
  /** Persona del equipo que entregó en bodega. */
  deliveredBy?: string
  /** Fotos de soporte de la entrega (comprimidas, data URL). */
  photos?: string[]
}

export interface PickupOrder {
  id: string
  createdAt: string
  readyAt: string | null
  customer: string
  customerRut: string
  channel: 'Mostrador' | 'Obra' | 'Web'
  warehouse: string
  status: PickupOrderStatus
  lines: OrderLine[]
  pickups: PickupRecord[]
  /** Asesor comercial que originó el pedido. */
  advisor?: string
  /** null = pedido sin facturar: no se puede entregar. */
  invoice: InvoiceInfo | null
}

export interface DamageReport {
  id: string
  createdAt: string
  partidaId: string
  sku: string
  warehouse: string
  qty: number
  valueCOP: number
  valueUSD: number
  reason: string
  evidence: string
  /** Fotos de la rotura (comprimidas, data URL). */
  photos?: string[]
  claimableToSupplier: boolean
  reportedBy: string
  status: 'Pendiente' | 'Baja aprobada' | 'Enviado a reclamo' | 'Rechazado'
  resolvedBy?: string
}

export interface CountSession {
  id: string
  scheduledAt: string
  warehouse: string
  partidaId: string
  sku: string
  expectedQty: number
  countedQty: number | null
  countedBy?: string
  status: 'Programado' | 'Contado sin diferencia' | 'Ajuste generado'
}

export interface InventoryAdjustment {
  id: string
  createdAt: string
  countId: string | null
  partidaId: string
  sku: string
  warehouse: string
  qtyDelta: number
  valueCOP: number
  valueUSD: number
  reason: string
  evidence: string
  requestedBy: string
  status: 'Pendiente' | 'Aprobado' | 'Rechazado'
  resolvedBy?: string
}

export interface ClaimCase {
  id: string
  createdAt: string
  type: 'Proveedor' | 'Cliente'
  counterparty: string
  docRef: string
  partidaId: string
  sku: string
  warehouse: string
  qty: number
  valueCOP: number
  valueUSD: number
  reason: string
  status: 'Abierto' | 'Enviado' | 'Resuelto'
  resolution?: string
}

export interface ReceiptRecord {
  id: string
  createdAt: string
  docRef: string
  supplier: string
  warehouse: string
  sku: string
  expectedQty: number
  receivedGoodQty: number
  damagedQty: number
  missingQty: number
  expiry: string | null
  partidaId: string
  claimId: string | null
  receivedBy?: string
  /** Fotos de las unidades dañadas en la descarga. */
  photos?: string[]
}

export interface WmsTransfer {
  id: string
  createdAt: string
  originWarehouse: string
  destWarehouse: string
  partidaId: string
  sku: string
  skuName: string
  qtyRequested: number
  qtySent: number
  qtyReceived: number | null
  status:
    | 'Solicitado'
    | 'Aprobado'
    | 'En tránsito'
    | 'Recibido total'
    | 'Cerrado con diferencias'
  carrier: string
  guideNumber: string
  requestedBy: string
  approvedBy: string
  notes: string
}

export function move(
  partidas: Partida[],
  params: {
    id?: string
    ts?: string
    partidaId: string
    from: StockState | null
    to: StockState | null
    qty: number
    type: MovementType
    ref: string
    user: string
    outDateStr?: string
  }
): { partidas: Partida[]; movement: Movement } {
  const { partidaId, from, to, qty, type, ref, user } = params
  if (!Number.isInteger(qty) || qty <= 0) {
    throw new Error('La cantidad del movimiento debe ser un entero positivo')
  }
  if (from === null && to === null) {
    throw new Error('El movimiento debe tener estado de origen o destino')
  }

  const target = partidas.find((p) => p.id === partidaId)
  if (!target) {
    throw new Error(`Partida ${partidaId} no encontrada`)
  }

  if (from !== null && target.qty[from] < qty) {
    throw new Error(
      `Stock insuficiente en estado ${from} para ${partidaId}: disponible ${target.qty[from]}, requerido ${qty}`
    )
  }

  const nextPartidas = partidas.map((p) => {
    if (p.id !== partidaId) return p
    const nextQty: Record<StockState, number> = { ...p.qty }
    if (from !== null) {
      nextQty[from] -= qty
    }
    if (to !== null) {
      nextQty[to] += qty
    }
    return {
      ...p,
      lastOutAt:
        type === 'Entrega' && params.outDateStr
          ? params.outDateStr
          : p.lastOutAt,
      qty: nextQty,
    }
  })

  const movement: Movement = {
    id: params.id ?? `MOV-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    ts: params.ts ?? '2026-10-20 12:00',
    type,
    partidaId,
    sku: target.sku,
    warehouse: target.warehouse,
    fromState: from,
    toState: to,
    qty,
    ref,
    user,
  }

  return { partidas: nextPartidas, movement }
}

export function allocateFefo(
  partidas: Partida[],
  sku: string,
  warehouse: string,
  qty: number
): Allocation[] {
  if (!Number.isInteger(qty) || qty <= 0) {
    throw new Error('La cantidad a asignar debe ser un entero positivo')
  }

  const candidates = partidas
    .filter(
      (p) => p.sku === sku && p.warehouse === warehouse && p.qty.disponible > 0
    )
    .sort((a, b) => {
      if (a.expiry && b.expiry) {
        const cmp = a.expiry.localeCompare(b.expiry)
        if (cmp !== 0) return cmp
      } else if (a.expiry && !b.expiry) {
        return -1
      } else if (!a.expiry && b.expiry) {
        return 1
      }
      return a.receivedAt.localeCompare(b.receivedAt)
    })

  const totalAvail = candidates.reduce((s, p) => s + p.qty.disponible, 0)
  if (totalAvail < qty) {
    throw new Error(
      `Stock disponible insuficiente para ${sku} en ${warehouse}: disponible ${totalAvail}, solicitado ${qty}`
    )
  }

  let remaining = qty
  const allocations: Allocation[] = []
  for (const p of candidates) {
    if (remaining <= 0) break
    const take = Math.min(remaining, p.qty.disponible)
    allocations.push({
      partidaId: p.id,
      qty: take,
      expiry: p.expiry,
    })
    remaining -= take
  }

  return allocations
}

export function daysBetween(fromDateStr: string, toDateStr: string): number {
  const from = new Date(`${fromDateStr.slice(0, 10)}T00:00:00Z`).getTime()
  const to = new Date(`${toDateStr.slice(0, 10)}T00:00:00Z`).getTime()
  return Math.round((to - from) / 86_400_000)
}

export function needsHigherApproval(
  valueCOP: number,
  threshold = APPROVAL_THRESHOLD_COP
): boolean {
  return valueCOP > threshold
}

export function canApproveByRole(
  role: RoleCode,
  valueCOP: number,
  threshold = APPROVAL_THRESHOLD_COP
): boolean {
  if (role === 'ADM') return true
  if (role === 'JB') return valueCOP <= threshold
  if (role === 'GER') return valueCOP > threshold
  return false
}

export function totalPhysicalPartida(p: Partida): number {
  return (
    p.qty.disponible +
    p.qty.reservado +
    p.qty.danado +
    p.qty.reclamo +
    p.qty.transito
  )
}

export interface BucketSummary {
  units: number
  valueCOP: number
  valueUSD: number
}

export interface MerchandiseBuckets {
  enExistencia: BucketSummary & {
    totalPhysicalUnits: number
    totalPhysicalCOP: number
    totalPhysicalUSD: number
    inTransitUnits: number
  }
  porEntregar: BucketSummary & {
    activeOrdersCount: number
    overdueOrdersCount: number
    /** Pedidos activos que aún no tienen factura emitida. */
    unbilledOrdersCount: number
    /** Valor de venta (precio facturado) de lo que falta entregar. */
    saleValueCOP: number
  }
  danada: BucketSummary & {
    pendingReportsCount: number
  }
  porReclamar: BucketSummary & {
    openClaimsCount: number
    openClaimsCOP: number
    openClaimsUSD: number
  }
  rezagadaPorVencer: BucketSummary & {
    stalePartidasCount: number
    criticalStaleCount: number
    expiringSoonCount: number
  }
  perdidaMes: BucketSummary & {
    pendingAdjustmentsCount: number
    eventsCount: number
  }
}

export function computeBuckets(
  input: {
    skus: SkuItem[]
    partidas: Partida[]
    orders: PickupOrder[]
    damages: DamageReport[]
    claims: ClaimCase[]
    adjustments: InventoryAdjustment[]
    movements: Movement[]
  },
  scopeWarehouses: string[],
  todayStr = '2026-10-20'
): MerchandiseBuckets {
  const costMap = new Map<string, number>(
    input.skus.map((s) => [s.sku, s.unitCost])
  )
  const priceMap = new Map<string, number>(
    input.skus.map((s) => [s.sku, s.unitPrice])
  )
  const unitCost = (sku: string) => costMap.get(sku) ?? 0
  const inScope = (wh: string) => scopeWarehouses.includes(wh)

  const scopedPartidas = input.partidas.filter((p) => inScope(p.warehouse))

  let dispUnits = 0
  let dispCOP = 0
  let resUnits = 0
  let resCOP = 0
  let danUnits = 0
  let danCOP = 0
  let recUnits = 0
  let recCOP = 0
  let traUnits = 0
  let totalPhysicalUnits = 0
  let totalPhysicalCOP = 0

  let riskUnits = 0
  let riskCOP = 0
  let stalePartidasCount = 0
  let criticalStaleCount = 0
  let expiringSoonCount = 0

  for (const p of scopedPartidas) {
    const c = unitCost(p.sku)
    const phys = totalPhysicalPartida(p)
    totalPhysicalUnits += phys
    totalPhysicalCOP += phys * c

    dispUnits += p.qty.disponible
    dispCOP += p.qty.disponible * c

    resUnits += p.qty.reservado
    resCOP += p.qty.reservado * c

    danUnits += p.qty.danado
    danCOP += p.qty.danado * c

    recUnits += p.qty.reclamo
    recCOP += p.qty.reclamo * c

    traUnits += p.qty.transito

    if (p.qty.disponible > 0) {
      const daysIdle = daysBetween(p.lastOutAt, todayStr)
      const isStale = daysIdle >= STALE_DAYS
      const isCritStale = daysIdle >= CRITICAL_STALE_DAYS
      const daysToExpiry = p.expiry ? daysBetween(todayStr, p.expiry) : null
      const isExpiring =
        daysToExpiry !== null && daysToExpiry <= EXPIRY_WARN_DAYS

      if (isStale) stalePartidasCount++
      if (isCritStale) criticalStaleCount++
      if (isExpiring) expiringSoonCount++

      // Sin doble conteo: si una partida es rezagada Y por vencer, suma una sola vez
      if (isStale || isExpiring) {
        riskUnits += p.qty.disponible
        riskCOP += p.qty.disponible * c
      }
    }
  }

  const activeOrders = input.orders.filter(
    (o) =>
      inScope(o.warehouse) &&
      (o.status === 'Reservado' ||
        o.status === 'Preparado' ||
        o.status === 'Retiro parcial')
  )
  const overdueOrders = activeOrders.filter((o) => {
    const refDate = o.readyAt ?? o.createdAt
    return daysBetween(refDate, todayStr) > PICKUP_OVERDUE_DAYS
  })

  const unbilledOrdersCount = activeOrders.filter((o) => !o.invoice).length
  const saleValueCOP = activeOrders.reduce(
    (sum, o) =>
      sum +
      o.lines.reduce(
        (ls, l) =>
          ls +
          (l.qtyOrdered - l.qtyPickedUp) *
            (l.unitPrice ?? priceMap.get(l.sku) ?? 0),
        0
      ),
    0
  )

  const pendingDamages = input.damages.filter(
    (d) => inScope(d.warehouse) && d.status === 'Pendiente'
  )

  const openClaims = input.claims.filter(
    (c) => inScope(c.warehouse) && c.status !== 'Resuelto'
  )
  const openClaimsCOP = openClaims.reduce(
    (s, c) => s + (c.valueCOP ?? c.valueUSD ?? 0),
    0
  )

  const pendingAdjustments = input.adjustments.filter(
    (a) => inScope(a.warehouse) && a.status === 'Pendiente'
  )

  const lossMovements = input.movements.filter(
    (m) =>
      inScope(m.warehouse) &&
      m.toState === null &&
      (m.type === 'Baja' || m.type === 'Ajuste conteo')
  )
  const perdidaUnits = lossMovements.reduce((s, m) => s + m.qty, 0)
  const perdidaCOP = lossMovements.reduce(
    (s, m) => s + m.qty * unitCost(m.sku),
    0
  )

  return {
    enExistencia: {
      units: dispUnits,
      valueCOP: dispCOP,
      valueUSD: dispCOP,
      totalPhysicalUnits,
      totalPhysicalCOP,
      totalPhysicalUSD: totalPhysicalCOP,
      inTransitUnits: traUnits,
    },
    porEntregar: {
      units: resUnits,
      valueCOP: resCOP,
      valueUSD: resCOP,
      activeOrdersCount: activeOrders.length,
      overdueOrdersCount: overdueOrders.length,
      unbilledOrdersCount,
      saleValueCOP,
    },
    danada: {
      units: danUnits,
      valueCOP: danCOP,
      valueUSD: danCOP,
      pendingReportsCount: pendingDamages.length,
    },
    porReclamar: {
      units: recUnits,
      valueCOP: recCOP,
      valueUSD: recCOP,
      openClaimsCount: openClaims.length,
      openClaimsCOP,
      openClaimsUSD: openClaimsCOP,
    },
    rezagadaPorVencer: {
      units: riskUnits,
      valueCOP: riskCOP,
      valueUSD: riskCOP,
      stalePartidasCount,
      criticalStaleCount,
      expiringSoonCount,
    },
    perdidaMes: {
      units: perdidaUnits,
      valueCOP: perdidaCOP,
      valueUSD: perdidaCOP,
      pendingAdjustmentsCount: pendingAdjustments.length,
      eventsCount: lossMovements.length,
    },
  }
}
