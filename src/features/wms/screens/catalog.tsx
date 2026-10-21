import { useRef, useState } from 'react'
import { Calculator, ChevronRight, Plus, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useWms } from '@/context/wms-provider'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  Callout,
  Field,
  ListRow,
  SELECT_CLASS,
  StatStrip,
  StatusPill,
  type Tone,
} from '@/features/wms/components/kit'
import { CategoryAvatar } from '@/features/wms/components/visual/category-icons'
import {
  marginPct,
  type SkuItem,
  type StandardUnit,
} from '@/features/wms/domain/inventory'
import { suggestSku } from '@/features/wms/domain/invoicing'
import { EmptyState, PageHeader, cop, nf } from './ui-helpers'
import { conversionText, fmtNum, qtyText, unitName } from './unit-labels'

/* -------------------------------------------------------------------------- */
/*  Utilidades                                                                 */
/* -------------------------------------------------------------------------- */

const BASE_CATEGORIES = [
  'Porcelanatos',
  'Cerámicas',
  'Revestimientos',
  'Adhesivos y Morteros',
  'Químicos y Selladores',
  'Perfiles y Accesorios',
]

const BASE_UNITS: { value: StandardUnit; label: string }[] = [
  { value: 'Caja', label: 'Caja' },
  { value: 'Saco', label: 'Saco' },
  { value: 'Balde', label: 'Balde' },
  { value: 'Tira', label: 'Tira' },
  { value: 'Rollo', label: 'Rollo' },
  { value: 'Unidad', label: 'Unidad' },
  { value: 'Litro', label: 'Litro' },
  { value: 'kg', label: 'Kilogramo (kg)' },
  { value: 'm', label: 'Metro (m)' },
]

const EQUIV_UNITS: { value: StandardUnit; label: string }[] = [
  { value: 'm²', label: 'm²' },
  { value: 'kg', label: 'kg' },
  { value: 'm', label: 'm' },
  { value: 'Litro', label: 'Litros' },
  { value: 'Unidad', label: 'Unidades' },
]

/** Unidad y conversión que se proponen al elegir una categoría nueva. */
const CATEGORY_DEFAULTS: Record<
  string,
  { unit: StandardUnit; conv?: { unit: StandardUnit; factor: string } }
> = {
  Porcelanatos: { unit: 'Caja', conv: { unit: 'm²', factor: '1,44' } },
  Cerámicas: { unit: 'Caja', conv: { unit: 'm²', factor: '1,44' } },
  Revestimientos: { unit: 'Caja', conv: { unit: 'm²', factor: '1,44' } },
  'Adhesivos y Morteros': { unit: 'Saco', conv: { unit: 'kg', factor: '25' } },
  'Químicos y Selladores': { unit: 'Balde' },
  'Perfiles y Accesorios': { unit: 'Tira' },
}

const pct = (n: number) =>
  `${n.toLocaleString('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`

function marginTone(m: number): Tone {
  if (m >= 25) return 'success'
  if (m >= 10) return 'warning'
  return 'danger'
}

/** Número con coma o punto decimal. Devuelve NaN si no es un número. */
function parseDecimal(s: string): number {
  if (!s.trim()) return NaN
  return Number(s.trim().replace(',', '.'))
}

/** Número para un campo de texto: sin separador de miles y con coma decimal. */
const plainNum = (n: number) => String(Number(n.toFixed(2))).replace('.', ',')

/** Alto de los controles: cómodo con el dedo en móvil, compacto en escritorio. */
const CONTROL = 'h-11 sm:h-10'

const digitsOnly = (s: string) => s.replace(/\D/g, '')
const moneyInput = (digits: string) =>
  digits ? Number(digits).toLocaleString('es-CO') : ''

const ROW_COLS_WITH_COST =
  'md:grid-cols-[minmax(0,2.4fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.3fr)]'
const ROW_COLS_NO_COST =
  'md:grid-cols-[minmax(0,2.4fr)_minmax(0,1fr)_minmax(0,1.3fr)]'

/* -------------------------------------------------------------------------- */
/*  Pantalla                                                                   */
/* -------------------------------------------------------------------------- */

export function CatalogScreen() {
  const { skus, role, isReadOnly } = useWms()

  const canEdit = !isReadOnly && (role === 'ADM' || role === 'JB')
  const canSeeCost = role === 'ADM' || role === 'JB' || role === 'GER'

  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('ALL')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<SkuItem | null>(null)

  const categories = Array.from(new Set(skus.map((s) => s.category)))

  const q = query.trim().toLowerCase()
  const filtered = skus.filter((s) => {
    if (category !== 'ALL' && s.category !== category) return false
    if (!q) return true
    return `${s.sku} ${s.name} ${s.category}`.toLowerCase().includes(q)
  })

  const withConversion = skus.filter((s) => (s.conversions?.length ?? 0) > 0)
  const priced = skus.filter((s) => s.unitPrice > 0)
  const avgMargin =
    priced.length > 0
      ? priced.reduce((sum, s) => sum + marginPct(s), 0) / priced.length
      : 0

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }
  const openEdit = (s: SkuItem) => {
    setEditing(s)
    setFormOpen(true)
  }

  return (
    <div className='space-y-6'>
      <PageHeader
        title='Catálogo y conversiones'
        actions={
          canEdit ? (
            <Button onClick={openCreate} className='h-11 gap-2 sm:h-10'>
              <Plus />
              Nuevo producto
            </Button>
          ) : undefined
        }
      />

      <StatStrip
        items={[
          { label: 'Productos', value: nf(skus.length) },
          { label: 'Con conversión', value: nf(withConversion.length) },
          canSeeCost
            ? {
                label: 'Margen promedio',
                value: pct(avgMargin),
                tone: marginTone(avgMargin),
              }
            : { label: 'Categorías', value: nf(categories.length) },
        ]}
      />

      <ConversionCalculator skus={skus} />

      <div className='space-y-3'>
        <div className='flex flex-col gap-2 sm:flex-row'>
          <div className='relative flex-1'>
            <Search
              aria-hidden
              className='pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground'
            />
            <Input
              aria-label='Buscar producto'
              placeholder='Buscar por nombre o código'
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className='h-11 ps-9 sm:h-10'
            />
          </div>
          <select
            aria-label='Filtrar por categoría'
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={`${SELECT_CLASS} h-11 sm:h-10 sm:w-64`}
          >
            <option value='ALL'>Todas las categorías</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <section className='overflow-hidden rounded-xl border bg-card'>
          <div
            className={`hidden gap-4 border-b bg-muted/40 px-5 py-2.5 text-sm font-medium text-muted-foreground md:grid ${
              canSeeCost ? ROW_COLS_WITH_COST : ROW_COLS_NO_COST
            }`}
          >
            <span>Producto</span>
            <span>Precio de venta</span>
            {canSeeCost && <span>Costo</span>}
            {canSeeCost && <span>Margen</span>}
            <span>Conversión</span>
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              title='Sin resultados'
              text='Ningún producto coincide con la búsqueda. Prueba con otro nombre o código, o quita el filtro de categoría.'
              action={
                <Button
                  variant='outline'
                  onClick={() => {
                    setQuery('')
                    setCategory('ALL')
                  }}
                >
                  Quitar filtros
                </Button>
              }
            />
          ) : (
            <ul className='divide-y'>
              {filtered.map((s) => (
                <li key={s.sku}>
                  <ProductRow
                    sku={s}
                    canSeeCost={canSeeCost}
                    onEdit={canEdit ? () => openEdit(s) : undefined}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {formOpen && (
        <SkuFormDialog
          key={editing?.sku ?? 'nuevo'}
          sku={editing}
          onClose={() => setFormOpen(false)}
        />
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Fila de producto                                                           */
/* -------------------------------------------------------------------------- */

function ProductRow({
  sku: s,
  canSeeCost,
  onEdit,
}: {
  sku: SkuItem
  canSeeCost: boolean
  onEdit?: () => void
}) {
  const margin = marginPct(s)
  const conv = conversionText(s)
  const unit = unitName(s.unitMeasure)

  return (
    <ListRow onClick={onEdit}>
      {/* Móvil: filas apiladas */}
      <div className='flex items-start gap-3 md:hidden'>
        <CategoryAvatar category={s.category} size='md' />
        <div className='min-w-0 flex-1'>
          <div className='leading-snug font-medium'>{s.name}</div>
          <div className='font-mono text-xs text-muted-foreground'>{s.sku}</div>
          <div className='mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1'>
            <span className='font-semibold tabular-nums'>
              {cop(s.unitPrice)}
              <span className='font-normal text-muted-foreground'>
                {' '}
                / {unit}
              </span>
            </span>
            {canSeeCost && (
              <span className='text-muted-foreground tabular-nums'>
                Costo {cop(s.unitCost)}
              </span>
            )}
          </div>
          <div className='mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5'>
            {canSeeCost && (
              <StatusPill tone={marginTone(margin)}>
                Margen {pct(margin)}
              </StatusPill>
            )}
            <span className='text-sm text-muted-foreground'>
              {conv ?? 'Sin conversión'}
            </span>
          </div>
        </div>
      </div>

      {/* Escritorio: columnas */}
      <div
        className={`hidden items-center gap-4 md:grid ${
          canSeeCost ? ROW_COLS_WITH_COST : ROW_COLS_NO_COST
        }`}
      >
        <div className='flex min-w-0 items-center gap-3'>
          <CategoryAvatar category={s.category} size='md' />
          <div className='min-w-0'>
            <div className='line-clamp-2 leading-snug font-medium'>
              {s.name}
            </div>
            <div className='font-mono text-xs text-muted-foreground'>
              {s.sku}
            </div>
          </div>
        </div>
        <div className='tabular-nums'>
          <div className='font-semibold'>{cop(s.unitPrice)}</div>
          <div className='text-xs text-muted-foreground'>por {unit}</div>
        </div>
        {canSeeCost && (
          <div className='text-muted-foreground tabular-nums'>
            {cop(s.unitCost)}
          </div>
        )}
        {canSeeCost && (
          <div>
            <StatusPill tone={marginTone(margin)}>{pct(margin)}</StatusPill>
          </div>
        )}
        <div className={conv ? '' : 'text-muted-foreground'}>
          {conv ?? 'Sin conversión'}
        </div>
      </div>
    </ListRow>
  )
}

/* -------------------------------------------------------------------------- */
/*  Calculadora de conversión (plegable, cerrada por defecto)                  */
/* -------------------------------------------------------------------------- */

function ConversionCalculator({ skus }: { skus: SkuItem[] }) {
  const convertible = skus.filter((s) => (s.conversions?.[0]?.factor ?? 0) > 0)
  const [skuCode, setSkuCode] = useState('')
  const [entry, setEntry] = useState<{
    field: 'target' | 'base'
    value: string
  }>({ field: 'target', value: '' })

  const sku = convertible.find((s) => s.sku === skuCode) ?? convertible[0]
  if (!sku) return null

  const conv = sku.conversions![0]
  const factor = conv.factor
  const typed = parseDecimal(entry.value)
  const hasValue = Number.isFinite(typed) && typed > 0

  let boxes = 0
  let exactBase = 0
  let targetQty = 0
  if (hasValue) {
    if (entry.field === 'target') {
      targetQty = typed
      exactBase = typed / factor
    } else {
      exactBase = typed
      targetQty = typed * factor
    }
    boxes = Math.ceil(Number(exactBase.toFixed(6)))
  }
  const delivered = boxes * factor
  const extra = Number((delivered - targetQty).toFixed(2))

  const targetValue =
    entry.field === 'target' ? entry.value : hasValue ? plainNum(targetQty) : ''
  const baseValue =
    entry.field === 'base' ? entry.value : hasValue ? plainNum(exactBase) : ''

  return (
    <details className='group rounded-xl border bg-card'>
      <summary className='flex min-h-12 cursor-pointer list-none items-center gap-3 px-4 py-3 sm:px-5 [&::-webkit-details-marker]:hidden'>
        <Calculator className='size-5 text-muted-foreground' aria-hidden />
        <span className='flex-1 font-medium'>Calculadora de conversión</span>
        <ChevronRight
          aria-hidden
          className='size-4 text-muted-foreground transition-transform group-open:rotate-90'
        />
      </summary>

      <div className='space-y-4 border-t px-4 py-4 sm:px-5'>
        <Field label='Producto'>
          <select
            value={sku.sku}
            onChange={(e) => setSkuCode(e.target.value)}
            className={`${SELECT_CLASS} h-11`}
          >
            {convertible.map((s) => (
              <option key={s.sku} value={s.sku}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>

        <div className='grid grid-cols-2 gap-3'>
          <Field label={`Cantidad en ${unitName(conv.targetUnit, 2)}`}>
            <Input
              inputMode='decimal'
              placeholder='0'
              value={targetValue}
              onChange={(e) =>
                setEntry({ field: 'target', value: e.target.value })
              }
              className='h-11 tabular-nums'
            />
          </Field>
          <Field label={`Cantidad en ${unitName(sku.unitMeasure, 2)}`}>
            <Input
              inputMode='decimal'
              placeholder='0'
              value={baseValue}
              onChange={(e) =>
                setEntry({ field: 'base', value: e.target.value })
              }
              className='h-11 tabular-nums'
            />
          </Field>
        </div>

        {hasValue ? (
          <div className='rounded-lg bg-muted/50 p-4 text-sm'>
            <div>
              Despacha{' '}
              <strong className='text-lg font-semibold tabular-nums'>
                {qtyText(boxes, sku.unitMeasure)}
              </strong>{' '}
              <span className='text-muted-foreground'>
                = {fmtNum(delivered)} {unitName(conv.targetUnit, delivered)}
              </span>
            </div>
            <div className='mt-1 text-muted-foreground'>
              {extra > 0
                ? `Al redondear hacia arriba sobran ${fmtNum(extra)} ${conv.targetUnit}. `
                : 'Es una cantidad exacta, sin sobrante. '}
              Valor de venta: {cop(boxes * sku.unitPrice)}.
            </div>
          </div>
        ) : (
          <p className='text-sm text-muted-foreground'>
            Escribe una cantidad en {unitName(conv.targetUnit, 2)} o en{' '}
            {unitName(sku.unitMeasure, 2)} y verás el otro valor. Las{' '}
            {unitName(sku.unitMeasure, 2)} siempre se redondean hacia arriba.
          </p>
        )}
      </div>
    </details>
  )
}

/* -------------------------------------------------------------------------- */
/*  Alta y edición de producto                                                 */
/* -------------------------------------------------------------------------- */

function SkuFormDialog({
  sku,
  onClose,
}: {
  sku: SkuItem | null
  onClose: () => void
}) {
  const { skus, role, createSku, updateSkuCatalog } = useWms()
  const isNew = sku === null
  const firstConv = sku?.conversions?.[0]

  const [category, setCategory] = useState(sku?.category ?? 'Porcelanatos')
  const [skuOverride, setSkuOverride] = useState<string | null>(null)
  const [name, setName] = useState(sku?.name ?? '')
  const [unit, setUnit] = useState<StandardUnit>(sku?.unitMeasure ?? 'Caja')
  const [cost, setCost] = useState(sku ? String(sku.unitCost) : '')
  const [price, setPrice] = useState(sku ? String(sku.unitPrice) : '')
  const [discount, setDiscount] = useState(
    sku ? String(sku.maxDiscountPct) : '5'
  )
  const [hasConv, setHasConv] = useState(
    sku ? !!firstConv : !!CATEGORY_DEFAULTS.Porcelanatos.conv
  )
  const [convUnit, setConvUnit] = useState<StandardUnit>(
    firstConv?.targetUnit ?? CATEGORY_DEFAULTS.Porcelanatos.conv!.unit
  )
  const [factor, setFactor] = useState(
    firstConv
      ? plainNum(firstConv.factor)
      : CATEGORY_DEFAULTS.Porcelanatos.conv!.factor
  )
  const [requiresExpiry, setRequiresExpiry] = useState(
    sku?.requiresExpiry ?? false
  )
  const [confirmLoss, setConfirmLoss] = useState(false)
  const [attempted, setAttempted] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const lossRef = useRef<HTMLDivElement>(null)

  const allCategories = Array.from(
    new Set([...BASE_CATEGORIES, ...skus.map((s) => s.category)])
  )
  const suggested = suggestSku(
    category,
    skus.map((s) => s.sku)
  )
  const skuCode = sku ? sku.sku : (skuOverride ?? suggested)

  const costN = Number(cost) || 0
  const priceN = Number(price) || 0
  const discountN = parseDecimal(discount)
  const factorN = parseDecimal(factor)
  const margin = marginPct({ unitCost: costN, unitPrice: priceN })
  const belowCost = priceN > 0 && costN > 0 && priceN < costN
  const unitLabel = unitName(unit)
  const priceAtMaxDiscount =
    priceN > 0 && Number.isFinite(discountN)
      ? Math.round(priceN * (1 - discountN / 100))
      : 0

  const errors = {
    name: name.trim() ? '' : 'Escribe el nombre del producto.',
    code: skuCode.trim() ? '' : 'El código no puede quedar vacío.',
    cost: costN > 0 ? '' : 'Escribe el costo por ' + unitLabel + '.',
    price:
      priceN > 0 ? '' : 'Escribe el precio de venta por ' + unitLabel + '.',
    discount:
      Number.isFinite(discountN) && discountN >= 0 && discountN <= 100
        ? ''
        : 'Escribe un porcentaje entre 0 y 100.',
    factor:
      !hasConv || (Number.isFinite(factorN) && factorN > 0)
        ? ''
        : 'La cantidad debe ser mayor que cero.',
  }
  const hasErrors = Object.values(errors).some(Boolean)
  const lossBlocked = belowCost && !confirmLoss
  const showErr = (key: keyof typeof errors) => (attempted ? errors[key] : '')

  const onCategoryChange = (next: string) => {
    setCategory(next)
    if (!isNew) return
    setSkuOverride(null)
    const d = CATEGORY_DEFAULTS[next]
    if (d) {
      setUnit(d.unit)
      setHasConv(!!d.conv)
      if (d.conv) {
        setConvUnit(d.conv.unit)
        setFactor(d.conv.factor)
      }
    }
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setAttempted(true)
    if (hasErrors || lossBlocked) {
      // Lleva la vista al primer problema para que no quede fuera de pantalla.
      setTimeout(() => {
        const target = hasErrors
          ? formRef.current?.querySelector('[aria-invalid="true"]')
          : lossRef.current
        target?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      }, 50)
      return
    }

    const generated = `1 ${unitName(unit)} = ${fmtNum(factorN)} ${convUnit}`
    const keepsConv =
      firstConv &&
      firstConv.targetUnit === convUnit &&
      firstConv.factor === factorN
    const conversions = hasConv
      ? [
          {
            targetUnit: convUnit,
            factor: factorN,
            description: keepsConv ? firstConv.description : generated,
          },
          ...(sku?.conversions?.slice(1) ?? []),
        ]
      : []

    const data = {
      name: name.trim(),
      category,
      unitMeasure: unit,
      unitCost: costN,
      unitPrice: priceN,
      maxDiscountPct: discountN,
      requiresExpiry,
      conversions,
    }

    if (sku) {
      updateSkuCatalog(sku.sku, data)
      onClose()
    } else if (createSku({ sku: skuCode.trim().toUpperCase(), ...data })) {
      onClose()
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className='flex max-h-[calc(100dvh-2rem)] flex-col gap-0 p-0 sm:max-w-2xl'>
        <DialogHeader className='px-5 pt-5 pb-4'>
          <DialogTitle>
            {isNew ? 'Nuevo producto' : 'Editar producto'}
          </DialogTitle>
          <DialogDescription className='sr-only'>
            Datos, precios y conversión de unidades del producto.
          </DialogDescription>
        </DialogHeader>

        <form
          ref={formRef}
          onSubmit={submit}
          noValidate
          className='flex min-h-0 flex-1 flex-col'
        >
          <div className='flex-1 space-y-6 overflow-y-auto px-5 pb-5'>
            {/* Datos */}
            <section className='space-y-4'>
              <h3 className='font-semibold'>Datos</h3>
              <div className='grid gap-4 sm:grid-cols-2'>
                <Field label='Categoría' required>
                  <select
                    value={category}
                    onChange={(e) => onCategoryChange(e.target.value)}
                    className={cn(SELECT_CLASS, CONTROL)}
                  >
                    {allCategories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field
                  label='Código (SKU)'
                  hint={
                    !isNew
                      ? 'El código no se puede cambiar.'
                      : role === 'ADM'
                        ? 'Se genera solo. Puedes cambiarlo.'
                        : 'Se genera solo según la categoría.'
                  }
                  error={showErr('code')}
                >
                  <Input
                    value={skuCode}
                    readOnly={!isNew || role !== 'ADM'}
                    disabled={!isNew}
                    aria-invalid={!!showErr('code')}
                    onChange={(e) =>
                      setSkuOverride(e.target.value.toUpperCase())
                    }
                    className={cn('font-mono', CONTROL)}
                  />
                </Field>
              </div>
              <div className='grid gap-4 sm:grid-cols-[2fr_1fr]'>
                <Field label='Nombre' required error={showErr('name')}>
                  <Input
                    value={name}
                    aria-invalid={!!showErr('name')}
                    onChange={(e) => setName(e.target.value)}
                    placeholder='Ej. Porcelanato Blanco Satinado 60x60 cm'
                    className={CONTROL}
                  />
                </Field>
                <Field label='Unidad base'>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value as StandardUnit)}
                    className={cn(SELECT_CLASS, CONTROL)}
                  >
                    {BASE_UNITS.map((u) => (
                      <option key={u.value} value={u.value}>
                        {u.label}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            </section>

            {/* Precios */}
            <section className='space-y-4 border-t pt-5'>
              <h3 className='font-semibold'>
                Precios{' '}
                <span className='font-normal text-muted-foreground'>
                  (por {unitLabel})
                </span>
              </h3>
              <div className='grid grid-cols-2 gap-4 sm:grid-cols-3'>
                <Field label='Costo' required error={showErr('cost')}>
                  <Input
                    inputMode='numeric'
                    placeholder='0'
                    value={moneyInput(cost)}
                    aria-invalid={!!showErr('cost')}
                    onChange={(e) => setCost(digitsOnly(e.target.value))}
                    className={cn('tabular-nums', CONTROL)}
                  />
                </Field>
                <Field
                  label='Precio de venta'
                  required
                  error={showErr('price')}
                >
                  <Input
                    inputMode='numeric'
                    placeholder='0'
                    value={moneyInput(price)}
                    aria-invalid={!!showErr('price')}
                    onChange={(e) => setPrice(digitsOnly(e.target.value))}
                    className={cn('tabular-nums', CONTROL)}
                  />
                </Field>
                <Field
                  label='Descuento máximo (%)'
                  error={showErr('discount')}
                  className='max-sm:col-span-2'
                >
                  <Input
                    inputMode='decimal'
                    value={discount}
                    aria-invalid={!!showErr('discount')}
                    onChange={(e) => setDiscount(e.target.value)}
                    className={cn('tabular-nums', CONTROL)}
                  />
                </Field>
              </div>

              <div className='space-y-1 rounded-lg bg-muted/50 px-4 py-3'>
                <div className='flex items-center justify-between gap-3'>
                  <div>
                    <div className='text-sm font-medium'>Margen</div>
                    <div className='text-sm text-muted-foreground tabular-nums'>
                      {costN > 0 && priceN > 0
                        ? priceN >= costN
                          ? `Ganancia de ${cop(priceN - costN)} por ${unitLabel}`
                          : `Pérdida de ${cop(costN - priceN)} por ${unitLabel}`
                        : 'Escribe costo y precio para calcularlo'}
                    </div>
                  </div>
                  {costN > 0 && priceN > 0 && (
                    <StatusPill tone={marginTone(margin)}>
                      {pct(margin)}
                    </StatusPill>
                  )}
                </div>
                {priceAtMaxDiscount > 0 && !errors.discount && (
                  <div className='border-t pt-1 text-sm text-muted-foreground'>
                    Con el descuento máximo se vende a{' '}
                    <span className='font-medium text-foreground tabular-nums'>
                      {cop(priceAtMaxDiscount)}
                    </span>
                    {costN > 0 && priceAtMaxDiscount < costN && (
                      <span className='text-danger-ink'>
                        , por debajo del costo
                      </span>
                    )}
                    .
                  </div>
                )}
              </div>

              {belowCost && (
                <div ref={lossRef}>
                  <Callout
                    tone='danger'
                    title='El precio de venta es menor que el costo'
                  >
                    Cada {unitLabel} se vendería con pérdida. Corrige el precio
                    o confirma para guardarlo así.
                    <label className='mt-3 flex min-h-11 cursor-pointer items-center gap-3 font-medium'>
                      <input
                        type='checkbox'
                        checked={confirmLoss}
                        onChange={(e) => setConfirmLoss(e.target.checked)}
                        className='size-5 accent-danger'
                      />
                      Entiendo y quiero guardarlo así
                    </label>
                  </Callout>
                </div>
              )}
            </section>

            {/* Conversión */}
            <section className='space-y-4 border-t pt-5'>
              <div className='flex items-center justify-between gap-3'>
                <h3 className='font-semibold'>Conversión de unidades</h3>
                <Switch
                  checked={hasConv}
                  onCheckedChange={setHasConv}
                  aria-label='Este producto tiene una unidad equivalente'
                />
              </div>
              {hasConv ? (
                <>
                  <div className='grid grid-cols-2 gap-4'>
                    <Field label='Unidad equivalente'>
                      <select
                        value={convUnit}
                        onChange={(e) =>
                          setConvUnit(e.target.value as StandardUnit)
                        }
                        className={cn(SELECT_CLASS, CONTROL)}
                      >
                        {EQUIV_UNITS.map((u) => (
                          <option key={u.value} value={u.value}>
                            {u.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field
                      label={`Cantidad por 1 ${unitLabel}`}
                      error={showErr('factor')}
                    >
                      <Input
                        inputMode='decimal'
                        placeholder='1,44'
                        value={factor}
                        aria-invalid={!!showErr('factor')}
                        onChange={(e) => setFactor(e.target.value)}
                        className={cn('tabular-nums', CONTROL)}
                      />
                    </Field>
                  </div>
                  <div className='rounded-lg bg-muted/50 px-4 py-3 text-sm'>
                    {Number.isFinite(factorN) && factorN > 0 ? (
                      <>
                        <span className='font-semibold'>
                          1 {unitLabel} = {fmtNum(factorN)}{' '}
                          {unitName(convUnit, factorN)}
                        </span>
                        <span className='text-muted-foreground'>
                          {' '}
                          · 10 {unitName(unit, 10)} = {fmtNum(factorN * 10)}{' '}
                          {unitName(convUnit, factorN * 10)}
                        </span>
                      </>
                    ) : (
                      <span className='text-muted-foreground'>
                        Escribe cuánto trae 1 {unitLabel} en{' '}
                        {unitName(convUnit, 2)}.
                      </span>
                    )}
                  </div>
                </>
              ) : (
                <p className='text-sm text-muted-foreground'>
                  Se cuenta solo en {unitName(unit, 2)}, sin unidad equivalente.
                </p>
              )}
            </section>

            {/* Vencimiento */}
            <section className='border-t pt-5'>
              <label className='flex cursor-pointer items-center justify-between gap-4'>
                <span>
                  <span className='block font-semibold'>
                    Requiere vencimiento
                  </span>
                  <span className='block text-sm text-muted-foreground'>
                    Se pedirá la fecha al recibir y saldrá primero lo que vence
                    antes.
                  </span>
                </span>
                <Switch
                  checked={requiresExpiry}
                  onCheckedChange={setRequiresExpiry}
                />
              </label>
            </section>
          </div>

          <div className='flex flex-wrap items-center justify-end gap-2 border-t px-5 py-4'>
            {attempted && (hasErrors || lossBlocked) && (
              <p className='w-full text-sm text-danger-ink sm:me-auto sm:w-auto'>
                {lossBlocked && !hasErrors
                  ? 'Confirma el precio por debajo del costo para guardar.'
                  : 'Revisa los campos marcados.'}
              </p>
            )}
            <Button
              type='button'
              variant='outline'
              className='h-11 flex-1 sm:h-10 sm:flex-none'
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button type='submit' className='h-11 flex-1 sm:h-10 sm:flex-none'>
              {isNew ? 'Crear producto' : 'Guardar cambios'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
