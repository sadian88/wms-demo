import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { toast } from 'sonner'
import { getSessionUserId, setSessionUserId } from '@/lib/session'
import {
  WMS_ROLES,
  type RoleCode,
  type WmsScreen,
} from '@/features/wms/data/catalog'
import {
  clearPersisted,
  loadPersisted,
  savePersisted,
} from '@/features/wms/data/persistence'
import {
  INITIAL_ADJUSTMENTS,
  INITIAL_CLAIMS,
  INITIAL_COUNTS,
  INITIAL_DAMAGES,
  INITIAL_MOVEMENTS,
  INITIAL_ORDERS,
  INITIAL_PARTIDAS,
  INITIAL_RECEIPTS,
  INITIAL_SKUS,
  INITIAL_TRANSFERS,
} from '@/features/wms/data/seed-data'
import {
  INITIAL_ALMACENES,
  INITIAL_WAREHOUSES,
  TOPOLOGY_SCENARIOS,
  type TopologyScenario,
  type WmsAlmacen,
  type WmsTopologyConfig,
  type WmsWarehouse,
} from '@/features/wms/data/topology-data'
import {
  DEMO_PIN,
  INITIAL_INVOICE_PREFIXES,
  INITIAL_POINTS_OF_SALE,
  INITIAL_USERS,
  type InvoicePrefix,
  type PointOfSale,
  type WmsUser,
} from '@/features/wms/data/users-data'
import { TODAY_STR, nowTimestamp } from '@/features/wms/domain/clock'
import {
  allocateFefo,
  canApproveByRole,
  computeBuckets,
  move,
  type Allocation,
  type ClaimCase,
  type CountSession,
  type DamageReport,
  type InventoryAdjustment,
  type MerchandiseBuckets,
  type Movement,
  type OrderLine,
  type Partida,
  type PaymentMethod,
  type PickupOrder,
  type ReceiptRecord,
  type SkuItem,
  type WmsTransfer,
} from '@/features/wms/domain/inventory'
import {
  DELIVERY_BLOCK_MESSAGE,
  deliveryBlockReason,
  normalizeInvoiceNumber,
  parseInvoicesCsv,
  type InvoiceImportPreview,
  type ParsedInvoice,
} from '@/features/wms/domain/invoicing'

export interface OrderLineInput {
  sku: string
  qty: number
  /** Precio unitario pactado. Si se omite se usa el del catálogo. */
  unitPrice?: number
}

interface WmsContextType {
  /** Usuario con sesión iniciada. Todo movimiento queda a su nombre. */
  user: WmsUser
  users: WmsUser[]
  role: RoleCode
  switchUser: (userId: string) => void
  /** Atajo de la demo: cambia a un usuario activo con ese perfil. */
  setRole: (role: RoleCode) => void
  createUser: (params: {
    name: string
    email: string
    role: RoleCode
    scope: string[] | 'ALL'
    pin?: string
  }) => boolean
  updateUser: (
    id: string,
    patch: Partial<Pick<WmsUser, 'name' | 'role' | 'scope' | 'active' | 'pin'>>
  ) => boolean
  resetDemoData: () => void
  scenario: TopologyScenario
  setScenario: (sc: TopologyScenario) => void
  topology: WmsTopologyConfig
  almacenes: WmsAlmacen[]
  warehouses: WmsWarehouse[]
  warehouse: string
  setWarehouse: (wh: string) => void
  activeWarehouseIds: string[]
  matchesScope: (whId: string) => boolean
  showRestricted: boolean
  setShowRestricted: (show: boolean) => void
  isReadOnly: boolean
  hasAccess: (screen: WmsScreen) => boolean
  canActOnScreen: (screen: WmsScreen) => boolean
  canApproveAmount: (valueCOP: number) => boolean
  skus: SkuItem[]
  partidas: Partida[]
  movements: Movement[]
  orders: PickupOrder[]
  receipts: ReceiptRecord[]
  claims: ClaimCase[]
  damages: DamageReport[]
  counts: CountSession[]
  adjustments: InventoryAdjustment[]
  transfers: WmsTransfer[]
  buckets: MerchandiseBuckets
  prefixes: InvoicePrefix[]
  pointsOfSale: PointOfSale[]
  updateOperationalParams: (
    id: string,
    patch: { cutoff?: string; schedule?: string; manager?: string }
  ) => void
  createSku: (sku: SkuItem) => boolean
  updateSkuCatalog: (sku: string, patch: Partial<Omit<SkuItem, 'sku'>>) => void
  addStockPartida: (params: {
    sku: string
    warehouse: string
    qty: number
    supplier: string
    expiry?: string | null
    docRef?: string
  }) => void
  receive: (params: {
    docRef: string
    supplier: string
    warehouse: string
    sku: string
    expectedQty: number
    receivedGoodQty: number
    damagedQty: number
    expiry: string | null
    photos?: string[]
  }) => string
  /** Crea un pedido con reserva FEFO. Devuelve el id o null si no se pudo reservar. */
  createOrder: (params: {
    customer: string
    customerRut: string
    channel: PickupOrder['channel']
    warehouse: string
    lines: OrderLineInput[]
    advisor?: string
  }) => string | null
  /** Lee un CSV de facturas sin guardar nada: devuelve qué se importaría y qué no. */
  previewInvoicesImport: (
    csvText: string,
    warehouseId?: string
  ) => InvoiceImportPreview
  /** Aplica las facturas validadas: crea pedidos reservados o anula facturas ya cargadas. */
  applyInvoicesImport: (invoices: ParsedInvoice[]) => {
    imported: number
    voided: number
    failed: number
  }
  /** Sugiere el siguiente número de factura para un prefijo (FV-10459). */
  suggestInvoiceNumber: (prefix: string) => string
  /** Registra la factura de un pedido (caja). Sin factura no hay entrega. */
  invoiceOrder: (
    orderId: string,
    params: { number: string; paymentMethod: PaymentMethod }
  ) => boolean
  voidInvoice: (orderId: string, reason: string) => boolean
  prepareOrder: (orderId: string) => void
  nextRemission: () => string
  /** Registra una entrega validando que el pedido tenga factura vigente. */
  registerPickup: (
    orderId: string,
    params: {
      receivedByName: string
      receivedByRut: string
      docRef?: string
      quantities: Record<string, number>
      photos?: string[]
    }
  ) => boolean
  cancelOrder: (orderId: string) => void
  reportDamage: (params: {
    partidaId: string
    qty: number
    reason: string
    evidence: string
    claimableToSupplier: boolean
    photos?: string[]
  }) => void
  resolveDamage: (
    damageId: string,
    decision: 'Baja aprobada' | 'Enviado a reclamo' | 'Rechazado'
  ) => void
  scheduleCount: (warehouse: string, partidaId: string) => void
  submitCount: (countId: string, countedQty: number) => void
  resolveAdjustment: (adjustmentId: string, approve: boolean) => void
  openCustomerReturn: (params: {
    customer: string
    docRef: string
    partidaId: string
    qty: number
    reason: string
  }) => void
  advanceClaim: (
    claimId: string,
    action:
      | 'Enviar'
      | 'Nota de crédito / Descarte'
      | 'Reintegrar a disponible'
      | 'Pasar a dañado'
  ) => void
  createTransfer: (
    originWarehouse: string,
    destWarehouse: string,
    partidaId: string,
    qtyRequested: number
  ) => void
  advanceTransfer: (id: string, nextStatus: WmsTransfer['status']) => void
  updateInvoicePrefix: (
    prefix: string,
    patch: Partial<Pick<InvoicePrefix, 'description' | 'nextNumber' | 'active'>>
  ) => void
  addInvoicePrefix: (prefix: string, description: string) => boolean
  addPointOfSale: (params: {
    name: string
    warehouse: string
    prefix: string
  }) => void
  updatePointOfSale: (
    id: string,
    patch: Partial<
      Pick<PointOfSale, 'name' | 'warehouse' | 'prefix' | 'active'>
    >
  ) => void
}

const WmsContext = createContext<WmsContextType | null>(null)

const formatCop = (n: number) =>
  n.toLocaleString('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  })

function nextOrderNumber(orders: PickupOrder[], extra = 0): number {
  const max = orders.reduce((m, o) => {
    const n = Number(o.id.replace(/\D/g, ''))
    return Number.isFinite(n) ? Math.max(m, n) : m
  }, 2200)
  return max + 1 + extra
}

export function WmsProvider({ children }: { children: React.ReactNode }) {
  const [persisted] = useState(loadPersisted)

  const [users, setUsers] = useState<WmsUser[]>(
    () => persisted.users ?? INITIAL_USERS
  )
  const [sessionUserId, setSessionUserIdState] = useState<string | null>(
    getSessionUserId
  )
  const user = useMemo(
    () =>
      users.find((u) => u.id === sessionUserId && u.active) ??
      users.find((u) => u.active) ??
      INITIAL_USERS[0],
    [users, sessionUserId]
  )
  const role = user.role
  const userName = user.name

  const [scenario, setScenarioState] = useState<TopologyScenario>(
    () => persisted.scenario ?? 'CASE_3'
  )
  const [warehouse, setWarehouseState] = useState<string>('ALL')
  const [showRestricted, setShowRestricted] = useState<boolean>(false)

  const [allAlmacenes, setAllAlmacenes] = useState<WmsAlmacen[]>(
    () => persisted.allAlmacenes ?? INITIAL_ALMACENES
  )
  const [allWarehouses, setAllWarehouses] = useState<WmsWarehouse[]>(
    () => persisted.allWarehouses ?? INITIAL_WAREHOUSES
  )

  const [skus, setSkus] = useState<SkuItem[]>(
    () => persisted.skus ?? INITIAL_SKUS
  )
  const [partidas, setPartidas] = useState<Partida[]>(
    () => persisted.partidas ?? INITIAL_PARTIDAS
  )
  const [movements, setMovements] = useState<Movement[]>(
    () => persisted.movements ?? INITIAL_MOVEMENTS
  )
  const [orders, setOrders] = useState<PickupOrder[]>(
    () => persisted.orders ?? INITIAL_ORDERS
  )
  const [receipts, setReceipts] = useState<ReceiptRecord[]>(
    () => persisted.receipts ?? INITIAL_RECEIPTS
  )
  const [claims, setClaims] = useState<ClaimCase[]>(
    () => persisted.claims ?? INITIAL_CLAIMS
  )
  const [damages, setDamages] = useState<DamageReport[]>(
    () => persisted.damages ?? INITIAL_DAMAGES
  )
  const [counts, setCounts] = useState<CountSession[]>(
    () => persisted.counts ?? INITIAL_COUNTS
  )
  const [adjustments, setAdjustments] = useState<InventoryAdjustment[]>(
    () => persisted.adjustments ?? INITIAL_ADJUSTMENTS
  )
  const [transfers, setTransfers] = useState<WmsTransfer[]>(
    () => persisted.transfers ?? INITIAL_TRANSFERS
  )
  const [prefixes, setPrefixes] = useState<InvoicePrefix[]>(
    () => persisted.prefixes ?? INITIAL_INVOICE_PREFIXES
  )
  const [pointsOfSale, setPointsOfSale] = useState<PointOfSale[]>(
    () => persisted.pointsOfSale ?? INITIAL_POINTS_OF_SALE
  )
  const [remissionSeq, setRemissionSeq] = useState<number>(
    () => persisted.remissionSeq ?? 104501
  )

  // Persistencia: se guarda poco después del último cambio.
  const warnedStorage = useRef(false)
  useEffect(() => {
    const t = window.setTimeout(() => {
      const result = savePersisted({
        scenario,
        allAlmacenes,
        allWarehouses,
        skus,
        partidas,
        movements,
        orders,
        receipts,
        claims,
        damages,
        counts,
        adjustments,
        transfers,
        users,
        prefixes,
        pointsOfSale,
        remissionSeq,
      })
      if (result !== 'ok' && !warnedStorage.current) {
        warnedStorage.current = true
        toast.warning(
          result === 'sin-fotos'
            ? 'El navegador se quedó sin espacio: los datos se guardan, pero las fotos nuevas no persisten al recargar.'
            : 'No se pudo guardar en este navegador: los cambios se perderán al recargar.'
        )
      }
    }, 400)
    return () => window.clearTimeout(t)
  }, [
    scenario,
    allAlmacenes,
    allWarehouses,
    skus,
    partidas,
    movements,
    orders,
    receipts,
    claims,
    damages,
    counts,
    adjustments,
    transfers,
    users,
    prefixes,
    pointsOfSale,
    remissionSeq,
  ])

  const topology = TOPOLOGY_SCENARIOS[scenario] || TOPOLOGY_SCENARIOS.CASE_3

  // Cada usuario ve solo sus bodegas; si su alcance no coincide con la
  // estructura activa se muestran todas para no dejarlo sin pantalla.
  const topologyWarehouses = allWarehouses.filter((w) =>
    (topology?.warehouseIds ?? []).includes(w.id)
  )
  const userWarehouses =
    user.scope === 'ALL'
      ? topologyWarehouses
      : topologyWarehouses.filter((w) => user.scope.includes(w.id))
  const warehouses =
    userWarehouses.length > 0 ? userWarehouses : topologyWarehouses
  const almacenes = allAlmacenes.filter(
    (a) =>
      (topology?.almacenIds ?? []).includes(a.id) &&
      warehouses.some((w) => w.almacenId === a.id)
  )

  const activeWarehouseIds = useMemo(() => {
    if (warehouse === 'ALL') {
      return warehouses.map((w) => w.id)
    }
    if (warehouse.startsWith('ALM:')) {
      const almId = warehouse.replace('ALM:', '')
      return warehouses.filter((w) => w.almacenId === almId).map((w) => w.id)
    }
    return warehouses.some((w) => w.id === warehouse)
      ? [warehouse]
      : warehouses.map((w) => w.id)
  }, [warehouse, warehouses])

  const matchesScope = (whId: string) => activeWarehouseIds.includes(whId)
  const isReadOnly = WMS_ROLES[role]?.readOnly ?? false
  const hasAccess = (screen: WmsScreen) => screen.roles.includes(role)
  const canActOnScreen = (screen: WmsScreen) => screen.actRoles.includes(role)
  const canApproveAmount = (valueCOP: number) =>
    canApproveByRole(role, valueCOP)

  const buckets = useMemo(
    () =>
      computeBuckets(
        { skus, partidas, orders, damages, claims, adjustments, movements },
        activeWarehouseIds,
        TODAY_STR
      ),
    [
      skus,
      partidas,
      orders,
      damages,
      claims,
      adjustments,
      movements,
      activeWarehouseIds,
    ]
  )

  const switchUser = (userId: string) => {
    const target = users.find((u) => u.id === userId && u.active)
    if (!target) {
      toast.error('Ese usuario no está activo')
      return
    }
    setSessionUserId(target.id)
    setSessionUserIdState(target.id)
    setWarehouseState('ALL')
    toast.success(`Sesión de ${target.name} · ${WMS_ROLES[target.role].name}`)
  }

  const setRole = (newRole: RoleCode) => {
    const target = users.find((u) => u.role === newRole && u.active)
    if (!target) {
      toast.error(
        `No hay un usuario activo con el perfil ${WMS_ROLES[newRole].name}`
      )
      return
    }
    switchUser(target.id)
  }

  const createUser: WmsContextType['createUser'] = ({
    name,
    email,
    role: newRole,
    scope,
    pin,
  }) => {
    const cleanEmail = email.trim().toLowerCase()
    if (name.trim().length < 3) {
      toast.error('Escribe el nombre completo del usuario')
      return false
    }
    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      toast.error('El correo no es válido')
      return false
    }
    if (users.some((u) => u.email.toLowerCase() === cleanEmail)) {
      toast.error('Ya existe un usuario con ese correo')
      return false
    }
    const nextId = `USR-${String(users.length + 1).padStart(2, '0')}`
    setUsers((prev) => [
      ...prev,
      {
        id: nextId,
        name: name.trim(),
        email: cleanEmail,
        role: newRole,
        scope,
        pin: pin?.trim() || DEMO_PIN,
        active: true,
      },
    ])
    toast.success(
      `Usuario ${name.trim()} creado como ${WMS_ROLES[newRole].name}`
    )
    return true
  }

  const updateUser: WmsContextType['updateUser'] = (id, patch) => {
    const target = users.find((u) => u.id === id)
    if (!target) return false
    const next = { ...target, ...patch }
    const remainingAdmins = users.filter(
      (u) =>
        (u.id === id ? next : u).role === 'ADM' &&
        (u.id === id ? next : u).active
    )
    if (remainingAdmins.length === 0) {
      toast.error('Debe quedar al menos un administrador activo')
      return false
    }
    if (id === user.id && patch.active === false) {
      toast.error('No puedes desactivar tu propio usuario')
      return false
    }
    setUsers((prev) => prev.map((u) => (u.id === id ? next : u)))
    toast.success(`Usuario ${next.name} actualizado`)
    return true
  }

  const resetDemoData = () => {
    clearPersisted()
    window.location.reload()
  }

  const setScenario = (sc: TopologyScenario) => {
    const targetSc = TOPOLOGY_SCENARIOS[sc] ? sc : 'CASE_3'
    setScenarioState(targetSc)
    setWarehouseState('ALL')
    toast.info(`Estructura activa: ${TOPOLOGY_SCENARIOS[targetSc].title}`)
  }

  const setWarehouse = (wh: string) => {
    setWarehouseState(wh)
    if (wh === 'ALL') {
      toast.info('Vista consolidada: Todas las bodegas')
      return
    }
    if (wh.startsWith('ALM:')) {
      const alm = almacenes.find((a) => a.id === wh.replace('ALM:', ''))
      toast.info(
        alm ? `Almacén seleccionado: ${alm.name}` : 'Almacén seleccionado'
      )
      return
    }
    const found = warehouses.find((w) => w.id === wh)
    if (found) {
      toast.info(`Bodega seleccionada: ${found.name}`)
    }
  }

  const unitCostOf = (skuCode: string) =>
    skus.find((s) => s.sku === skuCode)?.unitCost ?? 0

  const updateOperationalParams = (
    id: string,
    patch: { cutoff?: string; schedule?: string; manager?: string }
  ) => {
    setAllWarehouses((prev) =>
      prev.map((w) => (w.id === id ? { ...w, ...patch } : w))
    )
    setAllAlmacenes((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...patch } : a))
    )
    toast.success(`Parámetros operativos de ${id} actualizados`)
  }

  const createSku = (newSku: SkuItem): boolean => {
    const cleanSku = newSku.sku.trim().toUpperCase()
    if (!cleanSku || !newSku.name.trim()) {
      toast.error('El código SKU y el nombre del producto son requeridos')
      return false
    }
    if (skus.some((s) => s.sku.toUpperCase() === cleanSku)) {
      toast.error(`El SKU ${cleanSku} ya existe en el catálogo`)
      return false
    }
    setSkus((prev) => [...prev, { ...newSku, sku: cleanSku }])
    toast.success(`Producto ${cleanSku} creado exitosamente en el catálogo`)
    return true
  }

  const updateSkuCatalog = (
    sku: string,
    patch: Partial<Omit<SkuItem, 'sku'>>
  ) => {
    setSkus((prev) => prev.map((s) => (s.sku === sku ? { ...s, ...patch } : s)))
    toast.success(`Producto ${sku} actualizado`)
  }

  const addStockPartida = ({
    sku,
    warehouse: wh,
    qty,
    supplier,
    expiry = null,
    docRef = 'INGRESO-DIRECTO',
  }: {
    sku: string
    warehouse: string
    qty: number
    supplier: string
    expiry?: string | null
    docRef?: string
  }) => {
    if (qty <= 0) {
      toast.error('La cantidad a ingresar debe ser mayor a 0')
      return
    }
    const userLabel = userName
    const ts = nowTimestamp()
    const partidaId = `PAR-${String(partidas.length + 101)}`

    const newPartida: Partida = {
      id: partidaId,
      sku,
      warehouse: wh,
      expiry: expiry || null,
      lastOutAt: TODAY_STR,
      receivedAt: TODAY_STR,
      supplier: supplier.trim() || 'Proveedor General',
      qty: {
        disponible: qty,
        reservado: 0,
        danado: 0,
        reclamo: 0,
        transito: 0,
      },
    }

    const newMov: Movement = {
      id: `MOV-${movements.length + 101}`,
      ts,
      type: 'Ingreso',
      partidaId,
      sku,
      warehouse: wh,
      fromState: null,
      toState: 'disponible',
      qty,
      ref: docRef,
      user: userLabel,
    }

    setPartidas((prev) => [newPartida, ...prev])
    setMovements((prev) => [newMov, ...prev])
    toast.success(
      `Stock ingresado: Partida ${partidaId} (+${qty} uds de ${sku} en ${wh})`
    )
  }

  const receive: WmsContextType['receive'] = ({
    docRef,
    supplier,
    warehouse: wh,
    sku,
    expectedQty,
    receivedGoodQty,
    damagedQty,
    expiry,
    photos,
  }) => {
    const userLabel = userName
    const ts = nowTimestamp()
    const existing = partidas.find(
      (p) => p.sku === sku && p.warehouse === wh && p.expiry === expiry
    )
    const partidaId =
      existing?.id ?? `PAR-${Math.floor(500 + Math.random() * 490)}`

    let nextPartidas = existing
      ? [...partidas]
      : [
          {
            id: partidaId,
            sku,
            warehouse: wh,
            expiry,
            lastOutAt: TODAY_STR,
            receivedAt: TODAY_STR,
            supplier,
            qty: {
              disponible: 0,
              reservado: 0,
              danado: 0,
              reclamo: 0,
              transito: 0,
            },
          },
          ...partidas,
        ]

    const newMovs: Movement[] = []

    if (receivedGoodQty > 0) {
      const resGood = move(nextPartidas, {
        ts,
        partidaId,
        from: null,
        to: 'disponible',
        qty: receivedGoodQty,
        type: 'Ingreso',
        ref: docRef,
        user: userLabel,
      })
      nextPartidas = resGood.partidas
      newMovs.push(resGood.movement)
    }

    const missingQty = Math.max(0, expectedQty - receivedGoodQty - damagedQty)
    let claimId: string | null = null

    if (damagedQty > 0) {
      claimId = `REC-${710 + claims.length}`
      const resDam = move(nextPartidas, {
        ts,
        partidaId,
        from: null,
        to: 'reclamo',
        qty: damagedQty,
        type: 'Reclamo',
        ref: `${claimId} · ${docRef}`,
        user: userLabel,
      })
      nextPartidas = resDam.partidas
      newMovs.push(resDam.movement)
    } else if (missingQty > 0) {
      claimId = `REC-${710 + claims.length}`
    }

    setPartidas(nextPartidas)
    if (newMovs.length > 0) {
      setMovements((prev) => [...newMovs, ...prev])
    }

    if (claimId) {
      const claimUnits = damagedQty + missingQty
      const parts: string[] = []
      if (damagedQty > 0) parts.push(`${damagedQty} uds dañadas`)
      if (missingQty > 0) parts.push(`${missingQty} uds faltantes`)
      const newClaim: ClaimCase = {
        id: claimId,
        createdAt: TODAY_STR,
        type: 'Proveedor',
        counterparty: supplier,
        docRef,
        partidaId,
        sku,
        warehouse: wh,
        qty: claimUnits,
        valueCOP: claimUnits * unitCostOf(sku),
        valueUSD: claimUnits * unitCostOf(sku),
        reason: `Recepción con diferencias: ${parts.join(' y ')}`,
        status: 'Abierto',
      }
      setClaims((prev) => [newClaim, ...prev])
      toast.warning(
        `Recepción registrada. Se abrió reclamo ${claimId} por ${claimUnits} uds`
      )
    } else {
      toast.success(
        `Recepción registrada: +${receivedGoodQty} uds disponibles en ${wh}`
      )
    }

    const rec: ReceiptRecord = {
      id: `ING-${510 + receipts.length}`,
      createdAt: ts,
      docRef,
      supplier,
      warehouse: wh,
      sku,
      expectedQty,
      receivedGoodQty,
      damagedQty,
      missingQty,
      expiry,
      partidaId,
      claimId,
      receivedBy: userLabel,
      photos: photos && photos.length > 0 ? photos : undefined,
    }
    setReceipts((prev) => [rec, ...prev])
    return rec.id
  }

  const priceOf = (skuCode: string) =>
    skus.find((s) => s.sku === skuCode)?.unitPrice ?? 0

  /** Reserva stock FEFO para las líneas. Lanza un error si algún producto no alcanza. */
  const reserveLines = (
    basePartidas: Partida[],
    orderId: string,
    wh: string,
    lines: OrderLineInput[],
    ts: string
  ) => {
    let nextPartidas = [...basePartidas]
    const newMovs: Movement[] = []
    const built: OrderLine[] = lines.map((l) => {
      const allocs: Allocation[] = allocateFefo(nextPartidas, l.sku, wh, l.qty)
      for (const a of allocs) {
        const res = move(nextPartidas, {
          ts,
          partidaId: a.partidaId,
          from: 'disponible',
          to: 'reservado',
          qty: a.qty,
          type: 'Reserva',
          ref: orderId,
          user: userName,
        })
        nextPartidas = res.partidas
        newMovs.push(res.movement)
      }
      return {
        sku: l.sku,
        qtyOrdered: l.qty,
        qtyPickedUp: 0,
        unitPrice: l.unitPrice ?? priceOf(l.sku),
        allocations: allocs,
      }
    })
    return { partidas: nextPartidas, movements: newMovs, lines: built }
  }

  /** Devuelve a disponible lo que el pedido todavía tenía reservado. */
  const releaseOrderStock = (
    basePartidas: Partida[],
    order: PickupOrder,
    ref: string,
    ts: string
  ) => {
    let nextPartidas = [...basePartidas]
    const newMovs: Movement[] = []
    for (const line of order.lines) {
      for (const a of line.allocations) {
        if (a.qty > 0) {
          const res = move(nextPartidas, {
            ts,
            partidaId: a.partidaId,
            from: 'reservado',
            to: 'disponible',
            qty: a.qty,
            type: 'Liberación',
            ref,
            user: userName,
          })
          nextPartidas = res.partidas
          newMovs.push(res.movement)
        }
      }
    }
    return { partidas: nextPartidas, movements: newMovs }
  }

  const voidedOrder = (order: PickupOrder, reason: string): PickupOrder => ({
    ...order,
    status: 'Cancelado',
    lines: order.lines.map((l) => ({ ...l, allocations: [] })),
    invoice: order.invoice
      ? {
          ...order.invoice,
          status: 'Anulada',
          voidedAt: TODAY_STR,
          voidReason: reason,
        }
      : order.invoice,
  })

  const createOrder: WmsContextType['createOrder'] = ({
    customer,
    customerRut,
    channel,
    warehouse: wh,
    lines,
    advisor,
  }) => {
    try {
      for (const l of lines) {
        const s = skus.find((x) => x.sku === l.sku)
        if (!s) throw new Error(`El producto ${l.sku} no existe en el catálogo`)
        if (l.unitPrice !== undefined && role !== 'ADM' && role !== 'JB') {
          const minPrice = Math.round(
            s.unitPrice * (1 - s.maxDiscountPct / 100)
          )
          if (l.unitPrice < minPrice) {
            throw new Error(
              `${s.name.split(' ').slice(0, 3).join(' ')}: el descuento máximo es ${s.maxDiscountPct}% (precio mínimo ${formatCop(minPrice)})`
            )
          }
        }
      }
      const orderId = `PED-${nextOrderNumber(orders)}`
      const ts = nowTimestamp()
      const reserved = reserveLines(partidas, orderId, wh, lines, ts)

      const newOrder: PickupOrder = {
        id: orderId,
        createdAt: TODAY_STR,
        readyAt: null,
        customer,
        customerRut,
        channel,
        warehouse: wh,
        status: 'Reservado',
        advisor: advisor ?? (role === 'ASE' ? userName : undefined),
        invoice: null,
        lines: reserved.lines,
        pickups: [],
      }

      setPartidas(reserved.partidas)
      setMovements((prev) => [...reserved.movements, ...prev])
      setOrders((prev) => [newOrder, ...prev])
      toast.success(`Pedido ${orderId} creado y stock reservado`)
      return orderId
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'No se pudo reservar el pedido'
      )
      return null
    }
  }

  const previewInvoicesImport: WmsContextType['previewInvoicesImport'] = (
    csvText,
    warehouseId
  ) => {
    const availability = new Map<string, number>()
    for (const p of partidas) {
      const key = `${p.warehouse}|${p.sku}`
      availability.set(key, (availability.get(key) ?? 0) + p.qty.disponible)
    }
    const existingInvoices = new Map<
      string,
      { orderId: string; voided: boolean; delivered: boolean }
    >()
    for (const o of orders) {
      if (!o.invoice) continue
      existingInvoices.set(normalizeInvoiceNumber(o.invoice.number), {
        orderId: o.id,
        voided: o.invoice.status === 'Anulada',
        delivered: o.lines.some((l) => l.qtyPickedUp > 0),
      })
    }
    return parseInvoicesCsv(csvText, {
      skus,
      warehouseIds: warehouses.map((w) => w.id),
      defaultWarehouse:
        warehouseId ?? activeWarehouseIds[0] ?? warehouses[0]?.id ?? '',
      availability,
      existingInvoices,
      defaultPrefix: prefixes.find((p) => p.active)?.prefix ?? 'FV',
      todayStr: TODAY_STR,
    })
  }

  const applyInvoicesImport: WmsContextType['applyInvoicesImport'] = (
    invoices
  ) => {
    let nextPartidas = [...partidas]
    const newMovs: Movement[] = []
    const newOrders: PickupOrder[] = []
    const voidIds = new Map<string, string>()
    let voided = 0
    let failed = 0
    const ts = nowTimestamp()

    for (const inv of invoices) {
      if (inv.action === 'importar') {
        try {
          const orderId = `PED-${nextOrderNumber(orders, newOrders.length)}`
          const reserved = reserveLines(
            nextPartidas,
            orderId,
            inv.warehouse,
            inv.lines.map((l) => ({
              sku: l.sku,
              qty: l.qty,
              unitPrice: l.unitPrice,
            })),
            ts
          )
          nextPartidas = reserved.partidas
          newMovs.push(...reserved.movements)
          newOrders.push({
            id: orderId,
            createdAt: inv.issuedAt,
            readyAt: null,
            customer: inv.customer,
            customerRut: inv.customerNit || 'Sin NIT',
            channel: 'Mostrador',
            warehouse: inv.warehouse,
            status: 'Reservado',
            advisor: inv.advisor || undefined,
            lines: reserved.lines,
            pickups: [],
            invoice: {
              number: inv.number,
              issuedAt: inv.issuedAt,
              status: 'Emitida',
              paymentMethod: inv.paymentMethod,
              source: 'Siigo (CSV)',
              issuedBy: userName,
            },
          })
        } catch {
          failed++
        }
      } else if (inv.action === 'anular') {
        const target = orders.find(
          (o) =>
            o.invoice &&
            normalizeInvoiceNumber(o.invoice.number) === inv.number &&
            o.invoice.status === 'Emitida'
        )
        if (target) {
          const released = releaseOrderStock(
            nextPartidas,
            target,
            `${target.id} (Factura ${inv.number} anulada en Siigo)`,
            ts
          )
          nextPartidas = released.partidas
          newMovs.push(...released.movements)
          voidIds.set(target.id, 'Anulada en Siigo (importación)')
          voided++
        }
      }
    }

    if (newOrders.length === 0 && voided === 0) {
      if (failed > 0) toast.error('No se pudo reservar ninguna factura')
      return { imported: 0, voided: 0, failed }
    }

    setPartidas(nextPartidas)
    setMovements((prev) => [...newMovs, ...prev])
    setOrders((prev) => [
      ...newOrders,
      ...prev.map((o) =>
        voidIds.has(o.id) ? voidedOrder(o, voidIds.get(o.id)!) : o
      ),
    ])
    const parts: string[] = []
    if (newOrders.length > 0) {
      const n = newOrders.length
      parts.push(
        `${n} ${n === 1 ? 'factura cargada' : 'facturas cargadas'} con stock reservado`
      )
    }
    if (voided > 0) {
      parts.push(`${voided} ${voided === 1 ? 'anulada' : 'anuladas'}`)
    }
    toast.success(parts.join(' · '))
    return { imported: newOrders.length, voided, failed }
  }

  const suggestInvoiceNumber = (prefix: string) => {
    const p = prefixes.find((x) => x.prefix === prefix)
    return `${prefix}-${p?.nextNumber ?? 1}`
  }

  const invoiceOrder: WmsContextType['invoiceOrder'] = (
    orderId,
    { number, paymentMethod }
  ) => {
    const order = orders.find((o) => o.id === orderId)
    if (!order) return false
    if (order.invoice) {
      toast.error('Este pedido ya tiene factura')
      return false
    }
    if (order.status === 'Cancelado' || order.status === 'Entregado') {
      toast.error('Este pedido ya no se puede facturar')
      return false
    }
    const normalized = normalizeInvoiceNumber(number)
    const match = normalized.match(/^([A-Z]{1,6})-(\d{1,10})$/)
    if (!match) {
      toast.error(
        'El número debe tener prefijo y consecutivo, por ejemplo FV-10459'
      )
      return false
    }
    const prefixCfg = prefixes.find((p) => p.prefix === match[1] && p.active)
    if (!prefixCfg) {
      toast.error(
        `El prefijo ${match[1]} no está habilitado en Facturación y cajas`
      )
      return false
    }
    if (
      orders.some(
        (o) =>
          o.invoice && normalizeInvoiceNumber(o.invoice.number) === normalized
      )
    ) {
      toast.error(`La factura ${normalized} ya está registrada en otro pedido`)
      return false
    }

    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              invoice: {
                number: normalized,
                issuedAt: TODAY_STR,
                status: 'Emitida',
                paymentMethod,
                source: 'Caja',
                issuedBy: userName,
              },
            }
          : o
      )
    )
    const consecutive = Number(match[2])
    if (consecutive >= prefixCfg.nextNumber) {
      setPrefixes((prev) =>
        prev.map((p) =>
          p.prefix === prefixCfg.prefix
            ? { ...p, nextNumber: consecutive + 1 }
            : p
        )
      )
    }
    toast.success(`Factura ${normalized} registrada · ${paymentMethod}`)
    return true
  }

  const voidInvoice: WmsContextType['voidInvoice'] = (orderId, reason) => {
    const order = orders.find((o) => o.id === orderId)
    if (!order?.invoice || order.invoice.status === 'Anulada') return false
    if (role !== 'ADM' && role !== 'JB' && role !== 'CAJ') {
      toast.error('Tu perfil no puede anular facturas')
      return false
    }
    if (reason.trim().length < 5) {
      toast.error('Indica el motivo de la anulación')
      return false
    }
    const ts = nowTimestamp()
    const released = releaseOrderStock(
      partidas,
      order,
      `${order.id} (Factura ${order.invoice.number} anulada)`,
      ts
    )
    setPartidas(released.partidas)
    setMovements((prev) => [...released.movements, ...prev])
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? voidedOrder(o, reason.trim()) : o))
    )
    const delivered = order.lines.some((l) => l.qtyPickedUp > 0)
    if (delivered) {
      toast.warning(
        `Factura ${order.invoice.number} anulada, pero ya había mercancía entregada: queda para revisión en Conciliación`
      )
    } else {
      toast.info(`Factura ${order.invoice.number} anulada y stock liberado`)
    }
    return true
  }

  const prepareOrder = (orderId: string) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId ? { ...o, status: 'Preparado', readyAt: TODAY_STR } : o
      )
    )
    toast.success(`Pedido ${orderId} preparado y listo para entrega en bodega`)
  }

  const nextRemission = () => `REM-${remissionSeq}`

  const registerPickup: WmsContextType['registerPickup'] = (
    orderId,
    { receivedByName, receivedByRut, docRef, quantities, photos }
  ) => {
    const order = orders.find((o) => o.id === orderId)
    if (!order) return false

    const block = deliveryBlockReason(order)
    if (block) {
      toast.error(DELIVERY_BLOCK_MESSAGE[block])
      return false
    }

    let nextPartidas = [...partidas]
    const newMovs: Movement[] = []
    const pickedItems: { sku: string; qty: number }[] = []
    const ts = nowTimestamp()
    const remision = docRef?.trim() || nextRemission()

    const nextLines = order.lines.map((line) => {
      const pendingLine = line.qtyOrdered - line.qtyPickedUp
      const toDeliver = Math.max(
        0,
        Math.min(pendingLine, Math.floor(quantities[line.sku] ?? 0))
      )
      if (toDeliver <= 0) return line

      pickedItems.push({ sku: line.sku, qty: toDeliver })
      let rem = toDeliver
      const nextAllocs = line.allocations
        .map((a) => {
          if (rem <= 0 || a.qty <= 0) return a
          const take = Math.min(rem, a.qty)
          const res = move(nextPartidas, {
            ts,
            partidaId: a.partidaId,
            from: 'reservado',
            to: null,
            qty: take,
            type: 'Entrega',
            ref: `${order.invoice?.number ?? orderId} · ${remision}`,
            user: userName,
            outDateStr: TODAY_STR,
          })
          nextPartidas = res.partidas
          newMovs.push(res.movement)
          rem -= take
          return { ...a, qty: a.qty - take }
        })
        .filter((a) => a.qty > 0)

      return {
        ...line,
        qtyPickedUp: line.qtyPickedUp + toDeliver,
        allocations: nextAllocs,
      }
    })

    if (pickedItems.length === 0) {
      toast.error('Ingresa al menos 1 unidad para entregar')
      return false
    }

    const allCompleted = nextLines.every((l) => l.qtyPickedUp >= l.qtyOrdered)
    const nextStatus: PickupOrder['status'] = allCompleted
      ? 'Entregado'
      : 'Retiro parcial'

    setPartidas(nextPartidas)
    setMovements((prev) => [...newMovs, ...prev])
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              status: nextStatus,
              lines: nextLines,
              pickups: [
                ...o.pickups,
                {
                  ts,
                  receivedByName,
                  receivedByRut,
                  docRef: remision,
                  items: pickedItems,
                  deliveredBy: userName,
                  photos: photos && photos.length > 0 ? photos : undefined,
                },
              ],
            }
          : o
      )
    )
    if (remision === nextRemission()) setRemissionSeq((n) => n + 1)
    toast.success(
      allCompleted
        ? `Entrega completa de la factura ${order.invoice?.number ?? orderId} a ${receivedByName}`
        : `Entrega parcial registrada; el saldo de ${order.invoice?.number ?? orderId} sigue pendiente`
    )
    return true
  }

  const cancelOrder = (orderId: string) => {
    const order = orders.find((o) => o.id === orderId)
    if (!order || order.status === 'Entregado' || order.status === 'Cancelado')
      return
    if (order.invoice?.status === 'Emitida') {
      toast.error('El pedido tiene factura vigente: anula primero la factura')
      return
    }

    const ts = nowTimestamp()
    const released = releaseOrderStock(
      partidas,
      order,
      `${orderId} (Cancelado)`,
      ts
    )
    setPartidas(released.partidas)
    setMovements((prev) => [...released.movements, ...prev])
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              status: 'Cancelado',
              lines: o.lines.map((l) => ({ ...l, allocations: [] })),
            }
          : o
      )
    )
    toast.info(`Pedido ${orderId} cancelado y stock liberado a disponible`)
  }

  const updateInvoicePrefix: WmsContextType['updateInvoicePrefix'] = (
    prefix,
    patch
  ) => {
    setPrefixes((prev) =>
      prev.map((p) => (p.prefix === prefix ? { ...p, ...patch } : p))
    )
  }

  const addInvoicePrefix: WmsContextType['addInvoicePrefix'] = (
    prefix,
    description
  ) => {
    const clean = prefix.trim().toUpperCase()
    if (!/^[A-Z]{1,6}$/.test(clean)) {
      toast.error('El prefijo solo lleva letras (hasta 6), por ejemplo FV')
      return false
    }
    if (prefixes.some((p) => p.prefix === clean)) {
      toast.error(`El prefijo ${clean} ya existe`)
      return false
    }
    setPrefixes((prev) => [
      ...prev,
      {
        prefix: clean,
        description: description.trim() || 'Prefijo de facturación',
        nextNumber: 1,
        active: true,
      },
    ])
    toast.success(`Prefijo ${clean} habilitado`)
    return true
  }

  const addPointOfSale: WmsContextType['addPointOfSale'] = ({
    name,
    warehouse: wh,
    prefix,
  }) => {
    if (name.trim().length < 3) {
      toast.error('Escribe el nombre del punto de venta')
      return
    }
    setPointsOfSale((prev) => [
      ...prev,
      {
        id: `PV-${String(prev.length + 1).padStart(2, '0')}`,
        name: name.trim(),
        warehouse: wh,
        prefix,
        active: true,
      },
    ])
    toast.success(`Punto de venta «${name.trim()}» creado`)
  }

  const updatePointOfSale: WmsContextType['updatePointOfSale'] = (
    id,
    patch
  ) => {
    setPointsOfSale((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...patch } : p))
    )
  }

  const reportDamage: WmsContextType['reportDamage'] = ({
    partidaId,
    qty,
    reason,
    evidence,
    claimableToSupplier,
    photos,
  }) => {
    const p = partidas.find((x) => x.id === partidaId)
    if (!p) return
    try {
      const dmgId = `DMG-${304 + damages.length}`
      const ts = nowTimestamp()
      const userLabel = userName
      const res = move(partidas, {
        ts,
        partidaId,
        from: 'disponible',
        to: 'danado',
        qty,
        type: 'Daño',
        ref: dmgId,
        user: userLabel,
      })
      const newDmg: DamageReport = {
        id: dmgId,
        createdAt: ts,
        partidaId,
        sku: p.sku,
        warehouse: p.warehouse,
        qty,
        valueCOP: qty * unitCostOf(p.sku),
        valueUSD: qty * unitCostOf(p.sku),
        reason,
        evidence,
        photos: photos && photos.length > 0 ? photos : undefined,
        claimableToSupplier,
        reportedBy: userLabel,
        status: 'Pendiente',
      }
      setPartidas(res.partidas)
      setMovements((prev) => [res.movement, ...prev])
      setDamages((prev) => [newDmg, ...prev])
      toast.warning(`Daño ${dmgId} registrado (${qty} uds)`)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Error al registrar daño'
      )
    }
  }

  const resolveDamage: WmsContextType['resolveDamage'] = (
    damageId,
    decision
  ) => {
    const dmg = damages.find((d) => d.id === damageId)
    if (!dmg || dmg.status !== 'Pendiente') return

    const dmgVal = dmg.valueCOP ?? dmg.valueUSD
    if (decision === 'Baja aprobada' && !canApproveByRole(role, dmgVal)) {
      toast.error('Tu perfil no tiene atribuciones para aprobar este monto')
      return
    }

    const ts = nowTimestamp()
    const userLabel = userName
    const p = partidas.find((x) => x.id === dmg.partidaId)
    if (!p) return

    if (decision === 'Baja aprobada') {
      const res = move(partidas, {
        ts,
        partidaId: dmg.partidaId,
        from: 'danado',
        to: null,
        qty: dmg.qty,
        type: 'Baja',
        ref: `${dmg.id} · ${dmg.reason}`,
        user: userLabel,
      })
      setPartidas(res.partidas)
      setMovements((prev) => [res.movement, ...prev])
      toast.success(`Baja ${dmg.id} aprobada (${dmg.qty} uds)`)
    } else if (decision === 'Enviado a reclamo') {
      const claimId = `REC-${710 + claims.length}`
      const res = move(partidas, {
        ts,
        partidaId: dmg.partidaId,
        from: 'danado',
        to: 'reclamo',
        qty: dmg.qty,
        type: 'Reclamo',
        ref: `${claimId} · Desde ${dmg.id}`,
        user: userLabel,
      })
      setPartidas(res.partidas)
      setMovements((prev) => [res.movement, ...prev])
      setClaims((prev) => [
        {
          id: claimId,
          createdAt: TODAY_STR,
          type: 'Proveedor',
          counterparty: p.supplier,
          docRef: dmg.id,
          partidaId: dmg.partidaId,
          sku: dmg.sku,
          warehouse: dmg.warehouse,
          qty: dmg.qty,
          valueCOP: dmg.valueCOP ?? dmg.valueUSD,
          valueUSD: dmg.valueUSD ?? dmg.valueCOP,
          reason: dmg.reason,
          status: 'Abierto',
        },
        ...prev,
      ])
      toast.info(`Daño ${dmg.id} derivado a reclamo ${claimId}`)
    } else {
      const res = move(partidas, {
        ts,
        partidaId: dmg.partidaId,
        from: 'danado',
        to: 'disponible',
        qty: dmg.qty,
        type: 'Reintegro',
        ref: `${dmg.id} (Rechazado)`,
        user: userLabel,
      })
      setPartidas(res.partidas)
      setMovements((prev) => [res.movement, ...prev])
      toast.info(`Daño ${dmg.id} rechazado; unidades devueltas a disponible`)
    }

    setDamages((prev) =>
      prev.map((d) =>
        d.id === damageId
          ? { ...d, status: decision, resolvedBy: userLabel }
          : d
      )
    )
  }

  const scheduleCount = (wh: string, partidaId: string) => {
    const p = partidas.find((x) => x.id === partidaId)
    if (!p) return
    const id = `CNT-${405 + counts.length}`
    setCounts((prev) => [
      {
        id,
        scheduledAt: TODAY_STR,
        warehouse: wh,
        partidaId,
        sku: p.sku,
        expectedQty: p.qty.disponible,
        countedQty: null,
        status: 'Programado',
      },
      ...prev,
    ])
    toast.success(`Conteo ciego ${id} programado para ${p.sku}`)
  }

  const submitCount = (countId: string, countedQty: number) => {
    const cnt = counts.find((c) => c.id === countId)
    if (!cnt || cnt.status !== 'Programado') return

    const userLabel = userName
    const delta = countedQty - cnt.expectedQty

    if (delta === 0) {
      setCounts((prev) =>
        prev.map((c) =>
          c.id === countId
            ? {
                ...c,
                countedQty,
                countedBy: userLabel,
                status: 'Contado sin diferencia',
              }
            : c
        )
      )
      toast.success(`Conteo ${countId} cuadrado sin diferencias`)
      return
    }

    const adjId = `AJ-${905 + adjustments.length}`
    const valueCOP = Math.abs(delta) * unitCostOf(cnt.sku)
    const valueUSD = valueCOP
    setCounts((prev) =>
      prev.map((c) =>
        c.id === countId
          ? {
              ...c,
              countedQty,
              countedBy: userLabel,
              status: 'Ajuste generado',
            }
          : c
      )
    )
    setAdjustments((prev) => [
      {
        id: adjId,
        createdAt: nowTimestamp(),
        countId,
        partidaId: cnt.partidaId,
        sku: cnt.sku,
        warehouse: cnt.warehouse,
        qtyDelta: delta,
        valueCOP,
        valueUSD,
        reason:
          delta < 0
            ? `Faltante de ${Math.abs(delta)} uds en conteo ciego ${countId}`
            : `Sobrante de ${delta} uds en conteo ciego ${countId}`,
        evidence: `Registro de conteo ciego ${countId}`,
        requestedBy: userLabel,
        status: 'Pendiente',
      },
      ...prev,
    ])
    toast.warning(
      `Diferencia detectada (${delta > 0 ? `+${delta}` : delta} uds): se generó ${adjId}`
    )
  }

  const resolveAdjustment = (adjustmentId: string, approve: boolean) => {
    const adj = adjustments.find((a) => a.id === adjustmentId)
    if (!adj || adj.status !== 'Pendiente') return

    const adjVal = adj.valueCOP ?? adj.valueUSD
    if (!canApproveByRole(role, adjVal)) {
      toast.error('Tu perfil no puede aprobar ajustes por este monto')
      return
    }

    const userLabel = userName
    const ts = nowTimestamp()

    if (approve) {
      try {
        const res =
          adj.qtyDelta < 0
            ? move(partidas, {
                ts,
                partidaId: adj.partidaId,
                from: 'disponible',
                to: null,
                qty: Math.abs(adj.qtyDelta),
                type: 'Ajuste conteo',
                ref: `${adj.id} · ${adj.reason}`,
                user: userLabel,
              })
            : move(partidas, {
                ts,
                partidaId: adj.partidaId,
                from: null,
                to: 'disponible',
                qty: adj.qtyDelta,
                type: 'Ajuste conteo',
                ref: `${adj.id} · ${adj.reason}`,
                user: userLabel,
              })
        setPartidas(res.partidas)
        setMovements((prev) => [res.movement, ...prev])
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : 'No se pudo aplicar el ajuste'
        )
        return
      }
    }

    setAdjustments((prev) =>
      prev.map((a) =>
        a.id === adjustmentId
          ? {
              ...a,
              status: approve ? 'Aprobado' : 'Rechazado',
              resolvedBy: userLabel,
            }
          : a
      )
    )
    toast.success(
      `Ajuste ${adjustmentId} ${approve ? 'aprobado y aplicado' : 'rechazado'}`
    )
  }

  const openCustomerReturn: WmsContextType['openCustomerReturn'] = ({
    customer,
    docRef,
    partidaId,
    qty,
    reason,
  }) => {
    const p = partidas.find((x) => x.id === partidaId)
    if (!p) return
    const claimId = `REC-${710 + claims.length}`
    const ts = nowTimestamp()
    const userLabel = userName

    const res = move(partidas, {
      ts,
      partidaId,
      from: null,
      to: 'reclamo',
      qty,
      type: 'Devolución cliente',
      ref: `${claimId} · ${docRef}`,
      user: userLabel,
    })

    setPartidas(res.partidas)
    setMovements((prev) => [res.movement, ...prev])
    setClaims((prev) => [
      {
        id: claimId,
        createdAt: TODAY_STR,
        type: 'Cliente',
        counterparty: customer,
        docRef,
        partidaId,
        sku: p.sku,
        warehouse: p.warehouse,
        qty,
        valueCOP: qty * unitCostOf(p.sku),
        valueUSD: qty * unitCostOf(p.sku),
        reason,
        status: 'Abierto',
      },
      ...prev,
    ])
    toast.success(
      `Devolución de cliente ${claimId} registrada en estado Reclamo`
    )
  }

  const advanceClaim: WmsContextType['advanceClaim'] = (claimId, action) => {
    const clm = claims.find((c) => c.id === claimId)
    if (!clm || clm.status === 'Resuelto') return

    const ts = nowTimestamp()
    const userLabel = userName
    const p = partidas.find((x) => x.id === clm.partidaId)

    if (action === 'Enviar') {
      setClaims((prev) =>
        prev.map((c) => (c.id === claimId ? { ...c, status: 'Enviado' } : c))
      )
      toast.info(`Reclamo ${claimId} marcado como enviado`)
      return
    }

    const physicalInClaim = p ? Math.min(p.qty.reclamo, clm.qty) : 0

    if (action === 'Nota de crédito / Descarte') {
      if (physicalInClaim > 0) {
        const res = move(partidas, {
          ts,
          partidaId: clm.partidaId,
          from: 'reclamo',
          to: null,
          qty: physicalInClaim,
          type: 'Devolución proveedor',
          ref: `${claimId} · Nota de crédito`,
          user: userLabel,
        })
        setPartidas(res.partidas)
        setMovements((prev) => [res.movement, ...prev])
      }
      setClaims((prev) =>
        prev.map((c) =>
          c.id === claimId
            ? {
                ...c,
                status: 'Resuelto',
                resolution: 'Nota de crédito emitida',
              }
            : c
        )
      )
      toast.success(`Reclamo ${claimId} resuelto con nota de crédito`)
    } else if (action === 'Reintegrar a disponible') {
      if (physicalInClaim > 0) {
        const res = move(partidas, {
          ts,
          partidaId: clm.partidaId,
          from: 'reclamo',
          to: 'disponible',
          qty: physicalInClaim,
          type: 'Reintegro',
          ref: `${claimId} · Reintegrado`,
          user: userLabel,
        })
        setPartidas(res.partidas)
        setMovements((prev) => [res.movement, ...prev])
      }
      setClaims((prev) =>
        prev.map((c) =>
          c.id === claimId
            ? {
                ...c,
                status: 'Resuelto',
                resolution: 'Reintegrado a disponible',
              }
            : c
        )
      )
      toast.success(`Reclamo ${claimId}: unidades reintegradas a disponible`)
    } else if (action === 'Pasar a dañado' && p && physicalInClaim > 0) {
      const dmgId = `DMG-${304 + damages.length}`
      const res = move(partidas, {
        ts,
        partidaId: clm.partidaId,
        from: 'reclamo',
        to: 'danado',
        qty: physicalInClaim,
        type: 'Daño',
        ref: `${dmgId} · Desde ${claimId}`,
        user: userLabel,
      })
      setPartidas(res.partidas)
      setMovements((prev) => [res.movement, ...prev])
      setDamages((prev) => [
        {
          id: dmgId,
          createdAt: ts,
          partidaId: clm.partidaId,
          sku: clm.sku,
          warehouse: clm.warehouse,
          qty: physicalInClaim,
          valueCOP: physicalInClaim * unitCostOf(clm.sku),
          valueUSD: physicalInClaim * unitCostOf(clm.sku),
          reason: `Devolución con daño (${claimId})`,
          evidence: clm.docRef,
          claimableToSupplier: false,
          reportedBy: userLabel,
          status: 'Pendiente',
        },
        ...prev,
      ])
      setClaims((prev) =>
        prev.map((c) =>
          c.id === claimId
            ? {
                ...c,
                status: 'Resuelto',
                resolution: `Pasado a daño (${dmgId})`,
              }
            : c
        )
      )
      toast.warning(`Reclamo ${claimId} derivado a daño ${dmgId}`)
    }
  }

  const createTransfer = (
    originWarehouse: string,
    destWarehouse: string,
    partidaId: string,
    qtyRequested: number
  ) => {
    const p = partidas.find((x) => x.id === partidaId)
    if (!p) return
    const skuObj = skus.find((s) => s.sku === p.sku)
    const id = `TRB-2026-0${420 + transfers.length}`
    setTransfers((prev) => [
      {
        id,
        createdAt: nowTimestamp(),
        originWarehouse,
        destWarehouse,
        partidaId,
        sku: p.sku,
        skuName: skuObj ? skuObj.name : p.sku,
        qtyRequested,
        qtySent: 0,
        qtyReceived: null,
        status: 'Solicitado',
        carrier: 'Vehículo de carga #02',
        guideNumber: 'Pendiente emisión',
        requestedBy: userName,
        approvedBy: 'Pendiente aprobación',
        notes: 'Abastecimiento entre bodegas',
      },
      ...prev,
    ])
    toast.success(`Traspaso ${id} solicitado`)
  }

  const advanceTransfer = (id: string, nextStatus: WmsTransfer['status']) => {
    const t = transfers.find((x) => x.id === id)
    if (!t) return
    const ts = nowTimestamp()
    const userLabel = userName

    try {
      let nextPartidas = [...partidas]
      const newMovs: Movement[] = []

      if (nextStatus === 'En tránsito') {
        const res = move(nextPartidas, {
          ts,
          partidaId: t.partidaId,
          from: 'disponible',
          to: 'transito',
          qty: t.qtyRequested,
          type: 'Traspaso salida',
          ref: t.id,
          user: userLabel,
        })
        nextPartidas = res.partidas
        newMovs.push(res.movement)
      } else if (
        nextStatus === 'Recibido total' ||
        nextStatus === 'Cerrado con diferencias'
      ) {
        const sent = t.qtySent || t.qtyRequested
        const broken =
          nextStatus === 'Cerrado con diferencias' ? Math.min(2, sent) : 0
        const good = sent - broken

        const originPartida = nextPartidas.find((p) => p.id === t.partidaId)
        if (originPartida && originPartida.qty.transito >= sent) {
          const outRes = move(nextPartidas, {
            ts,
            partidaId: t.partidaId,
            from: 'transito',
            to: null,
            qty: sent,
            type: 'Traspaso salida',
            ref: t.id,
            user: userLabel,
          })
          nextPartidas = outRes.partidas
          newMovs.push(outRes.movement)
        }

        let destPartida = nextPartidas.find(
          (p) => p.sku === t.sku && p.warehouse === t.destWarehouse
        )
        if (!destPartida) {
          destPartida = {
            id: `PAR-${Math.floor(600 + Math.random() * 350)}`,
            sku: t.sku,
            warehouse: t.destWarehouse,
            expiry: originPartida?.expiry ?? null,
            lastOutAt: TODAY_STR,
            receivedAt: TODAY_STR,
            supplier: originPartida?.supplier ?? 'Traspaso interno',
            qty: {
              disponible: 0,
              reservado: 0,
              danado: 0,
              reclamo: 0,
              transito: 0,
            },
          }
          nextPartidas = [destPartida, ...nextPartidas]
        }

        if (good > 0) {
          const inRes = move(nextPartidas, {
            ts,
            partidaId: destPartida.id,
            from: null,
            to: 'disponible',
            qty: good,
            type: 'Traspaso entrada',
            ref: t.id,
            user: userLabel,
          })
          nextPartidas = inRes.partidas
          newMovs.push(inRes.movement)
        }
        if (broken > 0) {
          const dmgId = `DMG-${304 + damages.length}`
          const dmgRes = move(nextPartidas, {
            ts,
            partidaId: destPartida.id,
            from: null,
            to: 'danado',
            qty: broken,
            type: 'Daño',
            ref: `${dmgId} · ${t.id}`,
            user: userLabel,
          })
          nextPartidas = dmgRes.partidas
          newMovs.push(dmgRes.movement)
          setDamages((prev) => [
            {
              id: dmgId,
              createdAt: ts,
              partidaId: destPartida.id,
              sku: t.sku,
              warehouse: t.destWarehouse,
              qty: broken,
              valueCOP: broken * unitCostOf(t.sku),
              valueUSD: broken * unitCostOf(t.sku),
              reason: `Rotura en tránsito de traspaso ${t.id}`,
              evidence: t.guideNumber,
              claimableToSupplier: false,
              reportedBy: userLabel,
              status: 'Pendiente',
            },
            ...prev,
          ])
        }
      }

      if (newMovs.length > 0) {
        setPartidas(nextPartidas)
        setMovements((prev) => [...newMovs, ...prev])
      }

      setTransfers((prev) =>
        prev.map((item) => {
          if (item.id !== id) return item
          const updated = { ...item, status: nextStatus }
          if (nextStatus === 'Aprobado') {
            updated.approvedBy = userLabel
            updated.guideNumber =
              'GT-' + Math.floor(890000 + Math.random() * 9000)
          } else if (nextStatus === 'En tránsito') {
            updated.qtySent = item.qtyRequested
          } else if (nextStatus === 'Recibido total') {
            updated.qtyReceived = item.qtySent
          } else if (nextStatus === 'Cerrado con diferencias') {
            updated.qtyReceived = Math.max(0, item.qtySent - 2)
          }
          return updated
        })
      )
      toast.success(`Traspaso ${id} → ${nextStatus}`)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'No se pudo avanzar el traspaso'
      )
    }
  }

  return (
    <WmsContext.Provider
      value={{
        user,
        users,
        role,
        switchUser,
        setRole,
        createUser,
        updateUser,
        resetDemoData,
        scenario,
        setScenario,
        topology,
        almacenes,
        warehouses,
        warehouse,
        setWarehouse,
        activeWarehouseIds,
        matchesScope,
        showRestricted,
        setShowRestricted,
        isReadOnly,
        hasAccess,
        canActOnScreen,
        canApproveAmount,
        skus,
        partidas,
        movements,
        orders,
        receipts,
        claims,
        damages,
        counts,
        adjustments,
        transfers,
        buckets,
        prefixes,
        pointsOfSale,
        updateInvoicePrefix,
        addInvoicePrefix,
        addPointOfSale,
        updatePointOfSale,
        updateOperationalParams,
        createSku,
        updateSkuCatalog,
        addStockPartida,
        receive,
        createOrder,
        previewInvoicesImport,
        applyInvoicesImport,
        suggestInvoiceNumber,
        invoiceOrder,
        voidInvoice,
        nextRemission,
        prepareOrder,
        registerPickup,
        cancelOrder,
        reportDamage,
        resolveDamage,
        scheduleCount,
        submitCount,
        resolveAdjustment,
        openCustomerReturn,
        advanceClaim,
        createTransfer,
        advanceTransfer,
      }}
    >
      {children}
    </WmsContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useWms() {
  const ctx = useContext(WmsContext)
  if (!ctx) throw new Error('useWms must be used within WmsProvider')
  return ctx
}
