import type { RoleCode } from '@/features/wms/domain/inventory'

export type { RoleCode }

interface WmsRole {
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
      'Acceso total a los 7 módulos, configuración de bodegas, usuarios, catálogo y aprobaciones sin límite',
    assignedCount: 3,
    readOnly: false,
  },
  JB: {
    code: 'JB',
    name: 'Jefe de Bodega',
    description:
      'Supervisa inventario, pedidos, reclamos y conteos; aprueba traspasos, bajas y ajustes hasta $ 1.200.000 COP',
    assignedCount: 6,
    readOnly: false,
  },
  OPE: {
    code: 'OPE',
    name: 'Operario de Bodega',
    description:
      'Recibe mercadería, entrega retiros en mostrador, despacha/recibe traspasos, reporta daños y ejecuta conteos ciegos',
    assignedCount: 14,
    readOnly: false,
  },
  GER: {
    code: 'GER',
    name: 'Gerencia (Solo lectura)',
    description:
      'Visión consolidada del mapa de mercancía, existencias y reclamos; aprueba bajas y ajustes sobre $ 1.200.000 COP',
    assignedCount: 4,
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
        name: 'Mapa de mercancía',
        desc: 'Resumen en vivo de mercancía en existencia, por entregar, dañada, por reclamar, rezagada y perdida',
        roles: ['ADM', 'JB', 'GER'],
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
        desc: 'Stock por SKU, bodega, partida, estado y fecha de vencimiento sin doble conteo',
        roles: ['ADM', 'JB', 'OPE', 'GER'],
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
        desc: 'Maestro de SKUs, unidades base físicas, factores de conversión (m², kg, m, L) y calculadora de bodega',
        roles: ['ADM', 'JB', 'OPE', 'GER'],
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
    name: 'Salidas',
    shortName: 'Salidas',
    implemented: true,
    screens: [
      {
        code: '4.1',
        slug: '4-1',
        name: 'Pedidos por entregar',
        desc: 'Carga manual o por CSV con reserva FEFO automática, preparación y alerta de pedidos sin retirar',
        roles: ['ADM', 'JB', 'OPE', 'GER'],
        actRoles: ['ADM', 'JB'],
        implemented: true,
      },
      {
        code: '4.2',
        slug: '4-2',
        name: 'Mostrador de retiro',
        desc: 'Confirmación de retiro total o parcial en bodega registrando quién retira, RUT y documento',
        roles: ['ADM', 'JB', 'OPE'],
        actRoles: ['ADM', 'JB', 'OPE'],
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
        slug: '5.3'.replace('.', '-'),
        name: 'Ajustes y aprobaciones',
        desc: 'Aprobación de diferencias de conteo según umbral en COP ($ 1.200.000 COP); los faltantes aprobados se registran como pérdida',
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
        desc: 'Preferencias de fuente tipográfica y tema claro/oscuro',
        roles: ['ADM', 'JB', 'OPE', 'GER'],
        actRoles: ['ADM', 'JB', 'OPE', 'GER'],
        implemented: true,
      },
    ],
  },
]

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

