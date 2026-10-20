import { cop, nf } from '@/features/wms/screens/ui-helpers'

export interface AgingBucketData {
  key: '0-30' | '31-60' | '61-90' | '90+'
  label: string
  rangeText: string
  units: number
  valueCOP?: number
  valueUSD: number
  partidasCount: number
  color: string
  bgLight: string
  borderLight: string
  statusText: string
}

interface AgingChartProps {
  buckets: AgingBucketData[]
  totalUnits: number
  totalCOP?: number
  totalUSD?: number
  selectedKey?: string | null
  onSelectBucket?: (key: '0-30' | '31-60' | '61-90' | '90+' | null) => void
  className?: string
}

export function AgingChart({
  buckets,
  totalUnits,
  totalCOP,
  totalUSD,
  selectedKey,
  onSelectBucket,
  className = '',
}: AgingChartProps) {
  // Find max value to normalize bar heights
  const maxUnits = Math.max(1, ...buckets.map((b) => b.units))
  const displayTotalAmount = totalCOP ?? totalUSD ?? 0

  return (
    <div className={`space-y-4 rounded-xl border bg-card p-4 ${className}`}>
      <div className='flex flex-wrap items-center justify-between gap-2 border-b pb-3'>
        <div>
          <h3 className='text-sm font-semibold'>
            Envejecimiento de Inventario (Aging Buckets)
          </h3>
          <p className='text-xs text-muted-foreground'>
            Capital inmovilizado según días desde la última salida o recepción
          </p>
        </div>
        <div className='flex items-center gap-3 text-xs'>
          <span className='text-muted-foreground'>Total evaluado:</span>
          <span className='font-bold tabular-nums text-foreground'>
            {nf(totalUnits)} uds
          </span>
          <span className='font-bold tabular-nums text-primary'>
            {cop(displayTotalAmount)}
          </span>
        </div>
      </div>

      {/* Grid of 4 Aging Columns */}
      <div className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
        {buckets.map((b) => {
          const heightPct = Math.max(12, Math.round((b.units / maxUnits) * 100))
          const isSelected = selectedKey === b.key
          const isDimmed = selectedKey !== null && selectedKey !== undefined && !isSelected
          const unitPct = totalUnits > 0 ? ((b.units / totalUnits) * 100).toFixed(1) : '0'

          return (
            <button
              key={b.key}
              type='button'
              onClick={() => {
                if (onSelectBucket) {
                  onSelectBucket(isSelected ? null : b.key)
                }
              }}
              className={`group flex flex-col justify-between rounded-lg border p-3 text-start transition-all cursor-pointer ${
                isSelected
                  ? 'ring-2 ring-primary border-primary bg-muted/40 shadow-sm'
                  : isDimmed
                    ? 'opacity-50 hover:opacity-100 bg-background'
                    : 'bg-background hover:bg-muted/30'
              }`}
            >
              {/* Header */}
              <div className='w-full'>
                <div className='flex items-center justify-between'>
                  <span className='text-xs font-semibold text-foreground'>
                    {b.rangeText}
                  </span>
                  <span
                    className='size-2.5 rounded-full shrink-0'
                    style={{ backgroundColor: b.color }}
                  />
                </div>
                <span className='text-[10px] text-muted-foreground block truncate'>
                  {b.label}
                </span>
              </div>

              {/* Visual Vertical Bar Container */}
              <div className='my-3 flex h-24 w-full items-end rounded-md bg-muted/40 p-1.5'>
                <div
                  className='w-full rounded-sm transition-all duration-300'
                  style={{
                    height: `${heightPct}%`,
                    backgroundColor: b.color,
                  }}
                />
              </div>

              {/* Data & Financial Breakdown */}
              <div className='w-full space-y-1 text-xs'>
                <div className='flex items-baseline justify-between'>
                  <span className='text-base font-bold tabular-nums text-foreground'>
                    {nf(b.units)} <span className='text-[10px] font-normal'>uds</span>
                  </span>
                  <span className='text-[10px] text-muted-foreground tabular-nums'>
                    {unitPct}%
                  </span>
                </div>
                <div className='flex items-center justify-between border-t pt-1'>
                  <span className='text-[10px] text-muted-foreground'>
                    {b.partidasCount} partidas
                  </span>
                  <span className='font-semibold tabular-nums text-foreground text-[11px]'>
                    {cop(b.valueCOP ?? b.valueUSD)}
                  </span>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
