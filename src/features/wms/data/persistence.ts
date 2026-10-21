import { storageGet, storageRemove, storageSet } from '@/lib/storage'
import type {
  ClaimCase,
  CountSession,
  DamageReport,
  InventoryAdjustment,
  Movement,
  Partida,
  PickupOrder,
  ReceiptRecord,
  SkuItem,
  WmsTransfer,
} from '@/features/wms/domain/inventory'
import type {
  TopologyScenario,
  WmsAlmacen,
  WmsWarehouse,
} from './topology-data'
import {
  INITIAL_USERS,
  type InvoicePrefix,
  type PointOfSale,
  type WmsUser,
} from './users-data'

/**
 * Sube la versión cuando cambien los datos de demostración o la forma de los
 * registros, para no mezclar datos guardados con un modelo distinto.
 */
const DATA_KEY = 'wms-decor:data:v1'

export interface PersistedState {
  scenario: TopologyScenario
  allAlmacenes: WmsAlmacen[]
  allWarehouses: WmsWarehouse[]
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
  users: WmsUser[]
  prefixes: InvoicePrefix[]
  pointsOfSale: PointOfSale[]
  remissionSeq: number
}

export function loadPersisted(): Partial<PersistedState> {
  const raw = storageGet(DATA_KEY)
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw) as Partial<PersistedState>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function stripPhotos(state: PersistedState): PersistedState {
  return {
    ...state,
    receipts: state.receipts.map((r) => ({ ...r, photos: undefined })),
    damages: state.damages.map((d) => ({ ...d, photos: undefined })),
    orders: state.orders.map((o) => ({
      ...o,
      pickups: o.pickups.map((p) => ({ ...p, photos: undefined })),
    })),
  }
}

/**
 * Guarda el estado. Si el navegador se queda sin espacio (las fotos pesan),
 * reintenta sin fotos para no perder el resto de los datos.
 */
export function savePersisted(
  state: PersistedState
): 'ok' | 'sin-fotos' | 'fallo' {
  if (storageSet(DATA_KEY, JSON.stringify(state))) return 'ok'
  if (storageSet(DATA_KEY, JSON.stringify(stripPhotos(state))))
    return 'sin-fotos'
  return 'fallo'
}

export function clearPersisted(): void {
  storageRemove(DATA_KEY)
}

/** Usuarios guardados, leídos sin montar el provider (inicio de sesión y guardia de rutas). */
export function loadUsers(): WmsUser[] {
  return loadPersisted().users ?? INITIAL_USERS
}

export function resolveSessionUser(userId: string | null): WmsUser | null {
  if (!userId) return null
  return loadUsers().find((u) => u.id === userId && u.active) ?? null
}
