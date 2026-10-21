import { cop } from '@/features/wms/screens/ui-helpers'

/** Pesos en forma corta para espacios angostos: «$ 312,4 M»; por debajo del millón, completo. */
export function copCompact(n: number): string {
  if (Math.abs(n) >= 1_000_000) {
    return `$ ${(n / 1_000_000).toLocaleString('es-CO', { maximumFractionDigits: 1 })} M`
  }
  return cop(n)
}

/** «1 pedido» / «3 pedidos». */
export function plural(n: number, one: string, many: string): string {
  return `${n.toLocaleString('es-CO')} ${n === 1 ? one : many}`
}

/** «A», «A y B», «A, B y 2 más». */
export function listLabel(items: string[], max = 2): string {
  if (items.length === 0) return ''
  if (items.length === 1) return items[0]
  if (items.length <= max) {
    return `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`
  }
  return `${items.slice(0, max).join(', ')} y ${items.length - max} más`
}
