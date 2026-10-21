import { Inbox } from 'lucide-react'
import { cn } from '@/lib/utils'

// eslint-disable-next-line react-refresh/only-export-components
export const nf = (n: number) => n.toLocaleString('es-CO')

// eslint-disable-next-line react-refresh/only-export-components
export const cop = (n: number) =>
  n.toLocaleString('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  })

// eslint-disable-next-line react-refresh/only-export-components
export const usd = cop

/** Fecha corta legible: 2026-10-20 → 20 oct. */
// eslint-disable-next-line react-refresh/only-export-components
export function shortDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  if (!y || !m || !d) return iso
  return new Date(y, m - 1, d).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
  })
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string
  /** Una línea como máximo. Si el título ya lo dice todo, no se usa. */
  subtitle?: string
  actions?: React.ReactNode
}) {
  return (
    <div className='flex flex-wrap items-end justify-between gap-3'>
      <div className='min-w-0'>
        <h1 className='text-xl font-semibold tracking-tight sm:text-2xl'>
          {title}
        </h1>
        {subtitle && (
          <p className='mt-0.5 text-sm text-muted-foreground'>{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className='flex flex-wrap items-center gap-2'>{actions}</div>
      )}
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
    <div className='rounded-xl border bg-card p-4'>
      <div className='text-sm text-muted-foreground'>{label}</div>
      <div
        className={cn(
          'mt-1 text-2xl font-semibold tracking-tight tabular-nums',
          tone
        )}
      >
        {value}
      </div>
      {sub && <div className='mt-0.5 text-sm text-muted-foreground'>{sub}</div>}
    </div>
  )
}

export function EmptyState({
  text,
  title,
  icon: Icon = Inbox,
  action,
}: {
  text: string
  title?: string
  icon?: React.ElementType
  action?: React.ReactNode
}) {
  return (
    <div className='flex flex-col items-center gap-2 px-4 py-10 text-center'>
      <div className='flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground'>
        <Icon className='size-5' />
      </div>
      {title && <div className='text-sm font-medium'>{title}</div>}
      <p className='max-w-sm text-sm text-muted-foreground'>{text}</p>
      {action}
    </div>
  )
}
