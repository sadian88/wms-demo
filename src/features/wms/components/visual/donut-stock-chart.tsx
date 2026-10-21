import { cn } from '@/lib/utils'
import type { StockState } from '@/features/wms/domain/inventory'
import { nf } from '@/features/wms/screens/ui-helpers'
import { STOCK_STATE_META, pctLabel } from './stock-states'

export interface DonutSegment {
  state: StockState
  units: number
  /** Si existe, la fila de la leyenda se vuelve un botón que lleva a su pantalla. */
  onSelect?: () => void
}

interface DonutStockChartProps {
  segments: DonutSegment[]
  size?: number
  strokeWidth?: number
  /** Texto de centro. Por defecto, el total de unidades. */
  centerValue?: string
  centerLabel?: string
  className?: string
}

/**
 * Anillo compacto con leyenda. Una unidad física está en un solo estado, así
 * que los tramos suman el 100 %. La leyenda lleva el nombre y el porcentaje.
 */
export function DonutStockChart({
  segments,
  size = 128,
  strokeWidth = 16,
  centerValue,
  centerLabel = 'en total',
  className,
}: DonutStockChartProps) {
  const total = segments.reduce((acc, s) => acc + Math.max(0, s.units), 0)
  const radius = (size - strokeWidth) / 2
  const center = size / 2
  const circumference = 2 * Math.PI * radius
  const gap = segments.filter((s) => s.units > 0).length > 1 ? 3 : 0

  const arcs = segments.map((seg, i) => {
    const toFull = (u: number) =>
      (total > 0 ? Math.max(0, u) / total : 0) * circumference
    const start = segments
      .slice(0, i)
      .reduce((acc, s) => acc + toFull(s.units), 0)
    return { seg, length: Math.max(0, toFull(seg.units) - gap), offset: start }
  })

  return (
    <div
      className={cn(
        'flex items-center gap-4 sm:gap-6 xl:flex-col xl:items-stretch xl:gap-4 2xl:flex-row 2xl:items-center',
        className
      )}
    >
      <div
        className='relative shrink-0 xl:mx-auto 2xl:mx-0'
        style={{ width: size, height: size }}
      >
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          role='img'
          aria-label={`Distribución del stock físico: ${segments
            .filter((s) => s.units > 0)
            .map(
              (s) =>
                `${STOCK_STATE_META[s.state].label} ${pctLabel(s.units, total)}`
            )
            .join(', ')}`}
        >
          <g transform={`rotate(-90 ${center} ${center})`}>
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill='none'
              strokeWidth={strokeWidth}
              className='stroke-muted'
            />
            {arcs.map(({ seg, length, offset: start }) =>
              seg.units > 0 && length > 0 ? (
                <circle
                  key={seg.state}
                  cx={center}
                  cy={center}
                  r={radius}
                  fill='none'
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${length} ${circumference - length}`}
                  strokeDashoffset={-start}
                  className={STOCK_STATE_META[seg.state].stroke}
                />
              ) : null
            )}
          </g>
        </svg>
        <div className='pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center'>
          <span className='text-xl font-semibold tracking-tight tabular-nums'>
            {centerValue ?? nf(total)}
          </span>
          <span className='text-xs text-muted-foreground'>{centerLabel}</span>
        </div>
      </div>

      <ul className='min-w-0 flex-1 space-y-0.5'>
        {segments.map((seg) => {
          const meta = STOCK_STATE_META[seg.state]
          const content = (
            <>
              <span
                className={cn('size-2.5 shrink-0 rounded-full', meta.dot)}
              />
              <span className='min-w-0 flex-1 truncate'>{meta.label}</span>
              <span className='font-medium tabular-nums'>
                {pctLabel(seg.units, total)}
              </span>
            </>
          )
          return (
            <li key={seg.state}>
              {seg.onSelect ? (
                <button
                  type='button'
                  onClick={seg.onSelect}
                  className='flex min-h-9 w-full items-center gap-2 rounded-md px-2 text-start text-sm transition-colors hover:bg-accent/60'
                >
                  {content}
                </button>
              ) : (
                <div className='flex min-h-9 items-center gap-2 px-2 text-sm'>
                  {content}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
