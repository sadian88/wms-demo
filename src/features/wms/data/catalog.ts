import type { RoleCode } from '@/features/wms/domain/inventory'

export type { RoleCode }

interface WmsRole {
  code: RoleCode
  name: string
  description: string
  readOnly: boolean
}

export interface WmsScreen {
  code: string
  slug: string
  name: string
  desc: string
  roles: RoleCode[]
  actRoles: RoleCode[]
  implemented: boolean
}

interface WmsModule {
  id: number
  name: string
  shortName: string
  implemented: boolean
  screens: WmsScreen[]
}

export const WMS_ROLES: Record<RoleCode, WmsRole> = {
  ADM: {
    code: 'ADM',
    name: 'Administrador',
    description:
      'Acceso total, configuración de bodegas, usuarios y catálogo, y aprobaciones sin límite',
    readOnly: false,
  },
  JB: {
    code: 'JB',
    name: 'Jefe de Bodega',
    description:
      'Supervisa inventario, entregas, reclamos y conteos; aprueba traspasos, bajas y ajustes hasta $ 1.200.000',
    readOnly: false,
  },
  OPE: {
    code: 'OPE',
    name: 'Operario de Bodega',
    description:
      'Recibe mercadería, entrega pedidos facturados, despacha traspasos, reporta daños y hace conteos ciegos',
    readOnly: false,
  },
  ASE: {
    code: 'ASE',
    name: 'Asesor comercial',
    description:
      'Consulta existencias y precios, crea pedidos con reserva de stock y sigue el estado de sus entregas',
    readOnly: false,
  },
  CAJ: {
    code: 'CAJ',
    name: 'Cajero / Facturación',
    description:
      'Factura los pedidos en caja, registra el medio de pago y anula facturas; consulta la conciliación',
    readOnly: false,
  },
  GER: {
    code: 'GER',
    name: 'Gerencia',
    description:
      'Visión consolidada de existencias, entregas y conciliación; aprueba bajas y ajustes sobre $ 1.200.000',
    readOnly: true,
  },
}

export const WMS_MODULES: WmsModule[] = [
  {
    id: 1,
    name: 'Panel',
    shortName: 'Panel',
    implemented: true,
    screens: [
      {
        code: '1.1',
        slug: '1-1',
        name: 'Resumen del día',
        desc: 'Qué hay en existencia, qué falta entregar y qué requiere acción hoy',
        roles: ['ADM', 'JB', 'OPE', 'ASE', 'CAJ', 'GER'],
        actRoles: ['ADM', 'JB'],
        implemented: true,
      },
    ],
  },
  {
    id: 2,
    name: 'Inventario',
    shortName: 'Inventario',
    implemented: true,
    screens: [
      {
        code: '2.1',
        slug: '2-1',
        name: 'Existencias',
        desc: 'Stock por producto y bodega, sin doble conteo',
        roles: ['ADM', 'JB', 'OPE', 'GER', 'ASE'],
        actRoles: ['ADM', 'JB'],
        implemented: true,
      },
      {
        code: '2.2',
        slug: '2-2',
        name: 'Movimientos',
        desc: 'Kárdex inmutable de ingresos, reservas, entregas, daños, traspasos y ajustes',
        roles: ['ADM', 'JB', 'GER'],
        actRoles: ['ADM', 'JB'],
        implemented: true,
      },
      {
        code: '2.3',
        slug: '2-3',
        name: 'Traspasos entre bodegas',
        desc: 'Solicitud, aprobación, despacho en tránsito y recepción de traslados entre bodegas',
        roles: ['ADM', 'JB', 'OPE'],
        actRoles: ['ADM', 'JB', 'OPE'],
        implemented: true,
      },
      {
        code: '2.4',
        slug: '2-4',
        name: 'Catálogo y conversiones',
        desc: 'Productos, precios, márgenes y conversiones de unidad (m², kg, m, L)',
        roles: ['ADM', 'JB', 'OPE', 'GER', 'ASE'],
        actRoles: ['ADM', 'JB'],
        implemented: true,
      },
    ],
  },
  {
    id: 3,
    name: 'Entradas',
    shortName: 'Entradas',
    implemented: true,
    screens: [
      {
        code: '3.1',
        slug: '3-1',
        name: 'Recepción de mercadería',
        desc: 'Ingreso contra orden de compra o guía con vencimiento y apertura automática de reclamo por daño o faltante',
        roles: ['ADM', 'JB', 'OPE'],
        actRoles: ['ADM', 'JB', 'OPE'],
        implemented: true,
      },
    ],
  },
  {
    id: 4,
    name: 'Ventas y entregas',
    shortName: 'Ventas y entregas',
    implemented: true,
    screens: [
      {
        code: '4.1',
        slug: '4-1',
        name: 'Pedidos y facturas',
        desc: 'Crear pedidos, cargar facturas del día desde Siigo y facturar en caja',
        roles: ['ADM', 'JB', 'OPE', 'GER', 'ASE', 'CAJ'],
        actRoles: ['ADM', 'JB', 'ASE', 'CAJ'],
        implemented: true,
      },
      {
        code: '4.2',
        slug: '4-2',
        name: 'Entrega en bodega',
        desc: 'Entrega validada con el número de factura, total o parcial',
        roles: ['ADM', 'JB', 'OPE'],
        actRoles: ['ADM', 'JB', 'OPE'],
        implemented: true,
      },
      {
        code: '4.3',
        slug: '4-3',
        name: 'Conciliación',
        desc: 'Facturado frente a entregado y pendiente, con alertas de diferencias',
        roles: ['ADM', 'JB', 'GER', 'CAJ'],
        actRoles: ['ADM', 'JB'],
        implemented: true,
      },
    ],
  },
  {
    id: 5,
    name: 'Control de pérdidas',
    shortName: 'Control de pérdidas',
    implemented: true,
    screens: [
      {
        code: '5.1',
        slug: '5-1',
        name: 'Daños y mermas',
        desc: 'Registro de mercadería dañada con evidencia, desvío a reclamo de proveedor o aprobación de baja según umbral',
        roles: ['ADM', 'JB', 'OPE', 'GER'],
        actRoles: ['ADM', 'JB', 'OPE', 'GER'],
        implemented: true,
      },
      {
        code: '5.2',
        slug: '5-2',
        name: 'Conteos de inventario',
        desc: 'Programación de inventario por bodega y captura ciega de cantidades físicas',
        roles: ['ADM', 'JB', 'OPE'],
        actRoles: ['ADM', 'JB', 'OPE'],
        implemented: true,
      },
      {
        code: '5.3',
        slug: '5-3',
        name: 'Ajustes y aprobaciones',
        desc: 'Aprobación de diferencias de conteo según el umbral de $ 1.200.000',
        roles: ['ADM', 'JB', 'GER'],
        actRoles: ['ADM', 'JB', 'GER'],
        implemented: true,
      },
    ],
  },
  {
    id: 6,
    name: 'Reclamos y rezagados',
    shortName: 'Reclamos y rezagados',
    implemented: true,
    screens: [
      {
        code: '6.1',
        slug: '6-1',
        name: 'Reclamos y devoluciones',
        desc: 'Seguimiento de reclamos a proveedor y devoluciones de cliente con nota de crédito, reposición o reintegro',
        roles: ['ADM', 'JB', 'GER'],
        actRoles: ['ADM', 'JB'],
        implemented: true,
      },
      {
        code: '6.2',
        slug: '6-2',
        name: 'Rezagados y vencimientos',
        desc: 'Mercadería con 60+ días sin salida y partidas próximas a vencer en 30 días o menos',
        roles: ['ADM', 'JB', 'GER'],
        actRoles: ['ADM', 'JB'],
        implemented: true,
      },
    ],
  },
  {
    id: 7,
    name: 'Configuración',
    shortName: 'Configuración',
    implemented: true,
    screens: [
      {
        code: '7.1',
        slug: '7-1',
        name: 'Bodegas y estructura',
        desc: 'Estructura contratada de Casa Matriz, Almacenes y Bodegas (Casos 1, 2 y 3) y parámetros operativos',
        roles: ['ADM'],
        actRoles: ['ADM'],
        implemented: true,
      },
      {
        code: '7.2',
        slug: '7-2',
        name: 'Usuarios y perfiles',
        desc: 'Simulación de los 4 perfiles operativos y personal asignado por bodega',
        roles: ['ADM'],
        actRoles: ['ADM'],
        implemented: true,
      },
      {
        code: '7.3',
        slug: '7-3',
        name: 'Apariencia',
        desc: 'Fuente y tema claro u oscuro',
        roles: ['ADM', 'JB', 'OPE', 'GER', 'ASE', 'CAJ'],
        actRoles: ['ADM', 'JB', 'OPE', 'GER', 'ASE', 'CAJ'],
        implemented: true,
      },
      {
        code: '7.4',
        slug: '7-4',
        name: 'Facturación y cajas',
        desc: 'Prefijos de factura, puntos de venta y medios de pago',
        roles: ['ADM'],
        actRoles: ['ADM'],
        implemented: true,
      },
    ],
  },
]

/** Pantalla con la que arranca cada perfil al iniciar sesión. */
export function landingSlugForRole(role: RoleCode): string {
  if (role === 'ASE' || role === 'CAJ') return '4-1'
  if (role === 'OPE') return '4-2'
  return '1-1'
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
