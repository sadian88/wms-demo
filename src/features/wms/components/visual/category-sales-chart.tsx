import {
  Bar,
  BarChart,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { CategorySales } from '@/features/wms/domain/dashboard'
import { cop, nf } from '@/features/wms/screens/ui-helpers'
import { ChartTable, ChartTooltipCard } from './chart-parts'
import { AXIS_TICK, copAxis } from './chart-theme'

const ROW_HEIGHT = 34

/** Barras horizontales: una sola serie, un solo color; el valor va en la punta. */
export function CategorySalesChart({ rows }: { rows: CategorySales[] }) {
  return (
    <div>
      <ResponsiveContainer width='100%' height={rows.length * ROW_HEIGHT + 8}>
        <BarChart
          data={rows}
          layout='vertical'
          margin={{ top: 0, right: 56, bottom: 0, left: 0 }}
          barCategoryGap={10}
        >
          <XAxis type='number' hide domain={[0, 'dataMax']} />
          <YAxis
            type='category'
            dataKey='category'
            width={142}
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            cursor={{ fill: 'var(--accent)' }}
            content={({ active, payload }) => {
              const row = payload?.[0]?.payload as CategorySales | undefined
              return active && row ? (
                <ChartTooltipCard
                  title={row.category}
                  rows={[
                    {
                      label: 'Facturado',
                      value: cop(row.revenueCOP),
                      color: 'var(--viz-1)',
                    },
                    { label: 'Unidades', value: nf(row.units) },
                  ]}
                />
              ) : null
            }}
          />
          <Bar
            dataKey='revenueCOP'
            fill='var(--viz-1)'
            barSize={14}
            radius={[0, 4, 4, 0]}
            isAnimationActive={false}
          >
            <LabelList
              dataKey='revenueCOP'
              position='right'
              formatter={(v) => copAxis(Number(v))}
              fill='var(--foreground)'
              fontSize={12}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <ChartTable
        caption='Facturado por categoría'
        head={['Categoría', 'Facturado', 'Unidades']}
        rows={rows.map((r) => [r.category, cop(r.revenueCOP), nf(r.units)])}
      />
    </div>
  )
}
