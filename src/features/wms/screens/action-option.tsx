import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Opción de acción con título y una línea que explica qué hace.
 * Se usa en hojas y diálogos donde el usuario elige entre varias salidas.
 */
export function ActionOption({
  title,
  description,
  icon: Icon,
  danger,
  onClick,
}: {
  title: string
  description: string
  icon?: LucideIcon
  danger?: boolean
  onClick: () => void
}) {
  return (
    <button
      type='button'
      onClick={onClick}
      className='flex min-h-14 w-full items-start gap-3 rounded-xl border bg-card p-4 text-start transition-colors outline-none hover:bg-accent focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50'
    >
      {Icon && (
        <Icon
          aria-hidden
          className={cn(
            'mt-0.5 size-5 shrink-0',
            danger ? 'text-danger-ink' : 'text-muted-foreground'
          )}
        />
      )}
      <span className='min-w-0'>
        <span className='block font-medium'>{title}</span>
        <span className='block text-sm text-muted-foreground'>
          {description}
        </span>
      </span>
    </button>
  )
}
