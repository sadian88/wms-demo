import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { cn } from '@/lib/utils'
import type { StockState } from '@/features/wms/domain/inventory'
import { nf } from '@/features/wms/screens/ui-helpers'
import { ChartTable, ChartTooltipCard } from './chart-parts'
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
  /** Texto de centro. Por defecto, el total de unidades. */
  centerValue?: string
  centerLabel?: string
  className?: string
}

/** Color de cada estado: los mismos tokens de estado del tema que usa la leyenda. */
const STATE_FILL: Record<StockState, { fill: string; opacity: number }> = {
  disponible: { fill: 'var(--success)', opacity: 1 },
  reservado: { fill: 'var(--info)', opacity: 1 },
  transito: { fill: 'var(--muted-foreground)', opacity: 0.5 },
  reclamo: { fill: 'var(--warning)', opacity: 1 },
  danado: { fill: 'var(--danger)', opacity: 1 },
}

/**
 * Anillo con leyenda. Una unidad física está en un solo estado, así que los
 * tramos suman el 100 %. La leyenda lleva el nombre, las unidades y el
 * porcentaje; el anillo muestra el detalle al pasar el cursor.
 */
export function DonutStockChart({
  segments,
  size = 120,
  centerValue,
  centerLabel = 'en total',
  className,
}: DonutStockChartProps) {
  const total = segments.reduce((acc, s) => acc + Math.max(0, s.units), 0)
  const visible = segments.filter((s) => s.units > 0)

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-x-4 gap-y-3 sm:flex-nowrap',
        className
      )}
    >
      <div
        className='relative mx-auto shrink-0 sm:mx-0'
        style={{ width: size, height: size }}
      >
        <ResponsiveContainer width='100%' height='100%'>
          <PieChart>
            <Pie
              data={total > 0 ? visible : [{ state: 'disponible', units: 1 }]}
              dataKey='units'
              nameKey='state'
              innerRadius='66%'
              outerRadius='100%'
              startAngle={90}
              endAngle={-270}
              stroke='var(--card)'
              strokeWidth={2}
              isAnimationActive={false}
            >
              {(total > 0 ? visible : []).map((s) => (
                <Cell
                  key={s.state}
                  fill={STATE_FILL[s.state].fill}
                  fillOpacity={STATE_FILL[s.state].opacity}
                />
              ))}
              {total === 0 && <Cell fill='var(--muted)' />}
            </Pie>
            <Tooltip
              wrapperStyle={{ zIndex: 20, pointerEvents: 'none' }}
              content={({ active, payload }) => {
                const seg = payload?.[0]?.payload as DonutSegment | undefined
                return active && seg && total > 0 ? (
                  <ChartTooltipCard
                    title={STOCK_STATE_META[seg.state].label}
                    rows={[
                      { label: 'unidades', value: nf(seg.units) },
                      {
                        label: 'del total',
                        value: pctLabel(seg.units, total),
                      },
                    ]}
                  />
                ) : null
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className='pointer-events-none absolute inset-0 z-0 flex flex-col items-center justify-center text-center'>
          <span className='text-xl font-semibold tracking-tight'>
            {centerValue ?? nf(total)}
          </span>
          <span className='text-xs text-muted-foreground'>{centerLabel}</span>
        </div>
      </div>

      <ul className='min-w-0 flex-1 basis-40 space-y-0.5'>
        {segments.map((seg) => {
          const meta = STOCK_STATE_META[seg.state]
          const content = (
            <>
              <span
                className={cn('size-2.5 shrink-0 rounded-full', meta.dot)}
                aria-hidden
              />
              <span className='min-w-0 flex-1 truncate'>{meta.label}</span>
              <span className='text-muted-foreground tabular-nums'>
                {nf(seg.units)}
              </span>
              <span className='w-10 text-end font-medium tabular-nums'>
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
                  className='flex min-h-8 w-full items-center gap-2 rounded-md px-2 text-start text-sm transition-colors hover:bg-accent/60'
                >
                  {content}
                </button>
              ) : (
                <div className='flex min-h-8 items-center gap-2 px-2 text-sm'>
                  {content}
                </div>
              )}
            </li>
          )
        })}
      </ul>

      <ChartTable
        caption='Distribución del stock físico por estado'
        head={['Estado', 'Unidades', 'Porcentaje']}
        rows={segments.map((s) => [
          STOCK_STATE_META[s.state].label,
          nf(s.units),
          pctLabel(s.units, total),
        ])}
      />
    </div>
  )
}
