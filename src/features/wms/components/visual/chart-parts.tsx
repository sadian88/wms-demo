import { cn } from '@/lib/utils'

interface TooltipRow {
  label: string
  value: string
  /** Color de la marca (línea corta) que identifica la serie. */
  color?: string
}

/**
 * Lectura flotante de los gráficos. Primero el valor, después el nombre; la
 * serie se identifica con una línea corta de su color, nunca con texto de color.
 */
export function ChartTooltipCard({
  title,
  rows,
  className,
}: {
  title?: string
  rows: TooltipRow[]
  className?: string
}) {
  return (
    <div
      className={cn(
        'min-w-36 rounded-lg border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md',
        className
      )}
    >
      {title && <div className='mb-1 font-medium'>{title}</div>}
      <ul className='space-y-1'>
        {rows.map((r) => (
          <li key={r.label} className='flex items-center gap-2'>
            {r.color && (
              <span
                aria-hidden
                className='h-0.5 w-3 shrink-0 rounded-full'
                style={{ background: r.color }}
              />
            )}
            <span className='font-semibold tabular-nums'>{r.value}</span>
            <span className='text-muted-foreground'>{r.label}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Tabla equivalente del gráfico para lectores de pantalla (la lectura nunca depende del hover). */
export function ChartTable({
  caption,
  head,
  rows,
}: {
  caption: string
  head: string[]
  rows: (string | number)[][]
}) {
  return (
    <table className='sr-only'>
      <caption>{caption}</caption>
      <thead>
        <tr>
          {head.map((h) => (
            <th key={h} scope='col'>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            {r.map((c, j) => (
              <td key={j}>{c}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
