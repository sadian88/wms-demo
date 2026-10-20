import React, { createContext, useContext, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  WMS_ROLES,
  type RoleCode,
  type WmsScreen,
} from '@/features/wms/data/catalog'
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
  allocateFefo,
  canApproveByRole,
  computeBuckets,
  move,
  type ClaimCase,
  type CountSession,
  type DamageReport,
  type InventoryAdjustment,
  type MerchandiseBuckets,
  type Movement,
  type Partida,
  type PickupOrder,
  type ReceiptRecord,
  type SkuItem,
  type WmsTransfer,
} from '@/features/wms/domain/inventory'

const TODAY_STR = '2026-10-20'

interface WmsContextType {
  role: RoleCode
  setRole: (role: RoleCode) => void
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
  updateOperationalParams: (
    id: string,
    patch: { cutoff?: string; schedule?: string; manager?: string }
  ) => void
  createSku: (sku: SkuItem) => boolean
  updateSkuCatalog: (
    sku: string,
    patch: Partial<Omit<SkuItem, 'sku'>>
  ) => void
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
  }) => void
  createOrder: (params: {
    customer: string
    customerRut: string
    channel: PickupOrder['channel']
    warehouse: string
    lines: { sku: string; qty: number }[]
  }) => boolean
  importOrdersCsv: (csvText: string) => { imported: number; errors: string[] }
  prepareOrder: (orderId: string) => void
  registerPickup: (
    orderId: string,
    params: {
      receivedByName: string
      receivedByRut: string
      docRef: string
      quantities: Record<string, number>
    }
  ) => void
  cancelOrder: (orderId: string) => void
  reportDamage: (params: {
    partidaId: string
    qty: number
    reason: string
    evidence: string
    claimableToSupplier: boolean
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
}

const WmsContext = createContext<WmsContextType | null>(null)

function nowTimestamp(): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${TODAY_STR} ${pad(now.getHours())}:${pad(now.getMinutes())}`
}

export function WmsProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<RoleCode>('ADM')
  const [scenario, setScenarioState] = useState<TopologyScenario>('CASE_3')
  const [warehouse, setWarehouseState] = useState<string>('ALL')
  const [showRestricted, setShowRestricted] = useState<boolean>(false)

  const [allAlmacenes, setAllAlmacenes] =
    useState<WmsAlmacen[]>(INITIAL_ALMACENES)
  const [allWarehouses, setAllWarehouses] =
    useState<WmsWarehouse[]>(INITIAL_WAREHOUSES)

  const [skus, setSkus] = useState<SkuItem[]>(INITIAL_SKUS)
  const [partidas, setPartidas] = useState<Partida[]>(INITIAL_PARTIDAS)
  const [movements, setMovements] = useState<Movement[]>(INITIAL_MOVEMENTS)
  const [orders, setOrders] = useState<PickupOrder[]>(INITIAL_ORDERS)
  const [receipts, setReceipts] = useState<ReceiptRecord[]>(INITIAL_RECEIPTS)
  const [claims, setClaims] = useState<ClaimCase[]>(INITIAL_CLAIMS)
  const [damages, setDamages] = useState<DamageReport[]>(INITIAL_DAMAGES)
  const [counts, setCounts] = useState<CountSession[]>(INITIAL_COUNTS)
  const [adjustments, setAdjustments] =
    useState<InventoryAdjustment[]>(INITIAL_ADJUSTMENTS)
  const [transfers, setTransfers] = useState<WmsTransfer[]>(INITIAL_TRANSFERS)

  const topology = TOPOLOGY_SCENARIOS[scenario] || TOPOLOGY_SCENARIOS.CASE_3
  const almacenes = allAlmacenes.filter((a) =>
    (topology?.almacenIds ?? []).includes(a.id)
  )
  const warehouses = allWarehouses.filter((w) =>
    (topology?.warehouseIds ?? []).includes(w.id)
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
  const canApproveAmount = (valueCOP: number) => canApproveByRole(role, valueCOP)

  const buckets = useMemo(
    () =>
      computeBuckets(
        { skus, partidas, orders, damages, claims, adjustments, movements },
        activeWarehouseIds,
        TODAY_STR
      ),
    [skus, partidas, orders, damages, claims, adjustments, movements, activeWarehouseIds]
  )

  const setRole = (newRole: RoleCode) => {
    const valid = WMS_ROLES[newRole] ? newRole : 'ADM'
    setRoleState(valid)
    toast.success(`Perfil activo: ${WMS_ROLES[valid].name}`)
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
    setSkus((prev) =>
      prev.map((s) => (s.sku === sku ? { ...s, ...patch } : s))
    )
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
    const userLabel = WMS_ROLES[role].name
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
    toast.success(`Stock ingresado: Partida ${partidaId} (+${qty} uds de ${sku} en ${wh})`)
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
  }) => {
    const userLabel = WMS_ROLES[role].name
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

    const missingQty = Math.max(
      0,
      expectedQty - receivedGoodQty - damagedQty
    )
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
    }
    setReceipts((prev) => [rec, ...prev])
  }

  const createOrder: WmsContextType['createOrder'] = ({
    customer,
    customerRut,
    channel,
    warehouse: wh,
    lines,
  }) => {
    try {
      let nextPartidas = [...partidas]
      const newMovs: Movement[] = []
      const orderId = `PED-${2220 + orders.length}`
      const ts = nowTimestamp()
      const userLabel = WMS_ROLES[role].name

      const builtLines = lines.map((l) => {
        const allocs = allocateFefo(nextPartidas, l.sku, wh, l.qty)
        for (const a of allocs) {
          const res = move(nextPartidas, {
            ts,
            partidaId: a.partidaId,
            from: 'disponible',
            to: 'reservado',
            qty: a.qty,
            type: 'Reserva',
            ref: orderId,
            user: userLabel,
          })
          nextPartidas = res.partidas
          newMovs.push(res.movement)
        }
        return {
          sku: l.sku,
          qtyOrdered: l.qty,
          qtyPickedUp: 0,
          allocations: allocs,
        }
      })

      const newOrder: PickupOrder = {
        id: orderId,
        createdAt: TODAY_STR,
        readyAt: null,
        customer,
        customerRut,
        channel,
        warehouse: wh,
        status: 'Reservado',
        lines: builtLines,
        pickups: [],
      }

      setPartidas(nextPartidas)
      setMovements((prev) => [...newMovs, ...prev])
      setOrders((prev) => [newOrder, ...prev])
      toast.success(`Pedido ${orderId} creado con reserva FEFO`)
      return true
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'No se pudo reservar el pedido'
      )
      return false
    }
  }

  const importOrdersCsv = (csvText: string) => {
    const rawLines = csvText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.toLowerCase().startsWith('cliente'))

    let nextPartidas = [...partidas]
    const newMovs: Movement[] = []
    const newOrders: PickupOrder[] = []
    const errors: string[] = []
    const ts = nowTimestamp()
    const userLabel = WMS_ROLES[role].name

    rawLines.forEach((row, idx) => {
      const cols = row.split(',').map((c) => c.trim())
      if (cols.length < 4) {
        errors.push(`Fila ${idx + 1}: formato inválido (use cliente,sku,cantidad,bodega)`)
        return
      }
      const [customer, sku, qtyStr, wh] = cols
      const qty = Number(qtyStr)
      if (!customer || !skus.some((s) => s.sku === sku)) {
        errors.push(`Fila ${idx + 1}: SKU ${sku} no existe en el catálogo`)
        return
      }
      if (!Number.isInteger(qty) || qty <= 0) {
        errors.push(`Fila ${idx + 1}: cantidad inválida (${qtyStr})`)
        return
      }
      try {
        const orderId = `PED-${2220 + orders.length + newOrders.length}`
        const allocs = allocateFefo(nextPartidas, sku, wh, qty)
        for (const a of allocs) {
          const res = move(nextPartidas, {
            ts,
            partidaId: a.partidaId,
            from: 'disponible',
            to: 'reservado',
            qty: a.qty,
            type: 'Reserva',
            ref: orderId,
            user: userLabel,
          })
          nextPartidas = res.partidas
          newMovs.push(res.movement)
        }
        newOrders.push({
          id: orderId,
          createdAt: TODAY_STR,
          readyAt: null,
          customer,
          customerRut: '76.000.000-0',
          channel: 'Obra',
          warehouse: wh,
          status: 'Reservado',
          lines: [{ sku, qtyOrdered: qty, qtyPickedUp: 0, allocations: allocs }],
          pickups: [],
        })
      } catch (err) {
        errors.push(
          `Fila ${idx + 1}: ${err instanceof Error ? err.message : 'Stock insuficiente'}`
        )
      }
    })

    if (newOrders.length > 0) {
      setPartidas(nextPartidas)
      setMovements((prev) => [...newMovs, ...prev])
      setOrders((prev) => [...newOrders, ...prev])
      toast.success(`${newOrders.length} pedido(s) importado(s) con reserva FEFO`)
    }
    return { imported: newOrders.length, errors }
  }

  const prepareOrder = (orderId: string) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? { ...o, status: 'Preparado', readyAt: TODAY_STR }
          : o
      )
    )
    toast.success(`Pedido ${orderId} preparado y listo para retiro en bodega`)
  }

  const registerPickup: WmsContextType['registerPickup'] = (
    orderId,
    { receivedByName, receivedByRut, docRef, quantities }
  ) => {
    const order = orders.find((o) => o.id === orderId)
    if (!order) return

    let nextPartidas = [...partidas]
    const newMovs: Movement[] = []
    const pickedItems: { sku: string; qty: number }[] = []
    const ts = nowTimestamp()
    const userLabel = WMS_ROLES[role].name

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
            ref: `${orderId} · ${docRef}`,
            user: userLabel,
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
      toast.error('Ingresa al menos 1 unidad a retirar')
      return
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
                  docRef,
                  items: pickedItems,
                },
              ],
            }
          : o
      )
    )
    toast.success(
      allCompleted
        ? `Retiro completo de ${orderId} entregado a ${receivedByName}`
        : `Retiro parcial registrado en ${orderId}; saldo sigue pendiente`
    )
  }

  const cancelOrder = (orderId: string) => {
    const order = orders.find((o) => o.id === orderId)
    if (!order || order.status === 'Entregado' || order.status === 'Cancelado')
      return

    let nextPartidas = [...partidas]
    const newMovs: Movement[] = []
    const ts = nowTimestamp()
    const userLabel = WMS_ROLES[role].name

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
            ref: `${orderId} (Cancelado)`,
            user: userLabel,
          })
          nextPartidas = res.partidas
          newMovs.push(res.movement)
        }
      }
    }

    setPartidas(nextPartidas)
    setMovements((prev) => [...newMovs, ...prev])
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

  const reportDamage: WmsContextType['reportDamage'] = ({
    partidaId,
    qty,
    reason,
    evidence,
    claimableToSupplier,
  }) => {
    const p = partidas.find((x) => x.id === partidaId)
    if (!p) return
    try {
      const dmgId = `DMG-${304 + damages.length}`
      const ts = nowTimestamp()
      const userLabel = WMS_ROLES[role].name
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
        claimableToSupplier,
        reportedBy: userLabel,
        status: 'Pendiente',
      }
      setPartidas(res.partidas)
      setMovements((prev) => [res.movement, ...prev])
      setDamages((prev) => [newDmg, ...prev])
      toast.warning(`Daño ${dmgId} registrado (${qty} uds)`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al registrar daño')
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
    const userLabel = WMS_ROLES[role].name
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

    const userLabel = WMS_ROLES[role].name
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

    const userLabel = WMS_ROLES[role].name
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
    const userLabel = WMS_ROLES[role].name

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
    toast.success(`Devolución de cliente ${claimId} registrada en estado Reclamo`)
  }

  const advanceClaim: WmsContextType['advanceClaim'] = (claimId, action) => {
    const clm = claims.find((c) => c.id === claimId)
    if (!clm || clm.status === 'Resuelto') return

    const ts = nowTimestamp()
    const userLabel = WMS_ROLES[role].name
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
            ? { ...c, status: 'Resuelto', resolution: 'Nota de crédito emitida' }
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
            ? { ...c, status: 'Resuelto', resolution: 'Reintegrado a disponible' }
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
            ? { ...c, status: 'Resuelto', resolution: `Pasado a daño (${dmgId})` }
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
        carrier: 'Camión Plataforma #02',
        guideNumber: 'Pendiente emisión',
        requestedBy: WMS_ROLES[role].name,
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
    const userLabel = WMS_ROLES[role].name

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
              'GDT-CL-' + Math.floor(890000 + Math.random() * 9000)
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
        role,
        setRole,
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
        updateOperationalParams,
        createSku,
        updateSkuCatalog,
        addStockPartida,
        receive,
        createOrder,
        importOrdersCsv,
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