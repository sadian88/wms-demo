// eslint-disable-next-line react-refresh/only-export-components
export const nf = (n: number) => n.toLocaleString('es-CL')

// eslint-disable-next-line react-refresh/only-export-components
export const cop = (n: number) =>
  n.toLocaleString('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  })

// eslint-disable-next-line react-refresh/only-export-components
export const usd = cop

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}) {
  return (
    <div className='flex flex-wrap items-center justify-between gap-3'>
      <div>
        <h1 className='text-xl font-semibold tracking-tight'>{title}</h1>
        {subtitle && (
          <p className='text-xs text-muted-foreground'>{subtitle}</p>
        )}
      </div>
      {actions && <div className='flex items-center gap-2'>{actions}</div>}
    </div>
  )
}

export function KpiCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string
  value: string
  sub?: string
  tone?: string
}) {
  return (
    <div className='rounded-lg border bg-card p-4'>
      <div className='text-xs text-muted-foreground'>{label}</div>
      <div className={`mt-0.5 text-2xl font-semibold tabular-nums ${tone ?? ''}`}>
        {value}
      </div>
      {sub && <div className='mt-0.5 text-xs text-muted-foreground'>{sub}</div>}
    </div>
  )
}

export function EmptyState({ text }: { text: string }) {
  return (
    <div className='p-6 text-center text-sm text-muted-foreground'>{text}</div>
  )
}

