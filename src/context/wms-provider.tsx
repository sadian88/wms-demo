import React, { createContext, useContext, useState } from 'react'
import { toast } from 'sonner'
import {
  INITIAL_ALERTS,
  INITIAL_ALMACENES,
  INITIAL_LOCATIONS,
  INITIAL_REPLENISHMENT_RULES,
  INITIAL_TRANSFERS,
  INITIAL_WAREHOUSES,
  TOPOLOGY_SCENARIOS,
  WMS_ROLES,
  WMS_STOCK_ITEMS,
  type RoleCode,
  type TopologyScenario,
  type WmsAlert,
  type WmsAlmacen,
  type WmsLocation,
  type WmsReplenishmentRule,
  type WmsScreen,
  type WmsTopologyConfig,
  type WmsTransfer,
  type WmsWarehouse,
} from '@/features/wms/data/wms-data'

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
  channel: string
  setChannel: (ch: string) => void
  showRestricted: boolean
  setShowRestricted: (show: boolean) => void
  isReadOnly: boolean
  hasAccess: (screen: WmsScreen) => boolean
  alerts: WmsAlert[]
  locations: WmsLocation[]
  replenishments: WmsReplenishmentRule[]
  transfers: WmsTransfer[]
  cycleAlertStatus: (id: string) => void
  updateOperationalParams: (
    id: string,
    patch: { cutoff?: string; schedule?: string; manager?: string }
  ) => void
  addLocation: (
    loc: Omit<
      WmsLocation,
      | 'maxWeightKg'
      | 'maxVolM3'
      | 'maxUnits'
      | 'currentUnits'
      | 'skuAssigned'
      | 'status'
    >
  ) => void
  triggerReplenishmentWave: () => void
  advanceTransfer: (id: string, nextStatus: WmsTransfer['status']) => void
  createTransfer: (
    originWarehouse: string,
    destWarehouse: string,
    sku: string,
    qtyRequested: number
  ) => void
}

const WmsContext = createContext<WmsContextType | null>(null)

export function WmsProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<RoleCode>('ALL')
  const [scenario, setScenarioState] = useState<TopologyScenario>('CASE_3')
  const [warehouse, setWarehouseState] = useState<string>('ALL')
  const [channel, setChannel] = useState<string>('Todos')
  const [showRestricted, setShowRestricted] = useState<boolean>(false)

  const [allAlmacenes, setAllAlmacenes] =
    useState<WmsAlmacen[]>(INITIAL_ALMACENES)
  const [allWarehouses, setAllWarehouses] =
    useState<WmsWarehouse[]>(INITIAL_WAREHOUSES)
  const [alerts, setAlerts] = useState<WmsAlert[]>(INITIAL_ALERTS)
  const [locations, setLocations] = useState<WmsLocation[]>(INITIAL_LOCATIONS)
  const [replenishments, setReplenishments] = useState<WmsReplenishmentRule[]>(
    INITIAL_REPLENISHMENT_RULES
  )
  const [transfers, setTransfers] = useState<WmsTransfer[]>(INITIAL_TRANSFERS)

  const topology = TOPOLOGY_SCENARIOS[scenario]
  const almacenes = allAlmacenes.filter((a) =>
    topology.almacenIds.includes(a.id)
  )
  const warehouses = allWarehouses.filter((w) =>
    topology.warehouseIds.includes(w.id)
  )

  const activeWarehouseIds = React.useMemo(() => {
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

  const hasAccess = (screen: WmsScreen) => {
    if (role === 'ALL') return true
    return screen.roles.includes(role)
  }

  const setRole = (newRole: RoleCode) => {
    setRoleState(newRole)
    toast.success(`Perfil activo: ${WMS_ROLES[newRole].name}`)
  }

  const setScenario = (sc: TopologyScenario) => {
    setScenarioState(sc)
    setWarehouseState('ALL')
    toast.info(`Estructura activa: ${TOPOLOGY_SCENARIOS[sc].title}`)
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

  const cycleAlertStatus = (id: string) => {
    const order: WmsAlert['status'][] = ['Abierta', 'En gestión', 'Cerrada']
    setAlerts((prev) =>
      prev.map((a) => {
        if (a.id !== id) return a
        const next = order[(order.indexOf(a.status) + 1) % order.length]
        toast.success(`Alerta ${id}: ${next}`)
        return { ...a, status: next }
      })
    )
  }

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

  const addLocation = (
    loc: Omit<
      WmsLocation,
      | 'maxWeightKg'
      | 'maxVolM3'
      | 'maxUnits'
      | 'currentUnits'
      | 'skuAssigned'
      | 'status'
    >
  ) => {
    const newLoc: WmsLocation = {
      ...loc,
      maxWeightKg: 2000,
      maxVolM3: 2.5,
      maxUnits: 96,
      currentUnits: 0,
      skuAssigned: 'Disponible para asignación de Tono/Lote',
      status: 'Activa',
    }
    setLocations((prev) => [newLoc, ...prev])
    toast.success(`Ubicación ${newLoc.code} dada de alta`)
  }

  const triggerReplenishmentWave = () => {
    let count = 0
    setReplenishments((prev) =>
      prev.map((r) => {
        if (matchesScope(r.warehouse) && r.currentPickQty < r.minQty) {
          count++
          return { ...r, currentPickQty: r.maxQty, status: 'Óptimo' }
        }
        return r
      })
    )
    if (count > 0) {
      toast.success(
        `Se generaron tareas de reposición para ${count} ubicaciones de picking`
      )
    } else {
      toast.info('Todas las ubicaciones están en nivel óptimo')
    }
  }

  const advanceTransfer = (id: string, nextStatus: WmsTransfer['status']) => {
    setTransfers((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t
        const updated = { ...t, status: nextStatus }
        if (nextStatus === 'Aprobado') {
          updated.approvedBy = 'Roberto Méndez (JB)'
          updated.guideNumber =
            'GDT-CL-' + Math.floor(890000 + Math.random() * 9000)
        } else if (nextStatus === 'En tránsito') {
          updated.qtySent = t.qtyRequested
        } else if (nextStatus === 'Recibido total') {
          updated.qtyReceived = t.qtySent
        } else if (nextStatus === 'Cerrado con diferencias') {
          updated.qtyReceived = Math.max(1, t.qtySent - 2)
        }
        return updated
      })
    )
    toast.success(`Traspaso ${id} → ${nextStatus}`)
  }

  const createTransfer = (
    originWarehouse: string,
    destWarehouse: string,
    sku: string,
    qtyRequested: number
  ) => {
    const item = WMS_STOCK_ITEMS.find((i) => i.sku === sku)
    const id = 'TRB-2026-0' + Math.floor(420 + Math.random() * 75)
    const newTr: WmsTransfer = {
      id,
      createdAt: 'Hoy 16:30',
      originWarehouse,
      destWarehouse,
      sku,
      skuName: item ? item.name : sku,
      qtyRequested,
      qtySent: 0,
      qtyReceived: null,
      status: 'Solicitado',
      carrier: 'Camión Plataforma Propio #02',
      guideNumber: 'Pendiente emisión',
      requestedBy: `Rol ${role}`,
      approvedBy: 'Pendiente aprobación',
      notes: 'Balanceo de cajas del mismo Tono/Calibre',
    }
    setTransfers((prev) => [newTr, ...prev])
    toast.success(`Solicitud de traspaso ${id} creada`)
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
        channel,
        setChannel,
        showRestricted,
        setShowRestricted,
        isReadOnly,
        hasAccess,
        alerts,
        locations,
        replenishments,
        transfers,
        cycleAlertStatus,
        updateOperationalParams,
        addLocation,
        triggerReplenishmentWave,
        advanceTransfer,
        createTransfer,
      }}
    >
      {children}
    </WmsContext.Provider>
  )
}

export function useWms() {
  const ctx = useContext(WmsContext)
  if (!ctx) throw new Error('useWms must be used within WmsProvider')
  return ctx
}
