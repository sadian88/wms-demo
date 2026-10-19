import {
  Activity,
  Award,
  BarChart3,
  Boxes,
  Building2,
  ClipboardCheck,
  Hand,
  PackageCheck,
  Settings2,
  ShoppingCart,
  Truck,
  Warehouse,
} from 'lucide-react'
import { WMS_MODULES } from '@/features/wms/data/wms-data'
import { type SidebarData } from '../types'

const MODULE_ICONS: Record<number, React.ElementType> = {
  1: Activity,
  2: Boxes,
  3: PackageCheck,
  4: Hand,
  5: Boxes,
  6: Truck,
  7: Award,
  8: ClipboardCheck,
  9: ShoppingCart,
  10: BarChart3,
  11: Settings2,
}

export const sidebarData: SidebarData = {
  user: {
    name: 'Andrés Morales',
    email: 'a.morales@ceramix-wms.cl',
    avatar: '/avatars/01.png',
  },
  teams: [
    {
      name: 'Ceramix Constructora PyME',
      logo: Building2,
      plan: 'Cuenta Padre · 4 Bodegas Hijas',
    },
    {
      name: 'CD Cerámico Quilicura',
      logo: Warehouse,
      plan: 'BOD-CEN-01 · 320 Pallets',
    },
    {
      name: 'Patio Constructor Renca',
      logo: Warehouse,
      plan: 'BOD-OBR-02 · 180 Pallets',
    },
    {
      name: 'Hub Morteros Lampa',
      logo: Warehouse,
      plan: 'BOD-MOR-04 · 140 Pallets FEFO',
    },
  ],
  navGroups: [
    {
      title: 'Operación Logística',
      items: WMS_MODULES.filter((m) => m.id <= 6).map((mod) => ({
        title: mod.name,
        icon: MODULE_ICONS[mod.id] || Boxes,
        items: mod.screens.map((scr) => ({
          title: scr.name,
          url: scr.slug === '1-1' ? '/' : `/wms/${scr.slug}`,
        })),
      })),
    },
    {
      title: 'Control y Administración',
      items: WMS_MODULES.filter((m) => m.id > 6).map((mod) => ({
        title: mod.name,
        icon: MODULE_ICONS[mod.id] || Boxes,
        items: mod.screens.map((scr) => ({
          title: scr.name,
          url: `/wms/${scr.slug}`,
        })),
      })),
    },
  ],
}
