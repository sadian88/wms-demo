import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { StockState } from '@/features/wms/domain/inventory'
import { nf } from '@/features/wms/screens/ui-helpers'

// eslint-disable-next-line react-refresh/only-export-components
export const STOCK_STATE_COLORS: Record<
  StockState,
  { bg: string; fill: string; label: string }
> = {
  disponible: {
    bg: 'bg-emerald-500',
    fill: '#10b981',
    label: 'Disponible',
  },
  reservado: {
    bg: 'bg-blue-600',
    fill: '#2563eb',
    label: 'Reservado',
  },
  danado: {
    bg: 'bg-rose-500',
    fill: '#f43f5e',
    label: 'Dañado',
  },
  reclamo: {
    bg: 'bg-amber-500',
    fill: '#f59e0b',
    label: 'En reclamo',
  },
  transito: {
    bg: 'bg-slate-500',
    fill: '#64748b',
    label: 'En tránsito',
  },
}

interface StockCompositionBarProps {
  qty: Record<StockState, number>
  totalPhysical?: number
  height?: 'xs' | 'sm' | 'md' | 'lg'
  showLabels?: boolean
  className?: string
}

export function StockCompositionBar({
  qty,
  totalPhysical,
  height = 'sm',
  showLabels = false,
  className = '',
}: StockCompositionBarProps) {
  const total =
    totalPhysical !== undefined
      ? totalPhysical
      : Object.values(qty).reduce((acc, v) => acc + (v || 0), 0)

  const hClass = {
    xs: 'h-1.5',
    sm: 'h-2.5',
    md: 'h-3.5',
    lg: 'h-5',
  }[height]

  if (total <= 0) {
    return (
      <div
        className={`w-full overflow-hidden rounded-full bg-muted/60 ${hClass} ${className}`}
        title='Sin stock físico'
      />
    )
  }

  const states: StockState[] = [
    'disponible',
    'reservado',
    'danado',
    'reclamo',
    'transito',
  ]

  return (
    <TooltipProvider delayDuration={150}>
      <div className={`w-full space-y-1.5 ${className}`}>
        <div
          className={`flex w-full overflow-hidden rounded-full bg-muted/50 ${hClass}`}
        >
          {states.map((state) => {
            const count = qty[state] ?? 0
            if (count <= 0) return null
            const pct = (count / total) * 100
            const info = STOCK_STATE_COLORS[state]

            return (
              <Tooltip key={state}>
                <TooltipTrigger asChild>
                  <div
                    style={{ width: `${pct}%`, backgroundColor: info.fill }}
                    className='h-full transition-all hover:opacity-90 cursor-default'
                  />
                </TooltipTrigger>
                <TooltipContent side='top' className='text-xs'>
                  <div className='flex items-center gap-1.5 font-medium'>
                    <span
                      className='size-2 rounded-full'
                      style={{ backgroundColor: info.fill }}
                    />
                    <span>{info.label}:</span>
                    <span className='font-bold tabular-nums'>
                      {nf(count)} uds
                    </span>
                    <span className='text-muted-foreground'>
                      ({pct.toFixed(0)}%)
                    </span>
                  </div>
                </TooltipContent>
              </Tooltip>
            )
          })}
        </div>

        {showLabels && (
          <div className='flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground'>
            {states.map((state) => {
              const count = qty[state] ?? 0
              if (count <= 0) return null
              const info = STOCK_STATE_COLORS[state]
              const pct = ((count / total) * 100).toFixed(0)
              return (
                <div key={state} className='flex items-center gap-1.5'>
                  <span
                    className='size-2 rounded-full shrink-0'
                    style={{ backgroundColor: info.fill }}
                  />
                  <span>
                    {info.label}:{' '}
                    <strong className='text-foreground'>{nf(count)}</strong> (
                    {pct}%)
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}
