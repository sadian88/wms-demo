import { Fragment, useRef, useState } from 'react'
import {
  Camera,
  Check,
  ChevronRight,
  Loader2,
  X,
  type LucideIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { compressImage } from '@/lib/image'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

/**
 * Kit visual del WMS. Reglas de uso (docs/DESIGN.md):
 * - Superficies planas: blanco sobre alabastro, borde de 1px, sin sombras.
 * - Una pantalla = encabezado + una banda de resumen + lista. Nada más por defecto.
 * - El color solo comunica estado (verde = bien, ámbar = atención, coral = crítico).
 * - Texto base de 14px; nunca por debajo de 12px.
 */

export type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info'

// eslint-disable-next-line react-refresh/only-export-components
export const TONE: Record<
  Tone,
  { dot: string; pill: string; text: string; bar: string; soft: string }
> = {
  neutral: {
    dot: 'bg-muted-foreground/50',
    pill: 'bg-muted text-muted-foreground',
    text: 'text-muted-foreground',
    bar: 'bg-muted-foreground/40',
    soft: 'bg-muted text-foreground',
  },
  success: {
    dot: 'bg-success',
    pill: 'bg-success-soft text-success-ink',
    text: 'text-success-ink',
    bar: 'bg-success',
    soft: 'bg-success-soft text-success-ink',
  },
  warning: {
    dot: 'bg-warning',
    pill: 'bg-warning-soft text-warning-ink',
    text: 'text-warning-ink',
    bar: 'bg-warning',
    soft: 'bg-warning-soft text-warning-ink',
  },
  danger: {
    dot: 'bg-danger',
    pill: 'bg-danger-soft text-danger-ink',
    text: 'text-danger-ink',
    bar: 'bg-danger',
    soft: 'bg-danger-soft text-danger-ink',
  },
  info: {
    dot: 'bg-info',
    pill: 'bg-info-soft text-info-ink',
    text: 'text-info-ink',
    bar: 'bg-info',
    soft: 'bg-info-soft text-info-ink',
  },
}

/** Etiqueta de estado: punto de color + texto. Nunca depende solo del color. */
export function StatusPill({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: Tone
  children: React.ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap',
        TONE[tone].pill,
        className
      )}
    >
      <span className={cn('size-1.5 rounded-full', TONE[tone].dot)} />
      {children}
    </span>
  )
}

/** Contenedor plano con título. Es el único tipo de «tarjeta» de las pantallas. */
export function Section({
  title,
  hint,
  action,
  children,
  className,
  flush = false,
  compact = false,
}: {
  title?: React.ReactNode
  hint?: React.ReactNode
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
  /** Sin relleno interno: para listas que llegan hasta el borde. */
  flush?: boolean
  /** Menos relleno, para tableros densos. */
  compact?: boolean
}) {
  return (
    <section className={cn('rounded-xl border bg-card', className)}>
      {(title || action) && (
        <header
          className={cn(
            'flex flex-wrap items-center justify-between gap-2 px-4 pt-4 sm:px-5 sm:pt-5',
            compact && 'px-3.5 pt-3.5 sm:px-4 sm:pt-4',
            flush && 'border-b pb-3 sm:pb-4',
            flush && compact && 'pb-2.5 sm:pb-3'
          )}
        >
          <div className='min-w-0'>
            {title && (
              <h2 className='text-base font-semibold tracking-tight'>
                {title}
              </h2>
            )}
            {hint && <p className='text-sm text-muted-foreground'>{hint}</p>}
          </div>
          {action}
        </header>
      )}
      <div
        className={cn(
          !flush && (compact ? 'p-3.5 sm:p-4' : 'p-4 sm:p-5'),
          !flush && title && 'pt-3'
        )}
      >
        {children}
      </div>
    </section>
  )
}

export interface StatItem {
  label: string
  value: string
  hint?: string
  tone?: Tone
}

/**
 * Banda de resumen: 2 a 4 cifras en un solo contenedor, separadas por líneas.
 * Reemplaza las filas de tarjetas sueltas.
 */
export function StatStrip({ items }: { items: StatItem[] }) {
  // Con tres cifras, en el celular cada una va en una fila (nombre a la izquierda,
  // valor a la derecha): ocupa menos alto y los montos largos no se cortan.
  const rows = items.length === 3
  return (
    <div
      className={cn(
        'grid rounded-xl border bg-card',
        rows
          ? 'grid-cols-1 divide-y sm:grid-cols-3 sm:divide-x sm:divide-y-0'
          : items.length === 2
            ? 'grid-cols-2 divide-x'
            : 'grid-cols-2 divide-x divide-y sm:grid-cols-4 sm:divide-y-0'
      )}
    >
      {items.map((it) => (
        <div
          key={it.label}
          className={cn(
            'min-w-0 p-3.5 sm:p-5',
            rows &&
              'max-sm:grid max-sm:grid-cols-[1fr_auto] max-sm:items-center max-sm:gap-x-3'
          )}
        >
          <div className='text-sm leading-tight text-muted-foreground'>
            {it.label}
          </div>
          <div
            className={cn(
              'mt-1 text-xl font-semibold tracking-tight whitespace-nowrap tabular-nums sm:text-2xl',
              rows &&
                'max-sm:col-start-2 max-sm:row-span-2 max-sm:row-start-1 max-sm:mt-0',
              it.tone && it.tone !== 'neutral' && TONE[it.tone].text
            )}
          >
            {it.value}
          </div>
          {it.hint && (
            <div className='mt-0.5 text-sm leading-tight text-muted-foreground'>
              {it.hint}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export function ProgressBar({
  value,
  tone = 'info',
  className,
  size = 'md',
}: {
  /** 0 a 100 */
  value: number
  tone?: Tone
  className?: string
  size?: 'sm' | 'md'
}) {
  const pct = Math.max(0, Math.min(100, value))
  return (
    <div
      role='progressbar'
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn(
        'w-full overflow-hidden rounded-full bg-muted',
        size === 'sm' ? 'h-1.5' : 'h-2',
        className
      )}
    >
      <div
        className={cn('h-full rounded-full transition-all', TONE[tone].bar)}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

/** Filtros en forma de pestañas con contador. */
export function FilterTabs<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T
  onChange: (v: T) => void
  options: { id: T; label: string; count?: number }[]
  className?: string
}) {
  return (
    <div
      role='tablist'
      className={cn(
        '-mx-4 no-scrollbar flex gap-1 overflow-x-auto px-4 sm:mx-0 sm:px-0',
        className
      )}
    >
      {options.map((o) => {
        const active = o.id === value
        return (
          <button
            key={o.id}
            type='button'
            role='tab'
            aria-selected={active}
            onClick={() => onChange(o.id)}
            className={cn(
              'flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
              active
                ? 'border-primary bg-primary text-primary-foreground'
                : 'bg-card text-muted-foreground hover:bg-accent hover:text-foreground'
            )}
          >
            {o.label}
            {o.count !== undefined && (
              <span
                className={cn(
                  'rounded-full px-1.5 text-xs tabular-nums',
                  active ? 'bg-primary-foreground/20' : 'bg-muted'
                )}
              >
                {o.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

/** Pasos de un flujo. `current` es el índice (desde 0) del paso activo. */
export function Stepper({
  steps,
  current,
  className,
}: {
  steps: string[]
  current: number
  className?: string
}) {
  return (
    <ol className={cn('flex items-center gap-2', className)}>
      {steps.map((label, i) => {
        const done = i < current
        const active = i === current
        return (
          <Fragment key={label}>
            <li
              aria-current={active ? 'step' : undefined}
              className={cn(
                'flex items-center gap-2',
                active ? 'shrink-0' : 'min-w-0'
              )}
            >
              <span
                className={cn(
                  'flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                  done && 'bg-success text-white',
                  active && 'bg-primary text-primary-foreground',
                  !done && !active && 'bg-muted text-muted-foreground'
                )}
              >
                {done ? <Check className='size-3.5' /> : i + 1}
              </span>
              <span
                className={cn(
                  'text-sm whitespace-nowrap',
                  active ? 'font-semibold' : 'text-muted-foreground',
                  !active && 'max-sm:sr-only'
                )}
              >
                {label}
              </span>
            </li>
            {i < steps.length - 1 && (
              <li aria-hidden className='h-px min-w-3 flex-1 bg-border' />
            )}
          </Fragment>
        )
      })}
    </ol>
  )
}

/** Campo de formulario con etiqueta arriba y ayuda o error debajo. */
export function Field({
  label,
  hint,
  error,
  required,
  children,
  className,
}: {
  label: string
  hint?: string
  error?: string
  required?: boolean
  children: React.ReactNode
  className?: string
}) {
  return (
    <label className={cn('block space-y-1.5', className)}>
      <span className='text-sm font-medium'>
        {label}
        {required && <span className='text-danger'> *</span>}
      </span>
      {children}
      {error ? (
        <span className='block text-sm text-danger-ink'>{error}</span>
      ) : (
        hint && (
          <span className='block text-sm text-muted-foreground'>{hint}</span>
        )
      )}
    </label>
  )
}

/** Clases para <select> nativos con el mismo aspecto que los inputs. */
export const SELECT_CLASS =
  'h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50'

/** Aviso en línea. Una sola idea, una sola acción. */
export function Callout({
  tone = 'info',
  icon: Icon,
  title,
  children,
  action,
  className,
}: {
  tone?: Tone
  icon?: LucideIcon
  title: string
  children?: React.ReactNode
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div
      role={tone === 'danger' || tone === 'warning' ? 'alert' : 'status'}
      className={cn(
        'flex flex-wrap items-start gap-3 rounded-xl p-4',
        TONE[tone].soft,
        className
      )}
    >
      {Icon && <Icon className='mt-0.5 size-5 shrink-0' />}
      <div className='min-w-0 flex-1'>
        <div className='text-sm font-semibold'>{title}</div>
        {children && (
          <div className='mt-0.5 text-sm opacity-90'>{children}</div>
        )}
      </div>
      {action}
    </div>
  )
}

/** Fila de lista tocable: contenido a la izquierda, dato clave a la derecha. */
export function ListRow({
  onClick,
  selected,
  children,
  trailing,
  className,
}: {
  onClick?: () => void
  selected?: boolean
  children: React.ReactNode
  trailing?: React.ReactNode
  className?: string
}) {
  const Comp = onClick ? 'button' : 'div'
  return (
    <Comp
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      aria-current={selected ? 'true' : undefined}
      className={cn(
        'flex w-full items-center gap-3 px-4 py-3.5 text-start sm:px-5',
        onClick && 'transition-colors hover:bg-accent/60',
        selected && 'bg-accent',
        className
      )}
    >
      <div className='min-w-0 flex-1'>{children}</div>
      {trailing}
      {onClick && !trailing && (
        <ChevronRight className='size-4 shrink-0 text-muted-foreground' />
      )}
    </Comp>
  )
}

/** Par «dato — valor» para detalles. */
export function DefRow({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className='flex items-baseline justify-between gap-4 py-2 text-sm'>
      <dt className='text-muted-foreground'>{label}</dt>
      <dd className='text-end font-medium'>{children}</dd>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Fotos                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Captura de fotos desde la cámara del celular (o archivo en el computador).
 * Las imágenes se comprimen antes de guardarse.
 */
export function PhotoCapture({
  photos,
  onChange,
  max = 4,
  label = 'Agregar foto',
  required,
  className,
}: {
  photos: string[]
  onChange: (next: string[]) => void
  max?: number
  label?: string
  required?: boolean
  className?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setBusy(true)
    try {
      const room = max - photos.length
      const picked = Array.from(files).slice(0, Math.max(0, room))
      const next = await Promise.all(picked.map((f) => compressImage(f)))
      onChange([...photos, ...next])
    } catch {
      toast.error('No se pudo leer la foto. Intenta de nuevo.')
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {photos.map((src, i) => (
        <div key={i} className='relative'>
          <button
            type='button'
            onClick={() => setPreview(src)}
            className='block size-16 overflow-hidden rounded-lg border'
            aria-label={`Ver foto ${i + 1}`}
          >
            <img
              src={src}
              alt={`Foto ${i + 1}`}
              className='size-full object-cover'
            />
          </button>
          <button
            type='button'
            onClick={() => onChange(photos.filter((_, j) => j !== i))}
            className='absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-foreground text-background'
            aria-label={`Quitar foto ${i + 1}`}
          >
            <X className='size-3' />
          </button>
        </div>
      ))}
      {photos.length < max && (
        <Button
          type='button'
          variant='outline'
          className={cn(
            'h-16 gap-2 border-dashed px-4',
            required && photos.length === 0 && 'border-danger text-danger-ink'
          )}
          onClick={() => inputRef.current?.click()}
          disabled={busy}
        >
          {busy ? (
            <Loader2 className='size-5 animate-spin' />
          ) : (
            <Camera className='size-5' />
          )}
          {label}
        </Button>
      )}
      <input
        ref={inputRef}
        type='file'
        accept='image/*'
        capture='environment'
        multiple
        className='sr-only'
        onChange={(e) => void handleFiles(e.target.files)}
      />
      <PhotoLightbox src={preview} onClose={() => setPreview(null)} />
    </div>
  )
}

/** Miniaturas de solo lectura; al tocar una se abre en grande. */
export function PhotoStrip({
  photos,
  size = 'md',
}: {
  photos?: string[]
  size?: 'sm' | 'md'
}) {
  const [preview, setPreview] = useState<string | null>(null)
  if (!photos || photos.length === 0) return null
  return (
    <>
      <div className='flex flex-wrap gap-1.5'>
        {photos.map((src, i) => (
          <button
            key={i}
            type='button'
            onClick={() => setPreview(src)}
            className={cn(
              'overflow-hidden rounded-md border',
              size === 'sm' ? 'size-10' : 'size-14'
            )}
            aria-label={`Ver foto ${i + 1}`}
          >
            <img
              src={src}
              alt={`Foto ${i + 1}`}
              className='size-full object-cover'
            />
          </button>
        ))}
      </div>
      <PhotoLightbox src={preview} onClose={() => setPreview(null)} />
    </>
  )
}

function PhotoLightbox({
  src,
  onClose,
}: {
  src: string | null
  onClose: () => void
}) {
  return (
    <Dialog open={src !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className='sm:max-w-2xl'>
        <DialogHeader>
          <DialogTitle>Foto de soporte</DialogTitle>
          <DialogDescription className='sr-only'>
            Imagen ampliada
          </DialogDescription>
        </DialogHeader>
        {src && (
          <img
            src={src}
            alt='Foto de soporte'
            className='max-h-[70vh] w-full rounded-lg object-contain'
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
