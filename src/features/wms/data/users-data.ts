import type { RoleCode } from '@/features/wms/domain/inventory'

export interface WmsUser {
  id: string
  name: string
  email: string
  role: RoleCode
  /** Bodegas a las que tiene acceso. 'ALL' = todas las de la estructura activa. */
  scope: string[] | 'ALL'
  /** Clave de acceso de la demo. En producción vendría de un servicio de identidad. */
  pin: string
  active: boolean
}

export const DEMO_PIN = '1234'

export const INITIAL_USERS: WmsUser[] = [
  {
    id: 'USR-01',
    name: 'Marcela Ortiz',
    email: 'marcela.ortiz@decor.demo',
    role: 'ADM',
    scope: 'ALL',
    pin: DEMO_PIN,
    active: true,
  },
  {
    id: 'USR-02',
    name: 'Roberto Castaño',
    email: 'roberto.castano@decor.demo',
    role: 'JB',
    scope: ['BOD-CEN-01', 'BOD-MOR-04'],
    pin: DEMO_PIN,
    active: true,
  },
  {
    id: 'USR-03',
    name: 'Carla Vélez',
    email: 'carla.velez@decor.demo',
    role: 'JB',
    scope: ['BOD-OBR-02', 'BOD-SHW-03'],
    pin: DEMO_PIN,
    active: true,
  },
  {
    id: 'USR-04',
    name: 'Camilo Rojas',
    email: 'camilo.rojas@decor.demo',
    role: 'OPE',
    scope: ['BOD-CEN-01', 'BOD-MOR-04'],
    pin: DEMO_PIN,
    active: true,
  },
  {
    id: 'USR-05',
    name: 'Luis Prada',
    email: 'luis.prada@decor.demo',
    role: 'OPE',
    scope: ['BOD-OBR-02', 'BOD-SHW-03'],
    pin: DEMO_PIN,
    active: true,
  },
  {
    id: 'USR-06',
    name: 'Laura Gómez',
    email: 'laura.gomez@decor.demo',
    role: 'ASE',
    scope: 'ALL',
    pin: DEMO_PIN,
    active: true,
  },
  {
    id: 'USR-07',
    name: 'Diego Ruiz',
    email: 'diego.ruiz@decor.demo',
    role: 'ASE',
    scope: 'ALL',
    pin: DEMO_PIN,
    active: true,
  },
  {
    id: 'USR-08',
    name: 'Natalia Cano',
    email: 'natalia.cano@decor.demo',
    role: 'CAJ',
    scope: 'ALL',
    pin: DEMO_PIN,
    active: true,
  },
  {
    id: 'USR-09',
    name: 'Sofía Londoño',
    email: 'sofia.londono@decor.demo',
    role: 'GER',
    scope: 'ALL',
    pin: DEMO_PIN,
    active: true,
  },
]

/** Configuración de facturación: prefijos, cajas y medios de pago habilitados. */
export interface InvoicePrefix {
  prefix: string
  description: string
  /** Próximo consecutivo sugerido al facturar desde caja. */
  nextNumber: number
  active: boolean
}

export interface PointOfSale {
  id: string
  name: string
  warehouse: string
  prefix: string
  active: boolean
}

export const INITIAL_INVOICE_PREFIXES: InvoicePrefix[] = [
  {
    prefix: 'FV',
    description: 'Factura electrónica de venta',
    nextNumber: 10459,
    active: true,
  },
  {
    prefix: 'FM',
    description: 'Factura móvil (asesores en campo)',
    nextNumber: 2001,
    active: true,
  },
]

export const INITIAL_POINTS_OF_SALE: PointOfSale[] = [
  {
    id: 'PV-01',
    name: 'Caja Principal',
    warehouse: 'BOD-CEN-01',
    prefix: 'FV',
    active: true,
  },
  {
    id: 'PV-02',
    name: 'Caja Sala de Ventas',
    warehouse: 'BOD-SHW-03',
    prefix: 'FV',
    active: true,
  },
  {
    id: 'PV-03',
    name: 'Asesores móvil',
    warehouse: 'BOD-CEN-01',
    prefix: 'FM',
    active: true,
  },
]
