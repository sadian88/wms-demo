import {
  Activity,
  AlertTriangle,
  Boxes,
  Building2,
  PackageCheck,
  Settings2,
  ShieldAlert,
  ShoppingBag,
  Warehouse,
} from 'lucide-react'
import { WMS_MODULES } from '@/features/wms/data/catalog'
import { type SidebarData } from '../types'

const MODULE_ICONS: Record<number, React.ElementType> = {
  1: Activity,
  2: Boxes,
  3: PackageCheck,
  4: ShoppingBag,
  5: ShieldAlert,
  6: AlertTriangle,
  7: Settings2,
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
      title: 'Operación',
      items: WMS_MODULES.filter((m) => m.id <= 4).map((mod) => ({
        title: mod.name,
        icon: MODULE_ICONS[mod.id] || Boxes,
        items: mod.screens.map((scr) => ({
          title: scr.name,
          url: scr.slug === '1-1' ? '/' : `/wms/${scr.slug}`,
        })),
      })),
    },
    {
      title: 'Control',
      items: WMS_MODULES.filter((m) => m.id > 4).map((mod) => ({
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
