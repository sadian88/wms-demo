import type { SkuItem } from '@/features/wms/domain/inventory'

/** Nombres de unidad en singular y plural, en minúscula, para frases como «12 cajas». */
const UNIT_NAMES: Record<string, [string, string]> = {
  Caja: ['caja', 'cajas'],
  Saco: ['saco', 'sacos'],
  Balde: ['balde', 'baldes'],
  Tira: ['tira', 'tiras'],
  Rollo: ['rollo', 'rollos'],
  Unidad: ['unidad', 'unidades'],
  Litro: ['litro', 'litros'],
  Galón: ['galón', 'galones'],
  kg: ['kg', 'kg'],
  g: ['g', 'g'],
  m: ['m', 'm'],
  'm²': ['m²', 'm²'],
}

export function unitName(unit: string, qty = 1): string {
  const names = UNIT_NAMES[unit]
  if (!names) return unit.toLowerCase()
  return qty === 1 ? names[0] : names[1]
}

/** Número con coma decimal y hasta 2 decimales: 1.44 → «1,44». */
export function fmtNum(n: number, maxDecimals = 2): string {
  return n.toLocaleString('es-CO', { maximumFractionDigits: maxDecimals })
}

/** «12 cajas», «1 saco». */
export function qtyText(qty: number, unit: string): string {
  return `${fmtNum(qty)} ${unitName(unit, qty)}`
}

/** «1 caja = 1,44 m²» o null si el producto no tiene conversión. */
export function conversionText(
  sku: Pick<SkuItem, 'unitMeasure' | 'conversions'>
): string | null {
  const conv = sku.conversions?.[0]
  if (!conv || conv.factor <= 0) return null
  return `1 ${unitName(sku.unitMeasure)} = ${fmtNum(conv.factor)} ${unitName(conv.targetUnit, conv.factor)}`
}
