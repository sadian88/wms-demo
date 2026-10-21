import { ArrowDownRight, ArrowUpRight, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TONE, type Tone } from '@/features/wms/components/kit'

interface KpiDelta {
  /** Variación en %, con signo. */
  pct: number
  /** Contra qué se compara: «7 días previos». */
  versus: string
}

export interface KpiTileProps {
  label: string
  value: string
  /** Unidad pequeña junto a la cifra («unidades», «pedidos»). */
  unit?: string
  hint?: string
  icon: React.ElementType
  /** Color del ícono y de la cifra cuando el estado importa. */
  tone?: Tone
  delta?: KpiDelta | null
  /** Serie corta para la línea de tendencia. */
  trend?: number[]
  /** Si existe, la tarjeta es un botón. */
  onSelect?: () => void
}

/** Línea mínima de tendencia: sin ejes, el último punto marcado. */
function Sparkline({ values }: { values: number[] }) {
  const w = 72
  const h = 28
  const pad = 3
  const max = Math.max(...values, 1)
  const step = values.length > 1 ? (w - pad * 2) / (values.length - 1) : 0
  const pts = values.map((v, i) => [
    pad + i * step,
    h - pad - (v / max) * (h - pad * 2),
  ])
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x},${y}`).join(' ')
  const [lx, ly] = pts[pts.length - 1]
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      aria-hidden
      className='hidden shrink-0 overflow-visible sm:block'
    >
      <path
        d={d}
        fill='none'
        className='stroke-muted-foreground/40'
        strokeWidth={2}
        strokeLinecap='round'
        strokeLinejoin='round'
      />
      <circle
        cx={lx}
        cy={ly}
        r={3}
        className='fill-viz-1 stroke-card'
        strokeWidth={2}
      />
    </svg>
  )
}

function DeltaBadge({ delta }: { delta: KpiDelta }) {
  const up = delta.pct >= 0
  const Icon = up ? ArrowUpRight : ArrowDownRight
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 text-sm font-medium',
        up ? TONE.success.text : TONE.danger.text
      )}
    >
      <Icon className='size-4' aria-hidden />
      {up ? '+' : '−'}
      {Math.abs(Math.round(delta.pct)).toLocaleString('es-CO')} %
      <span className='sr-only'> frente a {delta.versus}</span>
    </span>
  )
}

/**
 * Tarjeta de cifra al estilo de un panel de tienda en línea: ícono, valor,
 * variación frente al período anterior y tendencia. El estado se dice con
 * texto y signo además del color.
 */
export function KpiTile({
  label,
  value,
  unit,
  hint,
  icon: Icon,
  tone,
  delta,
  trend,
  onSelect,
}: KpiTileProps) {
  const toneText = tone && tone !== 'neutral' ? TONE[tone].text : ''
  const body = (
    <>
      <div className='flex items-center gap-2 text-sm text-muted-foreground'>
        <span
          className={cn(
            'flex size-7 shrink-0 items-center justify-center rounded-lg',
            tone ? TONE[tone].soft : TONE.info.soft
          )}
        >
          <Icon className='size-4' aria-hidden />
        </span>
        <span className='min-w-0 flex-1 truncate'>{label}</span>
        {onSelect && (
          <ChevronRight className='size-4 shrink-0 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5' />
        )}
      </div>
      <div className='mt-2 flex items-end justify-between gap-2'>
        <div className='min-w-0'>
          <div
            className={cn(
              'flex items-baseline gap-1.5 text-2xl font-semibold tracking-tight',
              toneText
            )}
          >
            <span className='truncate'>{value}</span>
            {unit && (
              <span className='text-sm font-normal text-muted-foreground'>
                {unit}
              </span>
            )}
          </div>
          <div className='mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground'>
            {delta && <DeltaBadge delta={delta} />}
            {hint && (
              <span className={cn('line-clamp-1', toneText)}>{hint}</span>
            )}
          </div>
        </div>
        {trend && trend.length > 1 && <Sparkline values={trend} />}
      </div>
    </>
  )
  const cls = 'group min-w-0 rounded-xl border bg-card p-3.5 text-start'
  return onSelect ? (
    <button
      type='button'
      onClick={onSelect}
      className={cn(
        cls,
        'transition-colors outline-none hover:bg-accent focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50'
      )}
    >
      {body}
    </button>
  ) : (
    <div className={cls}>{body}</div>
  )
}
