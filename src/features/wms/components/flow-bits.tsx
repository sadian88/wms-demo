import { useState } from 'react'
import { Minus, Plus, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TONE, type Tone } from '@/features/wms/components/kit'
import { CategoryAvatar } from '@/features/wms/components/visual/category-icons'
import type { SkuItem } from '@/features/wms/domain/inventory'

/* Piezas pequeñas compartidas por los flujos de recepción y control de pérdidas. */

const FEMININE_UNITS = new Set(['caja', 'tira', 'unidad', 'bolsa', 'pieza'])
const INVARIABLE_UNITS = new Set(['m²', 'm', 'kg', 'g'])

function pluralOf(unit: string): string {
  const u = unit.toLowerCase()
  if (INVARIABLE_UNITS.has(u)) return u
  if (u === 'unidad') return 'unidades'
  if (/[aeiou]$/.test(u)) return `${u}s`
  return `${u}es`
}

/** Nombre de la unidad según la cantidad: «caja», «cajas», «sacos». */
// eslint-disable-next-line react-refresh/only-export-components
export function unitWord(qty: number, sku?: SkuItem | null): string {
  if (!sku) return qty === 1 ? 'unidad' : 'unidades'
  return qty === 1 ? sku.unitMeasure.toLowerCase() : pluralOf(sku.unitMeasure)
}

/** «1 caja», «18 cajas», «6 sacos». Usa la unidad del producto. */
// eslint-disable-next-line react-refresh/only-export-components
export function unitQty(qty: number, sku?: SkuItem | null): string {
  return `${qty.toLocaleString('es-CO')} ${unitWord(qty, sku)}`
}

/** «dañada(s)» o «dañado(s)» según el género de la unidad. */
// eslint-disable-next-line react-refresh/only-export-components
export function damagedWord(qty: number, sku?: SkuItem | null): string {
  const feminine = !sku || FEMININE_UNITS.has(sku.unitMeasure.toLowerCase())
  const base = feminine ? 'dañada' : 'dañado'
  return qty === 1 ? base : `${base}s`
}

/** Sin tildes y en minúscula, para buscar «ceramica» y encontrar «Cerámica». */
function normalize(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

/** Contador grande con − y +, pensado para dedos con guantes. */
export function QtyStepper({
  id,
  label,
  hint,
  value,
  onChange,
  max,
  tone,
}: {
  id: string
  label: string
  hint?: string
  value: number
  onChange: (next: number) => void
  max?: number
  tone?: Tone
}) {
  const clamp = (n: number) =>
    Math.max(0, max !== undefined ? Math.min(max, n) : n)
  return (
    <div>
      <div className='flex items-center gap-2'>
        {tone && (
          <span
            className={cn('size-2 shrink-0 rounded-full', TONE[tone].dot)}
          />
        )}
        <label htmlFor={id} className='text-sm font-medium'>
          {label}
        </label>
      </div>
      <div className='mt-1.5 flex items-center gap-2'>
        <Button
          type='button'
          variant='outline'
          className='size-10 shrink-0'
          aria-label={`Quitar una: ${label}`}
          disabled={value <= 0}
          onClick={() => onChange(clamp(value - 1))}
        >
          <Minus className='size-4' />
        </Button>
        <Input
          id={id}
          inputMode='numeric'
          autoComplete='off'
          className='h-10 min-w-0 flex-1 text-center font-semibold tabular-nums'
          value={value}
          onFocus={(e) => e.target.select()}
          onChange={(e) => {
            const n = parseInt(e.target.value.replace(/\D/g, ''), 10)
            onChange(clamp(Number.isNaN(n) ? 0 : n))
          }}
        />
        <Button
          type='button'
          variant='outline'
          className='size-10 shrink-0'
          aria-label={`Agregar una: ${label}`}
          disabled={max !== undefined && value >= max}
          onClick={() => onChange(clamp(value + 1))}
        >
          <Plus className='size-4' />
        </Button>
      </div>
      {hint && <p className='mt-1 text-sm text-muted-foreground'>{hint}</p>}
    </div>
  )
}

export interface PickerItem {
  id: string
  title: string
  meta?: string
  category?: string
}

/** Buscador de una lista corta (productos, partidas). Al elegir queda una sola fila con «Cambiar». */
export function ItemPicker({
  label,
  required,
  items,
  value,
  onChange,
  placeholder = 'Buscar por nombre o código',
  emptyText = 'No hay resultados. Revisa el nombre o el código.',
}: {
  label: string
  required?: boolean
  items: PickerItem[]
  value: string
  onChange: (id: string) => void
  placeholder?: string
  emptyText?: string
}) {
  const [query, setQuery] = useState('')
  const labelId = `picker-${label.replace(/\W+/g, '-').toLowerCase()}`
  const selected = items.find((i) => i.id === value)

  const q = normalize(query.trim())
  const found = items.filter(
    (i) =>
      q === '' || normalize(`${i.title} ${i.meta ?? ''} ${i.id}`).includes(q)
  )
  // Sin búsqueda se muestran pocos para no alargar la pantalla del celular.
  const shown = found.slice(0, q === '' ? 4 : 6)

  const row = (item: PickerItem) => (
    <>
      <CategoryAvatar category={item.category ?? ''} size='sm' />
      <span className='min-w-0 flex-1'>
        <span className='line-clamp-2 block text-sm font-medium'>
          {item.title}
        </span>
        {item.meta && (
          <span className='line-clamp-2 block text-sm text-muted-foreground'>
            {item.meta}
          </span>
        )}
      </span>
    </>
  )

  return (
    <div role='group' aria-labelledby={labelId} className='space-y-1.5'>
      <span id={labelId} className='block text-sm font-medium'>
        {label}
        {required && <span className='text-danger'> *</span>}
      </span>
      {selected ? (
        <div className='flex items-center gap-3 rounded-md border bg-background p-2.5'>
          {row(selected)}
          <Button
            type='button'
            variant='ghost'
            className='h-10 shrink-0 px-2'
            onClick={() => {
              setQuery('')
              onChange('')
            }}
          >
            Cambiar
          </Button>
        </div>
      ) : (
        <>
          <div className='relative'>
            <Search className='pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' />
            <Input
              className='h-10 ps-9'
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder}
              aria-label={`Buscar: ${label}`}
              autoComplete='off'
            />
          </div>
          {shown.length === 0 ? (
            <p className='text-sm text-muted-foreground'>{emptyText}</p>
          ) : (
            <ul className='divide-y overflow-hidden rounded-md border'>
              {shown.map((item) => (
                <li key={item.id}>
                  <button
                    type='button'
                    onClick={() => onChange(item.id)}
                    className='flex min-h-10 w-full items-center gap-3 px-3 py-2 text-start transition-colors hover:bg-accent/60'
                  >
                    {row(item)}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {found.length > shown.length && (
            <p className='text-sm text-muted-foreground'>
              Hay {found.length - shown.length} más. Escribe para afinar la
              búsqueda.
            </p>
          )}
        </>
      )}
    </div>
  )
}
