import { cn } from '@/lib/utils'
import type { StockState } from '@/features/wms/domain/inventory'
import { nf } from '@/features/wms/screens/ui-helpers'
import { STOCK_STATES, STOCK_STATE_META, pctLabel } from './stock-states'

interface StockCompositionBarProps {
  qty: Record<StockState, number>
  /** Si se omite, es la suma de los 5 estados. */
  totalPhysical?: number
  height?: 'sm' | 'md' | 'lg'
  /** Muestra debajo la leyenda de estados con su porcentaje. */
  showLegend?: boolean
  className?: string
}

const HEIGHT = { sm: 'h-2', md: 'h-3', lg: 'h-4' } as const

/**
 * Barra apilada con los 5 estados del stock. Cada tramo tiene su nombre en el
 * `title` y en la leyenda: el color nunca es el único dato.
 */
export function StockCompositionBar({
  qty,
  totalPhysical,
  height = 'sm',
  showLegend = false,
  className,
}: StockCompositionBarProps) {
  const total =
    totalPhysical !== undefined
      ? totalPhysical
      : STOCK_STATES.reduce((acc, s) => acc + (qty[s] || 0), 0)

  const summary = STOCK_STATES.filter((s) => (qty[s] ?? 0) > 0)
    .map((s) => `${STOCK_STATE_META[s].label} ${nf(qty[s])}`)
    .join(', ')

  return (
    <div className={cn('w-full space-y-3', className)}>
      <div
        role='img'
        aria-label={
          total > 0 ? `Distribución del stock: ${summary}` : 'Sin stock'
        }
        className={cn(
          'flex w-full gap-0.5 overflow-hidden rounded-full bg-muted',
          HEIGHT[height]
        )}
      >
        {total > 0 &&
          STOCK_STATES.map((state) => {
            const count = qty[state] ?? 0
            if (count <= 0) return null
            return (
              <div
                key={state}
                title={`${STOCK_STATE_META[state].label}: ${nf(count)} (${pctLabel(count, total)})`}
                style={{ width: `${(count / total) * 100}%`, minWidth: 4 }}
                className={cn('h-full', STOCK_STATE_META[state].bar)}
              />
            )
          })}
      </div>

      {showLegend && total > 0 && (
        <ul className='flex flex-wrap gap-x-4 gap-y-1.5 text-sm'>
          {STOCK_STATES.map((state) => {
            const count = qty[state] ?? 0
            if (count <= 0) return null
            return (
              <li key={state} className='flex items-center gap-2'>
                <span
                  className={cn(
                    'size-2.5 shrink-0 rounded-full',
                    STOCK_STATE_META[state].dot
                  )}
                />
                <span className='text-muted-foreground'>
                  {STOCK_STATE_META[state].label}
                </span>
                <span className='font-medium tabular-nums'>
                  {pctLabel(count, total)}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
