export type TopologyScenario = 'CASE_1' | 'CASE_2' | 'CASE_3'

export interface WmsTopologyConfig {
  id: TopologyScenario
  code: TopologyScenario
  badge: string
  title: string
  subtitle: string
  hasHeadquarters: boolean
  headquartersName: string | null
  headquartersRuc: string | null
  almacenIds: string[]
  warehouseIds: string[]
}

export interface WmsAlmacen {
  id: string
  name: string
  country: string
  city: string
  address: string
  timezone: string
  schedule: string
  cutoff: string
  status: 'Activo' | 'Inactivo'
  manager: string
  defaultWarehouseId: string
}

export interface WmsWarehouse {
  id: string
  almacenId: string
  almacenName: string
  isDefaultTied: boolean
  name: string
  type: 'Central' | 'Express' | 'Tienda' | 'Tercero'
  country: string
  city: string
  address: string
  timezone: string
  schedule: string
  cutoff: string
  status: 'Activa' | 'Inactiva'
  manager: string
}

export const TOPOLOGY_SCENARIOS: Record<TopologyScenario, WmsTopologyConfig> = {
  CASE_1: {
    id: 'CASE_1',
    code: 'CASE_1',
    badge: 'Caso 1 · 1 Almacén / 1 Bodega',
    title: 'Caso 1 · 1 Almacén con 1 Bodega (Sin Casa Matriz)',
    subtitle:
      'Operación unipunto: Un único Almacén con su Bodega principal atada por defecto, sin Casa Matriz.',
    hasHeadquarters: false,
    headquartersName: null,
    headquartersRuc: null,
    almacenIds: ['ALM-QUI'],
    warehouseIds: ['BOD-CEN-01'],
  },
  CASE_2: {
    id: 'CASE_2',
    code: 'CASE_2',
    badge: 'Caso 2 · 1 Almacén (2 Bodegas)',
    title: 'Caso 2 · 1 Almacén con 2 Bodegas (Sin Casa Matriz)',
    subtitle:
      'Un único Almacén físico que incluye su Bodega atada por defecto más 1 Bodega adicional contratada, sin Casa Matriz.',
    hasHeadquarters: false,
    headquartersName: null,
    headquartersRuc: null,
    almacenIds: ['ALM-QUI'],
    warehouseIds: ['BOD-CEN-01', 'BOD-MOR-04'],
  },
  CASE_3: {
    id: 'CASE_3',
    code: 'CASE_3',
    badge: 'Caso 3 · Casa Matriz (2 Almacenes)',
    title: 'Caso 3 · Casa Matriz con 2 Almacenes y 2 Bodegas c/u',
    subtitle:
      'Una Casa Matriz que agrupa 2 Almacenes físicos, donde cada Almacén tiene su Bodega atada por defecto + 1 Bodega adicional.',
    hasHeadquarters: true,
    headquartersName: 'Casa Matriz Ceramix Constructora',
    headquartersRuc: 'RUT 76.890.123-K',
    almacenIds: ['ALM-QUI', 'ALM-REN'],
    warehouseIds: ['BOD-CEN-01', 'BOD-MOR-04', 'BOD-OBR-02', 'BOD-SHW-03'],
  },
}

export const INITIAL_ALMACENES: WmsAlmacen[] = [
  {
    id: 'ALM-QUI',
    name: 'Almacén Central Quilicura',
    country: 'Chile',
    city: 'Santiago - Quilicura',
    address: 'Av. Cañaveral 920, Sector Industrial Quilicura',
    timezone: 'America/Santiago (UTC-3)',
    schedule: 'Lun-Vie 07:30 - 18:30 · Sáb 08:00 - 13:00',
    cutoff: '16:30 hrs',
    status: 'Activo',
    manager: 'Roberto Méndez (JB)',
    defaultWarehouseId: 'BOD-CEN-01',
  },
  {
    id: 'ALM-REN',
    name: 'Almacén Sucursal Norte & Obra',
    country: 'Chile',
    city: 'Santiago - Renca',
    address: 'Autopista Central Km 8.5, Recinto Logístico Renca',
    timezone: 'America/Santiago (UTC-3)',
    schedule: 'Lun-Sáb 07:00 - 19:00',
    cutoff: '17:30 hrs',
    status: 'Activo',
    manager: 'Carla Valdivia (JB)',
    defaultWarehouseId: 'BOD-OBR-02',
  },
]

export const INITIAL_WAREHOUSES: WmsWarehouse[] = [
  {
    id: 'BOD-CEN-01',
    almacenId: 'ALM-QUI',
    almacenName: 'Almacén Central Quilicura',
    isDefaultTied: true,
    name: 'Bodega Cerámica y Porcelanato',
    type: 'Central',
    country: 'Chile',
    city: 'Santiago - Quilicura',
    address: 'Av. Cañaveral 920, Nave Principal A',
    timezone: 'America/Santiago (UTC-3)',
    schedule: 'Lun-Vie 07:30 - 18:30 · Sáb 08:00 - 13:00',
    cutoff: '16:30 hrs',
    status: 'Activa',
    manager: 'Roberto Méndez (JB)',
  },
  {
    id: 'BOD-MOR-04',
    almacenId: 'ALM-QUI',
    almacenName: 'Almacén Central Quilicura',
    isDefaultTied: false,
    name: 'Bodega Pegamentos, Morteros y Químicos',
    type: 'Central',
    country: 'Chile',
    city: 'Santiago - Quilicura',
    address: 'Av. Cañaveral 920, Nave Seca B (FEFO)',
    timezone: 'America/Santiago (UTC-3)',
    schedule: 'Lun-Vie 08:00 - 18:00',
    cutoff: '15:30 hrs',
    status: 'Activa',
    manager: 'Patricia Soto (JB)',
  },
  {
    id: 'BOD-OBR-02',
    almacenId: 'ALM-REN',
    almacenName: 'Almacén Sucursal Norte & Obra',
    isDefaultTied: true,
    name: 'Bodega Patio Constructor y Retiro Obra',
    type: 'Express',
    country: 'Chile',
    city: 'Santiago - Renca',
    address: 'Autopista Central Km 8.5, Patio de Carga 1',
    timezone: 'America/Santiago (UTC-3)',
    schedule: 'Lun-Sáb 07:00 - 19:00',
    cutoff: '17:30 hrs',
    status: 'Activa',
    manager: 'Carla Valdivia (JB)',
  },
  {
    id: 'BOD-SHW-03',
    almacenId: 'ALM-REN',
    almacenName: 'Almacén Sucursal Norte & Obra',
    isDefaultTied: false,
    name: 'Bodega Showroom y Retiro Express',
    type: 'Tienda',
    country: 'Chile',
    city: 'Santiago - Renca',
    address: 'Autopista Central Km 8.5, Sala de Ventas Norte',
    timezone: 'America/Santiago (UTC-3)',
    schedule: 'Lun-Sáb 09:00 - 19:30',
    cutoff: '18:00 hrs',
    status: 'Activa',
    manager: 'Diego Araneda (JB)',
  },
]

