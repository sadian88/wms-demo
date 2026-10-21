import { cn } from '@/lib/utils'
import { TONE, type Tone } from '@/features/wms/components/kit'

export interface AgingBucketData {
  key: string
  /** Texto corto del tramo, p. ej. «60–89 d». */
  label: string
  /** Cantidad de partidas en el tramo. */
  partidas: number
  tone: Tone
}

/**
 * Barra única que resume cuántas partidas hay en cada tramo de días sin salida.
 * Solo informa: no filtra ni abre nada.
 */
export function AgingChart({
  buckets,
  className,
}: {
  buckets: AgingBucketData[]
  className?: string
}) {
  const total = buckets.reduce((sum, b) => sum + b.partidas, 0)
  const summary = buckets.map((b) => `${b.label}: ${b.partidas}`).join(', ')

  return (
    <div className={cn('rounded-xl border bg-card p-4 sm:p-5', className)}>
      <div className='flex items-baseline justify-between gap-3'>
        <h2 className='font-semibold'>Partidas por días sin salida</h2>
        <span className='text-sm text-muted-foreground tabular-nums'>
          {total} en total
        </span>
      </div>

      <div
        role='img'
        aria-label={`Partidas por días sin salida. ${summary}`}
        className='mt-3 flex h-3 gap-0.5 overflow-hidden rounded-full bg-muted'
      >
        {buckets
          .filter((b) => b.partidas > 0)
          .map((b) => (
            <div
              key={b.key}
              className={cn('h-full min-w-2', TONE[b.tone].bar)}
              style={{ flexGrow: b.partidas, flexBasis: 0 }}
            />
          ))}
      </div>

      <ul className='mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4'>
        {buckets.map((b) => (
          <li key={b.key} className='flex items-center gap-2 text-sm'>
            <span
              aria-hidden
              className={cn('size-2 shrink-0 rounded-full', TONE[b.tone].dot)}
            />
            <span className='text-muted-foreground'>{b.label}</span>
            <span className='ms-auto font-semibold tabular-nums sm:ms-0'>
              {b.partidas}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
