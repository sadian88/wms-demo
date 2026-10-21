import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { SalesDay } from '@/features/wms/domain/dashboard'
import { cop, shortDate } from '@/features/wms/screens/ui-helpers'
import { ChartTable, ChartTooltipCard } from './chart-parts'
import { AXIS_TICK, copAxis } from './chart-theme'

const SERIES = [
  { key: 'invoicedCOP', label: 'Facturado', color: 'var(--viz-1)' },
  { key: 'deliveredCOP', label: 'Entregado', color: 'var(--viz-2)' },
] as const

/** Último punto de cada serie: marca de 8 px con anillo del color de la superficie. */
function endDot(lastIndex: number, color: string) {
  return function EndDot(props: { cx?: number; cy?: number; index?: number }) {
    const { cx, cy, index } = props
    if (index !== lastIndex || cx == null || cy == null) return <g />
    return (
      <circle
        cx={cx}
        cy={cy}
        r={4}
        fill={color}
        stroke='var(--card)'
        strokeWidth={2}
      />
    )
  }
}

/** Línea de tiempo de lo facturado frente a lo entregado, día por día. */
export function SalesTrendChart({
  days,
  height = 200,
}: {
  days: SalesDay[]
  height?: number
}) {
  const data = days.map((d) => ({ ...d, label: shortDate(d.date) }))
  const last = data.length - 1

  return (
    <div>
      <ul className='mb-2 flex items-center gap-4 text-sm text-muted-foreground'>
        {SERIES.map((s) => (
          <li key={s.key} className='flex items-center gap-1.5'>
            <span
              aria-hidden
              className='h-0.5 w-4 rounded-full'
              style={{ background: s.color }}
            />
            {s.label}
          </li>
        ))}
      </ul>

      <ResponsiveContainer width='100%' height={height}>
        <AreaChart
          data={data}
          margin={{ top: 8, right: 16, bottom: 0, left: 0 }}
        >
          <CartesianGrid vertical={false} stroke='var(--border)' />
          <XAxis
            dataKey='label'
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={{ stroke: 'var(--border)' }}
            interval='preserveStartEnd'
            minTickGap={28}
          />
          <YAxis
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            width={56}
            tickFormatter={copAxis}
            allowDecimals={false}
          />
          <Tooltip
            cursor={{ stroke: 'var(--muted-foreground)', strokeWidth: 1 }}
            content={({ active, label, payload }) =>
              active && payload?.length ? (
                <ChartTooltipCard
                  title={String(label)}
                  rows={SERIES.map((s) => ({
                    label: s.label,
                    color: s.color,
                    value: cop(
                      Number(
                        payload.find((p) => p.dataKey === s.key)?.value ?? 0
                      )
                    ),
                  }))}
                />
              ) : null
            }
          />
          {SERIES.map((s) => (
            <Area
              key={s.key}
              type='linear'
              dataKey={s.key}
              name={s.label}
              stroke={s.color}
              strokeWidth={2}
              strokeLinecap='round'
              fill={s.color}
              fillOpacity={0.1}
              dot={endDot(last, s.color)}
              activeDot={{ r: 4, stroke: 'var(--card)', strokeWidth: 2 }}
              isAnimationActive={false}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>

      <ChartTable
        caption='Facturado y entregado por día'
        head={['Día', 'Facturado', 'Entregado']}
        rows={data.map((d) => [
          d.label,
          cop(d.invoicedCOP),
          cop(d.deliveredCOP),
        ])}
      />
    </div>
  )
}
