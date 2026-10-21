import {
  ArrowLeftRight,
  ClipboardCheck,
  FileCheck2,
  FileWarning,
  Hourglass,
  History,
  LayoutDashboard,
  PackageCheck,
  Palette,
  Receipt,
  Scale,
  ShieldAlert,
  Tags,
  Truck,
  Users,
  Warehouse,
  Boxes,
  Landmark,
  type LucideIcon,
} from 'lucide-react'
import { WMS_MODULES, type WmsScreen } from './catalog'

/** Menú organizado por momento de uso, no por módulo técnico. */
export const NAV_SECTIONS: { title: string; slugs: string[] }[] = [
  { title: 'Día a día', slugs: ['1-1', '4-1', '4-2', '3-1', '4-3'] },
  { title: 'Inventario', slugs: ['2-1', '2-2', '2-3', '2-4'] },
  { title: 'Control', slugs: ['5-1', '5-2', '5-3', '6-1', '6-2'] },
  { title: 'Configuración', slugs: ['7-1', '7-2', '7-4', '7-3'] },
]

export const SCREEN_ICONS: Record<string, LucideIcon> = {
  '1-1': LayoutDashboard,
  '2-1': Boxes,
  '2-2': History,
  '2-3': ArrowLeftRight,
  '2-4': Tags,
  '3-1': Truck,
  '4-1': Receipt,
  '4-2': PackageCheck,
  '4-3': Scale,
  '5-1': ShieldAlert,
  '5-2': ClipboardCheck,
  '5-3': FileCheck2,
  '6-1': FileWarning,
  '6-2': Hourglass,
  '7-1': Warehouse,
  '7-2': Users,
  '7-3': Palette,
  '7-4': Landmark,
}

const SCREEN_BY_SLUG = new Map<string, WmsScreen>(
  WMS_MODULES.flatMap((m) => m.screens).map((s) => [s.slug, s])
)

export function screenPath(slug: string): string {
  return slug === '1-1' ? '/' : `/wms/${slug}`
}

export function navSections(
  canSee: (s: WmsScreen) => boolean,
  includeLocked = false
) {
  return NAV_SECTIONS.map((section) => ({
    title: section.title,
    screens: section.slugs
      .map((slug) => SCREEN_BY_SLUG.get(slug))
      .filter((s): s is WmsScreen => !!s)
      .filter((s) => includeLocked || canSee(s)),
  })).filter((section) => section.screens.length > 0)
}
