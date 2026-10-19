export type RoleCode =
  | 'ALL'
  | 'ADM'
  | 'JB'
  | 'REC'
  | 'PCK'
  | 'PKG'
  | 'CAL'
  | 'AUD'
  | 'COM'
  | 'TRA'
  | 'GER'

export interface WmsRole {
  code: RoleCode
  name: string
  description: string
  assignedCount: number
  readOnly: boolean
}

export interface WmsScreen {
  code: string
  slug: string
  name: string
  desc: string
  roles: RoleCode[]
  implemented?: boolean
  mobile?: boolean
}

export interface WmsModule {
  id: number
  name: string
  shortName: string
  implemented: boolean
  screens: WmsScreen[]
}

export type TopologyScenario = 'CASE_1' | 'CASE_2' | 'CASE_3'

export interface WmsTopologyConfig {
  id: TopologyScenario
  title: string
  subtitle: string
  hasHeadquarters: boolean
  headquartersName: string | null
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
  totalBins: number
  occupiedBins: number
  volumePct: number
  otif: number
  cycleHours: number
  accuracyPct: number
  dockToStockHours: number
  linesPerHour: number
  shrinkageStockPct: number
  shrinkageSalesPct: number
  returnRatePct: number
  failedDeliveryPct: number
  turnoverDays: number
  ordersToday: {
    pendientes: number
    picking: number
    packing: number
    listos: number
    despachados: number
  }
}

export interface WarehouseStockState {
  disponible: number
  reservado: number
  cuarentena: number
  bloqueado: number
  merma: number
  transito_interbodega: number
  transito_cliente: number
  devolucion: number
  oc_transito: number
  demanda_comprometida: number
  stock_seguridad: number
  demanda_leadtime: number
  backorder: number
}

export interface WmsStockItem {
  sku: string
  name: string
  category: string
  controlType: string
  unitCost: number
  agingTag: 'Normal' | 'Rezagado 30d' | 'Rezagado 60d' | 'Rezagado 90+d'
  daysWithoutMovement: number
  byWarehouse: Record<string, WarehouseStockState>
}

export interface WmsAlert {
  id: string
  timestamp: string
  warehouse: string
  category: string
  severity: 'Crítica' | 'Alta' | 'Media'
  title: string
  detail: string
  owner: string
  ownerRole: RoleCode
  status: 'Abierta' | 'En gestión' | 'Cerrada'
  targetScreenSlug: string
  targetScreenLabel: string
}

export interface WmsLocation {
  code: string
  warehouse: string
  zone: string
  aisle: string
  rack: string
  level: string
  bin: string
  storageType: string
  restriction: string
  maxWeightKg: number
  maxVolM3: number
  maxUnits: number
  currentUnits: number
  skuAssigned: string
  status: 'Activa' | 'Bloqueada' | 'En conteo'
}

export interface WmsReplenishmentRule {
  id: string
  warehouse: string
  sku: string
  skuName: string
  pickingBin: string
  reserveZone: string
  currentPickQty: number
  minQty: number
  maxQty: number
  unitMeasure: string
  status: string
}

export interface WmsTransfer {
  id: string
  createdAt: string
  originWarehouse: string
  destWarehouse: string
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

export const WMS_ROLES: Record<RoleCode, WmsRole> = {
  ALL: {
    code: 'ALL',
    name: 'Superusuario (Acceso Total)',
    description: 'Acceso ejecutivo completo a todos los módulos del sistema',
    assignedCount: 67,
    readOnly: false,
  },
  ADM: {
    code: 'ADM',
    name: 'Administrador',
    description: 'Configura el sistema, usuarios, integraciones y parámetros globales',
    assignedCount: 30,
    readOnly: false,
  },
  JB: {
    code: 'JB',
    name: 'Jefe de Bodega',
    description: 'Supervisa la operación de la bodega y aprueba traspasos, ajustes y bajas',
    assignedCount: 42,
    readOnly: false,
  },
  REC: {
    code: 'REC',
    name: 'Operario de recepción',
    description: 'Recibe pallets/cajas, verifica tono/calibre y ejecuta putaway',
    assignedCount: 9,
    readOnly: false,
  },
  PCK: {
    code: 'PCK',
    name: 'Operario de picking',
    description: 'Recolecta pedidos de cajas y sacos en terminal móvil',
    assignedCount: 6,
    readOnly: false,
  },
  PKG: {
    code: 'PKG',
    name: 'Operario de packing',
    description: 'Zuncha pallets, protege esquinas, pesa, etiqueta y entrega en muelle',
    assignedCount: 4,
    readOnly: false,
  },
  CAL: {
    code: 'CAL',
    name: 'Inspector de calidad',
    description: 'Inspecciona lotes, tonos, calibres y roturas de palmetas',
    assignedCount: 5,
    readOnly: false,
  },
  AUD: {
    code: 'AUD',
    name: 'Auditor',
    description: 'Controla conteos cíclicos, ajustes, bajas por rotura y trazabilidad',
    assignedCount: 11,
    readOnly: false,
  },
  COM: {
    code: 'COM',
    name: 'Comprador',
    description: 'Gestiona necesidad de compra, importaciones/OC y fábricas proveedoras',
    assignedCount: 12,
    readOnly: false,
  },
  TRA: {
    code: 'TRA',
    name: 'Coordinador de transporte',
    description: 'Gestiona camiones a obra, repartos, guías y excepciones de entrega',
    assignedCount: 12,
    readOnly: false,
  },
  GER: {
    code: 'GER',
    name: 'Gerencia',
    description: 'Solo lectura, con aprobaciones de montos mayores',
    assignedCount: 17,
    readOnly: true,
  },
}

export const WMS_MODULES: WmsModule[] = [
  {
    id: 1,
    name: 'Dashboard e Indicadores',
    shortName: 'Dashboard',
    implemented: true,
    screens: [
      { code: '1.1', slug: '1-1', name: 'Visión general', desc: 'Pedidos por estado, ocupación y cumplimiento por bodega o consolidado', roles: ['ADM', 'JB', 'GER'], implemented: true },
      { code: '1.2', slug: '1-2', name: 'KPIs operativos', desc: 'Exactitud de inventario, dock-to-stock, cumplimiento OTIF, mermas por rotura y cobertura', roles: ['ADM', 'JB', 'AUD', 'GER'], implemented: true },
      { code: '1.3', slug: '1-3', name: 'Alertas y excepciones', desc: 'Quiebres de tono/calibre, vencimientos de adhesivos, diferencias y atrasos', roles: ['ADM', 'JB', 'COM', 'TRA'], implemented: true },
    ],
  },
  {
    id: 2,
    name: 'Almacenes, Bodegas y Ubicaciones',
    shortName: 'Almacenes y Bodegas',
    implemented: true,
    screens: [
      { code: '2.1', slug: '2-1', name: 'Consolidado de inventario', desc: 'Stock por SKU (cajas/sacos), estado, almacén y bodega, con comparativos', roles: ['ADM', 'JB', 'COM', 'GER'], implemented: true },
      { code: '2.2', slug: '2-2', name: 'Almacenes y bodegas', desc: 'Estructura contratada de Casa Matriz, Almacenes y sus Bodegas atadas/adicionales, horarios y cortes', roles: ['ADM', 'JB'], implemented: true },
      { code: '2.3', slug: '2-3', name: 'Ubicaciones y zonas', desc: 'Pasillo-Rack-Nivel-Bin por bodega, soporte de peso en kg, fragilidad y estado', roles: ['ADM', 'JB'], implemented: true },
      { code: '2.4', slug: '2-4', name: 'Reglas de putaway y reposición', desc: 'Sugerencia por peso/formato/tono y mínimos/máximos de picking', roles: ['ADM', 'JB'], implemented: true },
      { code: '2.5', slug: '2-5', name: 'Traspasos entre bodegas', desc: 'Solicitud, aprobación, tránsito y recepción de traslados entre bodegas y almacenes', roles: ['JB', 'REC', 'PCK'], implemented: true },
    ],
  },
  {
    id: 3,
    name: 'Recepción e Ingresos',
    shortName: 'Recepción',
    implemented: false,
    screens: [
      { code: '3.1', slug: '3-1', name: 'Agenda de muelles y ASN', desc: 'Citas de descarga de contenedores/camiones y avisos anticipados', roles: ['JB', 'REC'] },
      { code: '3.2', slug: '3-2', name: 'Recepción contra OC', desc: 'Conteo de pallets/cajas, registro de Tono y Calibre contra OC', roles: ['REC', 'JB'] },
      { code: '3.3', slug: '3-3', name: 'Inspección de calidad', desc: 'Checklist de roturas, planaridad, tono/calibre y fotos', roles: ['CAL', 'JB'] },
      { code: '3.4', slug: '3-4', name: 'Putaway', desc: 'Tareas de ubicación de pallets en terminal móvil', roles: ['REC'], mobile: true },
      { code: '3.5', slug: '3-5', name: 'Etiquetas y LPN', desc: 'Generación y reimpresión de etiquetas por pallet (LPN) y tono', roles: ['REC', 'JB'] },
      { code: '3.6', slug: '3-6', name: 'Discrepancias con proveedor', desc: 'Diferencias o cajas rotas en origen contra guía/factura', roles: ['JB', 'COM'] },
    ],
  },
  {
    id: 4,
    name: 'Existencias y Stock',
    shortName: 'Existencias',
    implemented: false,
    screens: [
      { code: '4.1', slug: '4-1', name: 'Consulta de existencias', desc: 'On-hand filtrable por bodega, ubicación, SKU, lote/tono/calibre y estado', roles: ['ADM', 'JB', 'REC', 'PCK', 'PKG', 'CAL', 'AUD', 'COM', 'TRA', 'GER'] },
      { code: '4.2', slug: '4-2', name: 'Stock reservado', desc: 'Reservas por pedido de obra y canal, con liberación manual', roles: ['JB', 'ADM'] },
      { code: '4.3', slug: '4-3', name: 'Disponible y ATP', desc: 'Disponible real y ATP con importaciones/OC confirmadas', roles: ['JB', 'COM', 'GER'] },
      { code: '4.4', slug: '4-4', name: 'Kárdex y trazabilidad', desc: 'Historial inmutable y trazabilidad por lote, tono y calibre', roles: ['JB', 'AUD', 'GER'] },
      { code: '4.5', slug: '4-5', name: 'Bloqueo y recall por lote', desc: 'Bloqueo masivo de partidas defectuosas y pedidos afectados', roles: ['CAL', 'JB', 'ADM'] },
      { code: '4.6', slug: '4-6', name: 'Ajustes de inventario', desc: 'Ajustes con motivo, evidencia y aprobación', roles: ['JB', 'AUD', 'GER'] },
      { code: '4.7', slug: '4-7', name: 'Valorización', desc: 'Valor del inventario y efecto contable de ajustes y roturas', roles: ['GER', 'AUD', 'ADM'] },
    ],
  },
  {
    id: 5,
    name: 'Ventas y Pedidos (API)',
    shortName: 'Ventas (API)',
    implemented: false,
    screens: [
      { code: '5.1', slug: '5-1', name: 'Pedidos de salida', desc: 'Listado por bodega, canal (Showroom, Web, Constructoras), prioridad y SLA', roles: ['JB', 'ADM', 'TRA'] },
      { code: '5.2', slug: '5-2', name: 'Detalle de pedido', desc: 'Líneas en cajas/m², tono asignado, pallets y tracking', roles: ['JB', 'ADM', 'TRA'] },
      { code: '5.3', slug: '5-3', name: 'Backorders y faltantes', desc: 'Pedidos sin cobertura de mismo tono y decisión de parcial o split', roles: ['JB', 'COM'] },
      { code: '5.4', slug: '5-4', name: 'Cancelaciones y cambios', desc: 'Solicitudes del canal según etapa del pedido', roles: ['JB'] },
      { code: '5.5', slug: '5-5', name: 'Monitor de API de ventas', desc: 'Llamadas, errores, reintentos y conciliación ERP/E-commerce', roles: ['ADM'] },
      { code: '5.6', slug: '5-6', name: 'Sincronización saliente', desc: 'Estado de webhooks de stock y estados hacia los canales', roles: ['ADM'] },
      { code: '5.7', slug: '5-7', name: 'Kits y combos', desc: 'Packs piso + adhesivo + fragüe + niveladores y disponibilidad', roles: ['ADM', 'JB'] },
    ],
  },
  {
    id: 6,
    name: 'Compras y Reabastecimiento',
    shortName: 'Compras',
    implemented: false,
    screens: [
      { code: '6.1', slug: '6-1', name: 'Necesidad de compra', desc: 'Faltantes calculados por SKU y bodega', roles: ['COM', 'JB'] },
      { code: '6.2', slug: '6-2', name: 'Sugerencias de OC', desc: 'Borradores agrupados por fábrica/proveedor y su aprobación', roles: ['COM', 'GER'] },
      { code: '6.3', slug: '6-3', name: 'Órdenes de compra', desc: 'Gestión y envío de OC por pallets completos', roles: ['COM'] },
      { code: '6.4', slug: '6-4', name: 'OC en tránsito', desc: 'Seguimiento de embarques/camiones, fechas estimadas y retrasos', roles: ['COM', 'JB'] },
      { code: '6.5', slug: '6-5', name: 'Proveedores', desc: 'Maestro de fábricas de cerámica, adhesivos, lead time y desempeño', roles: ['COM', 'ADM'] },
    ],
  },
  {
    id: 7,
    name: 'Preparación y Despachos',
    shortName: 'Picking / Packing',
    implemented: false,
    screens: [
      { code: '7.1', slug: '7-1', name: 'Cola de preparación', desc: 'Asignación de pedidos a operarios de grúa/picking por prioridad', roles: ['JB'] },
      { code: '7.2', slug: '7-2', name: 'Olas de picking', desc: 'Creación y liberación de olas asegurando mismo Tono/Calibre', roles: ['JB'] },
      { code: '7.3', slug: '7-3', name: 'Picking móvil', desc: 'Recolección guiada por escaneo de LPN/Tono con modo offline', roles: ['PCK'], mobile: true },
      { code: '7.4', slug: '7-4', name: 'Packing', desc: 'Validación, zunchado en pallet, esquineros, pesaje y bultos', roles: ['PKG'] },
      { code: '7.5', slug: '7-5', name: 'Muelle de salida', desc: 'Consolidación por camión de reparto, escaneo de carga y manifiesto', roles: ['PKG', 'JB', 'TRA'] },
      { code: '7.6', slug: '7-6', name: 'Incidencias de picking', desc: 'Cajas rotas o faltantes de tono en ubicación y reasignación', roles: ['PCK', 'JB'] },
    ],
  },
  {
    id: 8,
    name: 'Transporte y Última Milla',
    shortName: 'Transporte (TMS)',
    implemented: false,
    screens: [
      { code: '8.1', slug: '8-1', name: 'Transportistas y servicios', desc: 'Flota externa, camiones pluma/rampa, restricciones de tonelaje y cortes', roles: ['TRA', 'ADM'] },
      { code: '8.2', slug: '8-2', name: 'Reglas de selección', desc: 'Criterios por peso total kg, comuna, SLA o descarga en obra', roles: ['TRA', 'ADM'] },
      { code: '8.3', slug: '8-3', name: 'Guías y etiquetas', desc: 'Generación, reimpresión y anulación de guías de despacho', roles: ['PKG', 'TRA'] },
      { code: '8.4', slug: '8-4', name: 'Manifiestos', desc: 'Cierre de despacho por camión/transportista', roles: ['TRA', 'JB'] },
      { code: '8.5', slug: '8-5', name: 'Tracking de envíos', desc: 'Estados normalizados de entrega en obra o domicilio', roles: ['TRA', 'JB', 'GER'] },
      { code: '8.6', slug: '8-6', name: 'Entregas fallidas y siniestros', desc: 'Obra cerrada, rotura en tránsito, reintentos y reclamos', roles: ['TRA'] },
      { code: '8.7', slug: '8-7', name: 'Costos de flete', desc: 'Costo real por pedido pesado y conciliación de fletes', roles: ['TRA', 'GER', 'AUD'] },
    ],
  },
  {
    id: 9,
    name: 'Devoluciones de Clientes',
    shortName: 'Devoluciones (RMA)',
    implemented: false,
    screens: [
      { code: '9.1', slug: '9-1', name: 'Solicitudes RMA', desc: 'Alta por cajas sobrantes o reclamo de tono/rotura', roles: ['JB', 'ADM'] },
      { code: '9.2', slug: '9-2', name: 'Recepción de devoluciones', desc: 'Ingreso por escaneo a zona de revisión de cajas', roles: ['REC'] },
      { code: '9.3', slug: '9-3', name: 'Inspección y decisión', desc: 'Reingreso al lote/tono original, liquidación o merma por rotura', roles: ['CAL', 'JB'] },
      { code: '9.4', slug: '9-4', name: 'Cierre financiero', desc: 'Notificación de nota de crédito o cambio de mercadería', roles: ['JB', 'GER'] },
    ],
  },
  {
    id: 10,
    name: 'Mermas, Rezagados y Calidad',
    shortName: 'Mermas y Calidad',
    implemented: false,
    screens: [
      { code: '10.1', slug: '10-1', name: 'Inventario rezagado (AIP)', desc: 'Saldos de colección o tonos descatalogados a 30/60/90+ días', roles: ['JB', 'COM', 'GER'] },
      { code: '10.2', slug: '10-2', name: 'Registro de mermas', desc: 'Cajas quebradas en grúa/recepción o sacos húmedos con fotos', roles: ['JB', 'REC', 'PCK'] },
      { code: '10.3', slug: '10-3', name: 'Aprobación de bajas', desc: 'Doble aprobación por umbral de valor', roles: ['JB', 'GER', 'AUD'] },
      { code: '10.4', slug: '10-4', name: 'Programación de conteos', desc: 'Calendario de inventario cíclico ABC por pasillo de racks', roles: ['AUD', 'JB'] },
      { code: '10.5', slug: '10-5', name: 'Conteo ciego', desc: 'Captura móvil de cajas/pallets sin ver cantidad teórica', roles: ['REC', 'PCK', 'AUD'], mobile: true },
      { code: '10.6', slug: '10-6', name: 'Diferencias y ajustes', desc: 'Recuentos y aprobación de ajustes de stock', roles: ['AUD', 'JB', 'GER'] },
      { code: '10.7', slug: '10-7', name: 'Vencimientos', desc: 'Alertas de vencimiento para adhesivos, morteros, siliconas y epóxicos', roles: ['CAL', 'JB'] },
    ],
  },
  {
    id: 11,
    name: 'Configuración General',
    shortName: 'Configuración',
    implemented: false,
    screens: [
      { code: '11.1', slug: '11-1', name: 'Usuarios y roles (RBAC)', desc: 'Perfiles y matriz de permisos por menú y bodega', roles: ['ADM'] },
      { code: '11.2', slug: '11-2', name: 'Seguridad y auditoría', desc: 'Sesiones, doble factor y bitácora de cambios', roles: ['ADM', 'AUD'] },
      { code: '11.3', slug: '11-3', name: 'Catálogo de SKUs', desc: 'Formatos, m² por caja, cajas por pallet, peso y control de tono/calibre', roles: ['ADM', 'JB'] },
      { code: '11.4', slug: '11-4', name: 'Unidades y conversiones', desc: 'Conversión automática m² ↔ Caja ↔ Pallet y Sacos ↔ Kg', roles: ['ADM'] },
      { code: '11.5', slug: '11-5', name: 'Medición, conteo y pesaje', desc: 'Modalidad de captura y tolerancias en romana/báscula', roles: ['ADM', 'JB'] },
      { code: '11.6', slug: '11-6', name: 'Integraciones y claves API', desc: 'Tokens, webhooks y conexión con ERP / E-commerce', roles: ['ADM'] },
      { code: '11.7', slug: '11-7', name: 'Monitor de integraciones', desc: 'Estado, errores y reproceso de mensajes', roles: ['ADM'] },
      { code: '11.8', slug: '11-8', name: 'Reglas de negocio', desc: 'FIFO por Tono, FEFO en químicos, rezago de saldos y backorder', roles: ['ADM', 'GER'] },
      { code: '11.9', slug: '11-9', name: 'Notificaciones', desc: 'Plantillas y destinatarios por evento', roles: ['ADM'] },
      { code: '11.10', slug: '11-10', name: 'Documentos fiscales', desc: 'Guías de despacho electrónicas y facturas', roles: ['ADM', 'GER'] },
    ],
  },
]

export const TOPOLOGY_SCENARIOS: Record<TopologyScenario, WmsTopologyConfig> = {
  CASE_1: {
    id: 'CASE_1',
    title: 'Caso 1 · 1 Almacén con 1 Bodega (Sin Casa Matriz)',
    subtitle:
      'Operación unipunto: Un único Almacén con su Bodega principal atada por defecto, sin Casa Matriz.',
    hasHeadquarters: false,
    headquartersName: null,
    almacenIds: ['ALM-QUI'],
    warehouseIds: ['BOD-CEN-01'],
  },
  CASE_2: {
    id: 'CASE_2',
    title: 'Caso 2 · 1 Almacén con 2 Bodegas (Sin Casa Matriz)',
    subtitle:
      'Un único Almacén físico que incluye su Bodega atada por defecto más 1 Bodega adicional contratada, sin Casa Matriz.',
    hasHeadquarters: false,
    headquartersName: null,
    almacenIds: ['ALM-QUI'],
    warehouseIds: ['BOD-CEN-01', 'BOD-MOR-04'],
  },
  CASE_3: {
    id: 'CASE_3',
    title: 'Caso 3 · Casa Matriz con 2 Almacenes y 2 Bodegas c/u',
    subtitle:
      'Una Casa Matriz que agrupa 2 Almacenes físicos, donde cada Almacén tiene su Bodega atada por defecto + 1 Bodega adicional.',
    hasHeadquarters: true,
    headquartersName: 'Casa Matriz Ceramix Constructora',
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
    name: 'Bodega Racks Cerámica y Porcelanato',
    type: 'Central',
    country: 'Chile',
    city: 'Santiago - Quilicura',
    address: 'Av. Cañaveral 920, Nave Principal A',
    timezone: 'America/Santiago (UTC-3)',
    schedule: 'Lun-Vie 07:30 - 18:30 · Sáb 08:00 - 13:00',
    cutoff: '16:30 hrs',
    status: 'Activa',
    manager: 'Roberto Méndez (JB)',
    totalBins: 960,
    occupiedBins: 806,
    volumePct: 84,
    otif: 96.8,
    cycleHours: 3.4,
    accuracyPct: 99.3,
    dockToStockHours: 2.2,
    linesPerHour: 58,
    shrinkageStockPct: 0.38,
    shrinkageSalesPct: 0.45,
    returnRatePct: 2.1,
    failedDeliveryPct: 1.2,
    turnoverDays: 28,
    ordersToday: { pendientes: 42, picking: 24, packing: 16, listos: 19, despachados: 138 },
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
    totalBins: 500,
    occupiedBins: 310,
    volumePct: 62,
    otif: 96.0,
    cycleHours: 2.9,
    accuracyPct: 99.4,
    dockToStockHours: 2.0,
    linesPerHour: 66,
    shrinkageStockPct: 0.29,
    shrinkageSalesPct: 0.35,
    returnRatePct: 1.2,
    failedDeliveryPct: 1.6,
    turnoverDays: 21,
    ordersToday: { pendientes: 16, picking: 11, packing: 7, listos: 12, despachados: 74 },
  },
  {
    id: 'BOD-OBR-02',
    almacenId: 'ALM-REN',
    almacenName: 'Almacén Sucursal Norte & Obra',
    isDefaultTied: true,
    name: 'Bodega Patio Constructor y Despacho Obra',
    type: 'Express',
    country: 'Chile',
    city: 'Santiago - Renca',
    address: 'Autopista Central Km 8.5, Patio de Carga 1',
    timezone: 'America/Santiago (UTC-3)',
    schedule: 'Lun-Sáb 07:00 - 19:00',
    cutoff: '17:30 hrs',
    status: 'Activa',
    manager: 'Carla Valdivia (JB)',
    totalBins: 420,
    occupiedBins: 302,
    volumePct: 72,
    otif: 98.2,
    cycleHours: 1.6,
    accuracyPct: 99.6,
    dockToStockHours: 1.5,
    linesPerHour: 71,
    shrinkageStockPct: 0.24,
    shrinkageSalesPct: 0.3,
    returnRatePct: 1.5,
    failedDeliveryPct: 0.8,
    turnoverDays: 16,
    ordersToday: { pendientes: 28, picking: 15, packing: 11, listos: 14, despachados: 94 },
  },
  {
    id: 'BOD-SHW-03',
    almacenId: 'ALM-REN',
    almacenName: 'Almacén Sucursal Norte & Obra',
    isDefaultTied: false,
    name: 'Bodega Showroom y Picking Express',
    type: 'Tienda',
    country: 'Chile',
    city: 'Santiago - Renca',
    address: 'Autopista Central Km 8.5, Sala de Ventas Norte',
    timezone: 'America/Santiago (UTC-3)',
    schedule: 'Lun-Sáb 09:00 - 19:30',
    cutoff: '18:00 hrs',
    status: 'Activa',
    manager: 'Diego Araneda (JB)',
    totalBins: 240,
    occupiedBins: 214,
    volumePct: 89,
    otif: 95.4,
    cycleHours: 1.1,
    accuracyPct: 98.9,
    dockToStockHours: 1.7,
    linesPerHour: 54,
    shrinkageStockPct: 0.52,
    shrinkageSalesPct: 0.6,
    returnRatePct: 3.1,
    failedDeliveryPct: 1.5,
    turnoverDays: 19,
    ordersToday: { pendientes: 19, picking: 9, packing: 6, listos: 8, despachados: 62 },
  },
]

export const WMS_STOCK_ITEMS: WmsStockItem[] = [
  {
    sku: 'POR-60120-CAL',
    name: 'Porcelanato Pulido Calacatta Blanco 60x120 cm Rectificado (Caja 1.44 m²)',
    category: 'Porcelanato · Tono/Calibre',
    controlType: 'Lote + Tono/Calibre (FIFO)',
    unitCost: 26,
    agingTag: 'Normal',
    daysWithoutMovement: 2,
    byWarehouse: {
      'BOD-CEN-01': { disponible: 540, reservado: 160, cuarentena: 36, bloqueado: 8, merma: 4, transito_interbodega: 40, transito_cliente: 85, devolucion: 6, oc_transito: 240, demanda_comprometida: 90, stock_seguridad: 200, demanda_leadtime: 320, backorder: 0 },
      'BOD-OBR-02': { disponible: 210, reservado: 95, cuarentena: 0, bloqueado: 2, merma: 1, transito_interbodega: 0, transito_cliente: 42, devolucion: 2, oc_transito: 80, demanda_comprometida: 30, stock_seguridad: 100, demanda_leadtime: 140, backorder: 0 },
      'BOD-SHW-03': { disponible: 28, reservado: 44, cuarentena: 0, bloqueado: 0, merma: 2, transito_interbodega: 36, transito_cliente: 18, devolucion: 4, oc_transito: 0, demanda_comprometida: 0, stock_seguridad: 60, demanda_leadtime: 80, backorder: 24 },
      'BOD-MOR-04': { disponible: 0, reservado: 0, cuarentena: 0, bloqueado: 0, merma: 0, transito_interbodega: 0, transito_cliente: 0, devolucion: 0, oc_transito: 0, demanda_comprometida: 0, stock_seguridad: 0, demanda_leadtime: 0, backorder: 0 },
    },
  },
  {
    sku: 'CER-4545-TER',
    name: 'Cerámica Piso Rústica Terracota Antideslizante 45x45 cm (Caja 2.02 m²)',
    category: 'Cerámica de Piso',
    controlType: 'Lote + Tono/Calibre (FIFO)',
    unitCost: 14,
    agingTag: 'Normal',
    daysWithoutMovement: 1,
    byWarehouse: {
      'BOD-CEN-01': { disponible: 820, reservado: 240, cuarentena: 48, bloqueado: 12, merma: 9, transito_interbodega: 60, transito_cliente: 120, devolucion: 10, oc_transito: 300, demanda_comprometida: 110, stock_seguridad: 350, demanda_leadtime: 520, backorder: 0 },
      'BOD-OBR-02': { disponible: 310, reservado: 110, cuarentena: 0, bloqueado: 0, merma: 3, transito_interbodega: 0, transito_cliente: 64, devolucion: 4, oc_transito: 120, demanda_comprometida: 40, stock_seguridad: 150, demanda_leadtime: 220, backorder: 0 },
      'BOD-SHW-03': { disponible: 65, reservado: 28, cuarentena: 0, bloqueado: 0, merma: 1, transito_interbodega: 0, transito_cliente: 15, devolucion: 2, oc_transito: 0, demanda_comprometida: 0, stock_seguridad: 50, demanda_leadtime: 60, backorder: 0 },
      'BOD-MOR-04': { disponible: 0, reservado: 0, cuarentena: 0, bloqueado: 0, merma: 0, transito_interbodega: 0, transito_cliente: 0, devolucion: 0, oc_transito: 0, demanda_comprometida: 0, stock_seguridad: 0, demanda_leadtime: 0, backorder: 0 },
    },
  },
  {
    sku: 'ADH-FLEX-25K',
    name: 'Adhesivo Polimérico Doble Acción Porcelanato Saco 25 kg',
    category: 'Adhesivos y Morteros (FEFO)',
    controlType: 'Lote + Vencimiento (FEFO)',
    unitCost: 9,
    agingTag: 'Normal',
    daysWithoutMovement: 1,
    byWarehouse: {
      'BOD-CEN-01': { disponible: 380, reservado: 140, cuarentena: 0, bloqueado: 0, merma: 6, transito_interbodega: 0, transito_cliente: 90, devolucion: 0, oc_transito: 200, demanda_comprometida: 80, stock_seguridad: 300, demanda_leadtime: 420, backorder: 35 },
      'BOD-OBR-02': { disponible: 190, reservado: 85, cuarentena: 0, bloqueado: 0, merma: 2, transito_interbodega: 50, transito_cliente: 60, devolucion: 0, oc_transito: 100, demanda_comprometida: 40, stock_seguridad: 180, demanda_leadtime: 210, backorder: 15 },
      'BOD-SHW-03': { disponible: 45, reservado: 18, cuarentena: 0, bloqueado: 0, merma: 0, transito_interbodega: 0, transito_cliente: 12, devolucion: 0, oc_transito: 0, demanda_comprometida: 0, stock_seguridad: 40, demanda_leadtime: 45, backorder: 0 },
      'BOD-MOR-04': { disponible: 940, reservado: 210, cuarentena: 60, bloqueado: 25, merma: 8, transito_interbodega: 50, transito_cliente: 110, devolucion: 0, oc_transito: 400, demanda_comprometida: 120, stock_seguridad: 500, demanda_leadtime: 650, backorder: 0 },
    },
  },
  {
    sku: 'POR-20120-ROB',
    name: 'Porcelanato Look Madera Roble Nórdico 20x120 cm (Caja 1.20 m²)',
    category: 'Porcelanato Maderado',
    controlType: 'Lote + Tono/Calibre (FIFO)',
    unitCost: 29,
    agingTag: 'Normal',
    daysWithoutMovement: 3,
    byWarehouse: {
      'BOD-CEN-01': { disponible: 95, reservado: 120, cuarentena: 24, bloqueado: 4, merma: 3, transito_interbodega: 0, transito_cliente: 52, devolucion: 5, oc_transito: 120, demanda_comprometida: 70, stock_seguridad: 160, demanda_leadtime: 210, backorder: 40 },
      'BOD-OBR-02': { disponible: 48, reservado: 36, cuarentena: 0, bloqueado: 0, merma: 1, transito_interbodega: 24, transito_cliente: 22, devolucion: 1, oc_transito: 40, demanda_comprometida: 20, stock_seguridad: 70, demanda_leadtime: 90, backorder: 12 },
      'BOD-SHW-03': { disponible: 42, reservado: 19, cuarentena: 0, bloqueado: 0, merma: 0, transito_interbodega: 0, transito_cliente: 10, devolucion: 2, oc_transito: 0, demanda_comprometida: 0, stock_seguridad: 35, demanda_leadtime: 40, backorder: 0 },
      'BOD-MOR-04': { disponible: 0, reservado: 0, cuarentena: 0, bloqueado: 0, merma: 0, transito_interbodega: 0, transito_cliente: 0, devolucion: 0, oc_transito: 0, demanda_comprometida: 0, stock_seguridad: 0, demanda_leadtime: 0, backorder: 0 },
    },
  },
  {
    sku: 'FRG-EPOX-05K',
    name: 'Fragüe Epóxico Impermeable Antimanchas Marfil Balde 5 kg',
    category: 'Fragües y Selladores (FEFO)',
    controlType: 'Lote + Vencimiento (FEFO)',
    unitCost: 32,
    agingTag: 'Rezagado 30d',
    daysWithoutMovement: 35,
    byWarehouse: {
      'BOD-CEN-01': { disponible: 110, reservado: 18, cuarentena: 0, bloqueado: 6, merma: 1, transito_interbodega: 0, transito_cliente: 14, devolucion: 2, oc_transito: 0, demanda_comprometida: 0, stock_seguridad: 50, demanda_leadtime: 45, backorder: 0 },
      'BOD-OBR-02': { disponible: 42, reservado: 9, cuarentena: 0, bloqueado: 0, merma: 0, transito_interbodega: 0, transito_cliente: 6, devolucion: 0, oc_transito: 0, demanda_comprometida: 0, stock_seguridad: 25, demanda_leadtime: 20, backorder: 0 },
      'BOD-SHW-03': { disponible: 28, reservado: 5, cuarentena: 0, bloqueado: 0, merma: 0, transito_interbodega: 0, transito_cliente: 4, devolucion: 1, oc_transito: 0, demanda_comprometida: 0, stock_seguridad: 15, demanda_leadtime: 12, backorder: 0 },
      'BOD-MOR-04': { disponible: 240, reservado: 22, cuarentena: 15, bloqueado: 14, merma: 2, transito_interbodega: 0, transito_cliente: 18, devolucion: 0, oc_transito: 50, demanda_comprometida: 10, stock_seguridad: 80, demanda_leadtime: 70, backorder: 0 },
    },
  },
  {
    sku: 'REV-3090-3D',
    name: 'Revestimiento Muro Pasta Blanca Ondas 3D 30x90 cm (Saldo Tono T18)',
    category: 'Revestimiento Muro',
    controlType: 'Lote + Tono/Calibre (FIFO)',
    unitCost: 22,
    agingTag: 'Rezagado 60d',
    daysWithoutMovement: 67,
    byWarehouse: {
      'BOD-CEN-01': { disponible: 145, reservado: 6, cuarentena: 0, bloqueado: 0, merma: 3, transito_interbodega: 0, transito_cliente: 4, devolucion: 2, oc_transito: 0, demanda_comprometida: 0, stock_seguridad: 30, demanda_leadtime: 20, backorder: 0 },
      'BOD-OBR-02': { disponible: 38, reservado: 0, cuarentena: 0, bloqueado: 0, merma: 1, transito_interbodega: 0, transito_cliente: 0, devolucion: 0, oc_transito: 0, demanda_comprometida: 0, stock_seguridad: 10, demanda_leadtime: 8, backorder: 0 },
      'BOD-SHW-03': { disponible: 22, reservado: 2, cuarentena: 0, bloqueado: 0, merma: 0, transito_interbodega: 0, transito_cliente: 0, devolucion: 0, oc_transito: 0, demanda_comprometida: 0, stock_seguridad: 10, demanda_leadtime: 6, backorder: 0 },
      'BOD-MOR-04': { disponible: 0, reservado: 0, cuarentena: 0, bloqueado: 0, merma: 0, transito_interbodega: 0, transito_cliente: 0, devolucion: 0, oc_transito: 0, demanda_comprometida: 0, stock_seguridad: 0, demanda_leadtime: 0, backorder: 0 },
    },
  },
  {
    sku: 'PER-ALU-240',
    name: 'Perfil Guardacanto Aluminio Anodizado Negro Mate 10 mm x 2.40 m',
    category: 'Perfiles y Terminaciones',
    controlType: 'Lote / FIFO',
    unitCost: 11,
    agingTag: 'Rezagado 90+d',
    daysWithoutMovement: 98,
    byWarehouse: {
      'BOD-CEN-01': { disponible: 210, reservado: 8, cuarentena: 0, bloqueado: 5, merma: 2, transito_interbodega: 0, transito_cliente: 5, devolucion: 3, oc_transito: 0, demanda_comprometida: 0, stock_seguridad: 40, demanda_leadtime: 25, backorder: 0 },
      'BOD-OBR-02': { disponible: 75, reservado: 4, cuarentena: 0, bloqueado: 0, merma: 0, transito_interbodega: 0, transito_cliente: 2, devolucion: 0, oc_transito: 0, demanda_comprometida: 0, stock_seguridad: 20, demanda_leadtime: 15, backorder: 0 },
      'BOD-SHW-03': { disponible: 54, reservado: 3, cuarentena: 0, bloqueado: 0, merma: 0, transito_interbodega: 0, transito_cliente: 1, devolucion: 1, oc_transito: 0, demanda_comprometida: 0, stock_seguridad: 15, demanda_leadtime: 10, backorder: 0 },
      'BOD-MOR-04': { disponible: 0, reservado: 0, cuarentena: 0, bloqueado: 0, merma: 0, transito_interbodega: 0, transito_cliente: 0, devolucion: 0, oc_transito: 0, demanda_comprometida: 0, stock_seguridad: 0, demanda_leadtime: 0, backorder: 0 },
    },
  },
]

export const WMS_OPERATOR_PRODUCTIVITY = [
  { id: 'OP-101', name: 'Matías Rojas', role: 'PCK', warehouse: 'BOD-OBR-02', linesPerHour: 74, accuracy: 99.8 },
  { id: 'OP-104', name: 'Valentina Muñoz', role: 'PCK', warehouse: 'BOD-CEN-01', linesPerHour: 68, accuracy: 99.6 },
  { id: 'OP-109', name: 'Sebastián Lagos', role: 'REC', warehouse: 'BOD-CEN-01', linesPerHour: 63, accuracy: 99.5 },
  { id: 'OP-112', name: 'Camila Herrera', role: 'PKG', warehouse: 'BOD-MOR-04', linesPerHour: 61, accuracy: 99.7 },
  { id: 'OP-118', name: 'Jorge Pizarro', role: 'PCK', warehouse: 'BOD-SHW-03', linesPerHour: 52, accuracy: 98.9 },
]

export const INITIAL_ALERTS: WmsAlert[] = [
  {
    id: 'ALT-2026-089',
    timestamp: 'Hace 5 min',
    warehouse: 'BOD-SHW-03',
    category: 'Quiebre de Tono/Calibre',
    severity: 'Crítica',
    title: 'Stock insuficiente del Tono T42 · Calibre C2 en Porcelanato Calacatta 60x120',
    detail: 'Quedan 28 cajas en Showroom Las Condes frente a pedido de obra por 52 cajas del mismo tono. CD Quilicura dispone de 540 cajas en Tono T42.',
    owner: 'Diego Araneda (JB)',
    ownerRole: 'JB',
    status: 'Abierta',
    targetScreenSlug: '2-5',
    targetScreenLabel: 'Solicitar Traspaso (2.5)',
  },
  {
    id: 'ALT-2026-088',
    timestamp: 'Hace 14 min',
    warehouse: 'BOD-CEN-01',
    category: 'Inconsistencia / Rotura',
    severity: 'Crítica',
    title: 'Diferencia de 4 cajas en Rack P-02-01-B03 (Porcelanato Roble 20x120)',
    detail: 'Operario de picking detectó 3 cajas con palmetas quebradas por golpe de horquilla y 1 caja faltante. Ubicación en conteo ciego.',
    owner: 'Roberto Méndez (JB)',
    ownerRole: 'JB',
    status: 'En gestión',
    targetScreenSlug: '2-3',
    targetScreenLabel: 'Ver Ubicación (2.3)',
  },
  {
    id: 'ALT-2026-085',
    timestamp: 'Hace 28 min',
    warehouse: 'BOD-MOR-04',
    category: 'Vencimientos (FEFO)',
    severity: 'Alta',
    title: 'Lote LT-8820 de Fragüe Epóxico Marfil 5 kg próximo a vencer (21 días)',
    detail: '15 baldes en Nave Seca Lampa bajo el umbral de 30 días de vida útil antes de endurecimiento.',
    owner: 'Carla Ríos (COM)',
    ownerRole: 'COM',
    status: 'Abierta',
    targetScreenSlug: '2-1',
    targetScreenLabel: 'Ver Consolidado (2.1)',
  },
  {
    id: 'ALT-2026-082',
    timestamp: 'Hace 42 min',
    warehouse: 'BOD-CEN-01',
    category: 'SLA / Despacho Obra',
    severity: 'Alta',
    title: '6 pedidos de Constructora (8.4 toneladas) en riesgo de corte horario 16:30',
    detail: 'Pendiente zunchado y film plástico de 7 pallets de Cerámica 45x45 en Andén 2 para camión pluma.',
    owner: 'Luis Bravo (TRA)',
    ownerRole: 'TRA',
    status: 'En gestión',
    targetScreenSlug: '1-1',
    targetScreenLabel: 'Ver Flujo (1.1)',
  },
  {
    id: 'ALT-2026-079',
    timestamp: 'Hace 1 hora',
    warehouse: 'BOD-CEN-01',
    category: 'Brecha de Abastecimiento',
    severity: 'Media',
    title: 'Brecha de compra de 130 cajas en Porcelanato Look Madera Roble 20x120',
    detail: 'Alta rotación en proyectos residenciales supera stock disponible + OC en tránsito.',
    owner: 'Carla Ríos (COM)',
    ownerRole: 'COM',
    status: 'Abierta',
    targetScreenSlug: '2-1',
    targetScreenLabel: 'Ver Brecha (2.1)',
  },
]

export const INITIAL_LOCATIONS: WmsLocation[] = [
  { code: 'REC-M01-01-B01', warehouse: 'BOD-CEN-01', zone: 'Recepción', aisle: 'M01', rack: '01', level: '01', bin: 'B01', storageType: 'Techado', restriction: 'Alto Tonelaje', maxWeightKg: 3000, maxVolM3: 4.5, maxUnits: 140, currentUnits: 96, skuAssigned: 'Descarga Contenedor Porcelanato', status: 'Activa' },
  { code: 'QRT-C01-01-B02', warehouse: 'BOD-CEN-01', zone: 'Cuarentena', aisle: 'C01', rack: '01', level: '01', bin: 'B02', storageType: 'Techado', restriction: 'Frágil · Tono/Calibre', maxWeightKg: 2000, maxVolM3: 3.0, maxUnits: 100, currentUnits: 60, skuAssigned: 'POR-60120-CAL (Verificación Tono)', status: 'Activa' },
  { code: 'P-01-02-B01', warehouse: 'BOD-CEN-01', zone: 'Almacenamiento (Reserva)', aisle: 'P', rack: '01', level: '02', bin: 'B01', storageType: 'Rack Pesado', restriction: 'Frágil (Pallet)', maxWeightKg: 2400, maxVolM3: 2.8, maxUnits: 120, currentUnits: 108, skuAssigned: 'POR-60120-CAL · Tono T42 Cal C2', status: 'Activa' },
  { code: 'P-01-01-B01', warehouse: 'BOD-CEN-01', zone: 'Picking', aisle: 'P', rack: '01', level: '01', bin: 'B01', storageType: 'Nivel Piso', restriction: 'Frágil (>30kg/caja)', maxWeightKg: 1800, maxVolM3: 2.2, maxUnits: 72, currentUnits: 58, skuAssigned: 'POR-60120-CAL · Tono T42 Cal C2', status: 'Activa' },
  { code: 'P-02-01-B03', warehouse: 'BOD-CEN-01', zone: 'Picking', aisle: 'P', rack: '02', level: '01', bin: 'B03', storageType: 'Nivel Piso', restriction: 'Frágil', maxWeightKg: 1500, maxVolM3: 2.0, maxUnits: 80, currentUnits: 14, skuAssigned: 'POR-20120-ROB · Tono T11 Cal C1', status: 'En conteo' },
  { code: 'C-03-01-B02', warehouse: 'BOD-CEN-01', zone: 'Picking', aisle: 'C', rack: '03', level: '01', bin: 'B02', storageType: 'Nivel Piso', restriction: 'Estándar', maxWeightKg: 1600, maxVolM3: 2.0, maxUnits: 96, currentUnits: 82, skuAssigned: 'CER-4545-TER · Tono T08', status: 'Activa' },
  { code: 'S-01-01-B04', warehouse: 'BOD-MOR-04', zone: 'Almacenamiento (Reserva)', aisle: 'S', rack: '01', level: '01', bin: 'B04', storageType: 'Ambiente Seco', restriction: 'Sensible Humedad', maxWeightKg: 2500, maxVolM3: 3.2, maxUnits: 100, currentUnits: 88, skuAssigned: 'ADH-FLEX-25K (2 Pallets x 50 sacos)', status: 'Activa' },
  { code: 'PK-ZUN-01', warehouse: 'BOD-CEN-01', zone: 'Packing', aisle: 'PK', rack: '00', level: '01', bin: 'Z01', storageType: 'Techado', restriction: 'Zunchado y Film', maxWeightKg: 2500, maxVolM3: 4.0, maxUnits: 120, currentUnits: 48, skuAssigned: 'Estación Zunchado y Esquineros #1', status: 'Activa' },
  { code: 'MUL-OBR-02', warehouse: 'BOD-CEN-01', zone: 'Muelle', aisle: 'MUL', rack: '00', level: '01', bin: 'A02', storageType: 'Andén Carga', restriction: 'Camión Pluma / Rampa', maxWeightKg: 12000, maxVolM3: 24.0, maxUnits: 600, currentUnits: 340, skuAssigned: 'Andén 2 - Despachos a Obra', status: 'Activa' },
  { code: 'MRM-ROT-01', warehouse: 'BOD-CEN-01', zone: 'Mermas', aisle: 'MRM', rack: '01', level: '01', bin: 'R01', storageType: 'Patio', restriction: 'Bloqueado (Roturas)', maxWeightKg: 1500, maxVolM3: 2.5, maxUnits: 80, currentUnits: 19, skuAssigned: 'Cajas Despuntadas / Palmetas Quebradas', status: 'Bloqueada' },
  { code: 'DEV-RMA-01', warehouse: 'BOD-CEN-01', zone: 'Devoluciones', aisle: 'DEV', rack: '01', level: '01', bin: 'D01', storageType: 'Techado', restriction: 'Revisión Tono', maxWeightKg: 1500, maxVolM3: 2.2, maxUnits: 80, currentUnits: 21, skuAssigned: 'Cajas Sobrantes de Obra (Verificación)', status: 'Activa' },
]

export const WMS_PUTAWAY_RULES = [
  {
    id: 'PUT-01',
    priority: 1,
    name: 'Porcelanato Gran Formato (>30 kg/caja · Frágil)',
    conditionCategory: 'Porcelanato · Tono/Calibre',
    conditionStorage: 'Nivel Piso / Rack Reforzado',
    aisleRange: 'Pasillo P-01 a P-04 (Niveles 01-02)',
  },
  {
    id: 'PUT-02',
    priority: 2,
    name: 'Segregación Estricta por Tono y Calibre',
    conditionCategory: 'Cerámica y Porcelanato',
    conditionStorage: 'Un solo Tono/Calibre por Bin',
    aisleRange: 'Pasillos P y C (Validación LPN/Tono)',
  },
  {
    id: 'PUT-03',
    priority: 3,
    name: 'Adhesivos, Morteros y Fragües (FEFO Seco)',
    conditionCategory: 'Adhesivos y Morteros (FEFO)',
    conditionStorage: 'Ambiente Seco (Sin Humedad)',
    aisleRange: 'Pasillo S-01 a S-04 (Tarima aislada)',
  },
  {
    id: 'PUT-04',
    priority: 4,
    name: 'Saldos de Tono / Punta de Lote (<12 cajas)',
    conditionCategory: 'Revestimiento / Saldos',
    conditionStorage: 'Rack Altura Liquidación',
    aisleRange: 'Pasillo R-01 a R-03 (Niveles 03-04)',
  },
]

export const INITIAL_REPLENISHMENT_RULES: WmsReplenishmentRule[] = [
  {
    id: 'REP-101',
    warehouse: 'BOD-CEN-01',
    sku: 'POR-60120-CAL',
    skuName: 'Porcelanato Pulido Calacatta 60x120 cm (Tono T42)',
    pickingBin: 'P-01-01-B01',
    reserveZone: 'P-01-02-B01 (Reserva Pallet)',
    currentPickQty: 16,
    minQty: 24,
    maxQty: 72,
    unitMeasure: 'Cajas (1.44 m²)',
    status: 'Bajo Mínimo',
  },
  {
    id: 'REP-102',
    warehouse: 'BOD-CEN-01',
    sku: 'POR-20120-ROB',
    skuName: 'Porcelanato Look Madera Roble 20x120 cm (Tono T11)',
    pickingBin: 'P-02-01-B03',
    reserveZone: 'P-02-03-B01 (Reserva Pallet)',
    currentPickQty: 14,
    minQty: 25,
    maxQty: 80,
    unitMeasure: 'Cajas (1.20 m²)',
    status: 'Bajo Mínimo',
  },
  {
    id: 'REP-103',
    warehouse: 'BOD-CEN-01',
    sku: 'CER-4545-TER',
    skuName: 'Cerámica Piso Terracota 45x45 cm (Tono T08)',
    pickingBin: 'C-03-01-B02',
    reserveZone: 'C-03-03-B02 (Reserva Pallet)',
    currentPickQty: 82,
    minQty: 30,
    maxQty: 96,
    unitMeasure: 'Cajas (2.02 m²)',
    status: 'Óptimo',
  },
  {
    id: 'REP-104',
    warehouse: 'BOD-MOR-04',
    sku: 'ADH-FLEX-25K',
    skuName: 'Adhesivo Polimérico Doble Acción Saco 25 kg',
    pickingBin: 'S-01-01-B01',
    reserveZone: 'S-01-01-B04 (Reserva Pallets)',
    currentPickQty: 88,
    minQty: 40,
    maxQty: 100,
    unitMeasure: 'Sacos 25 kg',
    status: 'Óptimo',
  },
]

export const INITIAL_TRANSFERS: WmsTransfer[] = [
  {
    id: 'TRB-2026-0412',
    createdAt: '2026-10-19 08:20',
    originWarehouse: 'BOD-CEN-01',
    destWarehouse: 'BOD-SHW-03',
    sku: 'POR-60120-CAL',
    skuName: 'Porcelanato Calacatta 60x120 cm (Cajas · Tono T42 Cal C2)',
    qtyRequested: 36,
    qtySent: 36,
    qtyReceived: null,
    status: 'En tránsito',
    carrier: 'Camión Plataforma Propio #02 (Con Rampa)',
    guideNumber: 'GDT-CL-889120',
    requestedBy: 'Diego Araneda (JB)',
    approvedBy: 'Roberto Méndez (JB)',
    notes: 'Pallet completo mismo Tono T42 para cubrir pedido en Showroom Las Condes',
  },
  {
    id: 'TRB-2026-0413',
    createdAt: '2026-10-19 10:35',
    originWarehouse: 'BOD-MOR-04',
    destWarehouse: 'BOD-OBR-02',
    sku: 'ADH-FLEX-25K',
    skuName: 'Adhesivo Polimérico Doble Acción Porcelanato Saco 25 kg',
    qtyRequested: 50,
    qtySent: 50,
    qtyReceived: null,
    status: 'En tránsito',
    carrier: 'Transporte Carga Pesada Sur',
    guideNumber: 'GDT-CL-889145',
    requestedBy: 'Carla Valdivia (JB)',
    approvedBy: 'Patricia Soto (JB)',
    notes: '1 Pallet (50 sacos) para retiro express de instaladores',
  },
  {
    id: 'TRB-2026-0414',
    createdAt: '2026-10-19 12:15',
    originWarehouse: 'BOD-CEN-01',
    destWarehouse: 'BOD-OBR-02',
    sku: 'POR-20120-ROB',
    skuName: 'Porcelanato Look Madera Roble 20x120 cm (Cajas · Tono T11)',
    qtyRequested: 24,
    qtySent: 0,
    qtyReceived: null,
    status: 'Solicitado',
    carrier: 'Camión Plataforma Propio #01',
    guideNumber: 'Pendiente emisión',
    requestedBy: 'Carla Valdivia (JB)',
    approvedBy: 'Pendiente aprobación',
    notes: 'Complemento del mismo Tono T11 para despacho a obra en Renca',
  },
  {
    id: 'TRB-2026-0408',
    createdAt: '2026-10-17 09:10',
    originWarehouse: 'BOD-CEN-01',
    destWarehouse: 'BOD-OBR-02',
    sku: 'CER-4545-TER',
    skuName: 'Cerámica Piso Rústica Terracota 45x45 cm (Cajas · Tono T08)',
    qtyRequested: 48,
    qtySent: 48,
    qtyReceived: 46,
    status: 'Cerrado con diferencias',
    carrier: 'Transporte Carga Pesada Sur',
    guideNumber: 'GDT-CL-887410',
    requestedBy: 'Carla Valdivia (JB)',
    approvedBy: 'Roberto Méndez (JB)',
    notes: '2 cajas llegaron con palmetas quebradas en esquina; se generó Caso de Ajuste #AJ-904',
  },
]

export function computeSkuMetrics(
  item: WmsStockItem,
  warehouseFilter: string | string[]
) {
  const whKeys = Array.isArray(warehouseFilter)
    ? warehouseFilter
    : warehouseFilter === 'ALL'
      ? Object.keys(item.byWarehouse)
      : [warehouseFilter]
  const acc = {
    disponible: 0,
    reservado: 0,
    cuarentena: 0,
    bloqueado: 0,
    merma: 0,
    transito_interbodega: 0,
    transito_cliente: 0,
    devolucion: 0,
    oc_transito: 0,
    demanda_comprometida: 0,
    stock_seguridad: 0,
    demanda_leadtime: 0,
    backorder: 0,
  }

  whKeys.forEach((k) => {
    const w = item.byWarehouse[k]
    if (!w) return
    ;(Object.keys(acc) as (keyof typeof acc)[]).forEach((field) => {
      acc[field] += w[field] || 0
    })
  })

  const stockFisicoTotal =
    acc.disponible +
    acc.reservado +
    acc.cuarentena +
    acc.bloqueado +
    acc.merma +
    acc.transito_interbodega
  const disponibleOnHand = acc.disponible
  const atp = disponibleOnHand + acc.oc_transito - acc.demanda_comprometida
  const rawNeed =
    acc.stock_seguridad +
    acc.demanda_leadtime +
    acc.backorder -
    (disponibleOnHand + acc.oc_transito)
  const necesidadCompra = Math.max(0, rawNeed)
  const valorTotalUSD = stockFisicoTotal * item.unitCost

  return {
    ...acc,
    stockFisicoTotal,
    disponibleOnHand,
    atp,
    necesidadCompra,
    valorTotalUSD,
  }
}

export function findScreenBySlug(slug: string) {
  const normalized = slug.replace('.', '-')
  for (const mod of WMS_MODULES) {
    for (const scr of mod.screens) {
      if (scr.slug === normalized || scr.code === slug) {
        return { mod, scr }
      }
    }
  }
  return { mod: WMS_MODULES[0], scr: WMS_MODULES[0].screens[0] }
}
