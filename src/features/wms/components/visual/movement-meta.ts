import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Bookmark,
  BookmarkMinus,
  FileWarning,
  PackageCheck,
  RotateCcw,
  Scale,
  TriangleAlert,
  Trash2,
  Truck,
  Undo2,
  type LucideIcon,
} from 'lucide-react'
import type { Tone } from '@/features/wms/components/kit'
import type {
  Movement,
  MovementType,
  SkuItem,
  StandardUnit,
} from '@/features/wms/domain/inventory'

/** Todos los tipos de movimiento, en el orden en que se ofrecen como filtro. */
export const MOVEMENT_TYPES: MovementType[] = [
  'Ingreso',
  'Entrega',
  'Reserva',
  'Liberación',
  'Daño',
  'Baja',
  'Reclamo',
  'Reintegro',
  'Devolución cliente',
  'Devolución proveedor',
  'Traspaso salida',
  'Traspaso entrada',
  'Ajuste conteo',
]

export const MOVEMENT_ICON: Record<MovementType, LucideIcon> = {
  Ingreso: ArrowDownToLine,
  Reserva: Bookmark,
  Liberación: BookmarkMinus,
  Entrega: PackageCheck,
  Daño: TriangleAlert,
  Baja: Trash2,
  'Traspaso salida': Truck,
  'Traspaso entrada': Truck,
  Reclamo: FileWarning,
  Reintegro: RotateCcw,
  'Devolución cliente': Undo2,
  'Devolución proveedor': ArrowUpFromLine,
  'Ajuste conteo': Scale,
}

/**
 * `in` suma stock físico (viene de fuera), `out` lo resta (sale de la bodega)
 * y `shift` solo lo cambia de estado dentro de la misma partida.
 */
export type MovementKind = 'in' | 'out' | 'shift'

export function movementKind(m: Movement): MovementKind {
  if (m.fromState === null) return 'in'
  if (m.toState === null) return 'out'
  return 'shift'
}

/** Color con sentido: ingreso verde, daño o pérdida coral, reclamo ámbar, resto neutro. */
export function movementTone(m: Movement): Tone {
  switch (m.type) {
    case 'Daño':
    case 'Baja':
      return 'danger'
    case 'Ajuste conteo':
      return movementKind(m) === 'out' ? 'danger' : 'warning'
    case 'Reclamo':
    case 'Devolución cliente':
      return 'warning'
    case 'Ingreso':
    case 'Traspaso entrada':
    case 'Reintegro':
      return 'success'
    default:
      return 'neutral'
  }
}

/** «+438», «−18» o «18» según el movimiento cambie o no el stock físico. */
export function movementSigned(m: Movement): string {
  const n = m.qty.toLocaleString('es-CO')
  const kind = movementKind(m)
  if (kind === 'in') return `+${n}`
  if (kind === 'out') return `−${n}`
  return n
}

const NO_PLURAL = new Set(['kg', 'g', 'm', 'm²', 'm³', 'l'])

/** Nombre de la unidad según la cantidad: «caja», «cajas», «kg». */
export function unitWord(qty: number, unit: StandardUnit): string {
  const base = unit.toLowerCase()
  if (qty === 1 || NO_PLURAL.has(base)) return base
  return base.endsWith('ón') ? `${base.slice(0, -2)}ones` : `${base}s`
}

/** «1 caja», «18 cajas», «40 kg». */
export function qtyWithUnit(qty: number, unit: StandardUnit): string {
  return `${qty.toLocaleString('es-CO')} ${unitWord(qty, unit)}`
}

export function skuUnit(
  sku?: Pick<SkuItem, 'unitMeasure'> | null
): StandardUnit {
  return sku?.unitMeasure ?? 'unidad'
}
