import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Stepper } from '@/features/wms/components/kit'

/** Clases del DialogContent para los flujos por pasos: cabecera, cuerpo con scroll y pie fijos. */
export const STEP_DIALOG_CLASS =
  'flex max-h-[92dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl'

/** Botones grandes en móvil (≥ 44 px) y normales en escritorio. */
export const BTN = 'h-11 sm:h-10'

/**
 * Estructura común de un diálogo por pasos. Va dentro de un `DialogContent`;
 * el estado del flujo vive en el componente que lo usa, así que se reinicia
 * solo cuando el diálogo se cierra y se desmonta.
 */
export function StepLayout({
  title,
  description,
  steps,
  current,
  back,
  stackBack,
  hint,
  actions,
  children,
}: {
  title: string
  description: string
  steps: string[]
  current: number
  /** Botón «Atrás», junto a las acciones. */
  back?: React.ReactNode
  /** En móvil, lleva «Atrás» a la fila del texto para dejar el ancho a varias acciones. */
  stackBack?: boolean
  /** Texto breve del pie: el total, o por qué no se puede avanzar. */
  hint?: React.ReactNode
  actions: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <>
      <DialogHeader className='gap-3 border-b px-5 py-4 pe-12 text-start'>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription className='sr-only'>{description}</DialogDescription>
        <Stepper steps={steps} current={current} />
      </DialogHeader>
      <div className='min-h-0 flex-1 overflow-y-auto px-5 py-4'>{children}</div>
      <div className='flex flex-col gap-3 border-t px-5 py-3 sm:flex-row sm:items-center'>
        {(hint || (back && stackBack)) && (
          <div className='flex min-w-0 flex-1 items-center gap-3'>
            {stackBack && <span className='sm:hidden'>{back}</span>}
            <div className='min-w-0 flex-1 text-sm'>{hint}</div>
          </div>
        )}
        <div className='flex items-center gap-2 sm:ms-auto'>
          {back && (
            <span className={cn(stackBack && 'max-sm:hidden')}>{back}</span>
          )}
          <div className='flex flex-1 gap-2 sm:flex-none [&>button]:flex-1 sm:[&>button]:flex-none'>
            {actions}
          </div>
        </div>
      </div>
    </>
  )
}

/** Opciones tipo botón (una sola elegible). Reemplaza a los select para listas cortas. */
export function ChipGroup<T extends string>({
  label,
  value,
  onChange,
  options,
  required,
  error,
}: {
  label: string
  value: T | null
  onChange: (v: T) => void
  options: T[]
  required?: boolean
  error?: string
}) {
  const labelId = `chips-${label.replace(/\W+/g, '-').toLowerCase()}`
  return (
    <div className='space-y-1.5'>
      <span id={labelId} className='text-sm font-medium'>
        {label}
        {required && <span className='text-danger'> *</span>}
      </span>
      <div
        role='radiogroup'
        aria-labelledby={labelId}
        className='flex flex-wrap gap-2'
      >
        {options.map((o) => {
          const active = o === value
          return (
            <button
              key={o}
              type='button'
              role='radio'
              aria-checked={active}
              onClick={() => onChange(o)}
              className={cn(
                'flex h-11 items-center gap-1.5 rounded-lg border px-4 text-sm font-medium transition-colors sm:h-10',
                active
                  ? 'border-primary bg-info-soft font-semibold text-info-ink'
                  : 'bg-card text-foreground hover:bg-accent'
              )}
            >
              {active && <Check className='size-4' />}
              {o}
            </button>
          )
        })}
      </div>
      {error && <span className='block text-sm text-danger-ink'>{error}</span>}
    </div>
  )
}
