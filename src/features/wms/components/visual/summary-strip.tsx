import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TONE, type Tone } from '@/features/wms/components/kit'

export interface SummaryItem {
  label: string
  value: string
  /** Unidad pequeña junto a la cifra («unidades», «pedidos»). */
  unit?: string
  hint?: string
  tone?: Tone
  /** Si existe, la celda es un botón que lleva a esa pantalla. */
  slug?: string
}

/**
 * Banda de cifras en un solo contenedor plano, como `StatStrip` pero con
 * unidad junto a la cifra, ayuda que puede ocupar dos líneas y celdas que
 * llevan a su pantalla. El estado se dice con texto además del color.
 */
export function SummaryStrip({
  items,
  onNavigate,
}: {
  items: SummaryItem[]
  onNavigate?: (slug: string) => void
}) {
  return (
    <div
      className={cn(
        'grid gap-px overflow-hidden rounded-xl border bg-border',
        items.length <= 2 && 'grid-cols-2',
        items.length === 3 && 'grid-cols-1 sm:grid-cols-3',
        items.length >= 4 && 'grid-cols-2 sm:grid-cols-4'
      )}
    >
      {items.map((it) => {
        const linked = Boolean(it.slug && onNavigate)
        const toneText =
          it.tone && it.tone !== 'neutral' ? TONE[it.tone].text : ''
        const body = (
          <>
            <div className='flex items-center justify-between gap-2 text-sm text-muted-foreground'>
              <span className='truncate'>{it.label}</span>
              {linked && (
                <ChevronRight className='size-4 shrink-0 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5' />
              )}
            </div>
            <div
              className={cn(
                'mt-1 flex items-baseline gap-1.5 text-2xl font-semibold tracking-tight tabular-nums',
                toneText
              )}
            >
              <span className='truncate'>{it.value}</span>
              {it.unit && (
                <span className='text-sm font-normal text-muted-foreground'>
                  {it.unit}
                </span>
              )}
            </div>
            {it.hint && (
              <div
                className={cn(
                  'mt-0.5 line-clamp-2 text-sm text-muted-foreground',
                  toneText
                )}
              >
                {it.hint}
              </div>
            )}
          </>
        )
        const cls = 'group min-w-0 bg-card p-4 text-start sm:p-5'
        return linked ? (
          <button
            key={it.label}
            type='button'
            onClick={() => onNavigate?.(it.slug!)}
            className={cn(cls, 'transition-colors hover:bg-accent')}
          >
            {body}
          </button>
        ) : (
          <div key={it.label} className={cls}>
            {body}
          </div>
        )
      })}
    </div>
  )
}
