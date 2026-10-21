/** Texto de eje de los gráficos: color apagado y tamaño pequeño del template. */
export const AXIS_TICK = { fill: 'var(--muted-foreground)', fontSize: 12 }

/** «$ 12,5 M», «$ 480 K», «$ 0» — compacto para ejes y etiquetas. */
export function copAxis(n: number): string {
  if (n === 0) return '$ 0'
  if (Math.abs(n) >= 1_000_000) {
    return `$ ${(n / 1_000_000).toLocaleString('es-CO', { maximumFractionDigits: 1 })} M`
  }
  return `$ ${Math.round(n / 1000).toLocaleString('es-CO')} K`
}
