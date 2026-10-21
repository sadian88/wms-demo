import { useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { ChevronDown, Download, PackagePlus, Search } from 'lucide-react'
import { downloadCsv } from '@/lib/csv'
import { cn } from '@/lib/utils'
import { useWms } from '@/context/wms-provider'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import {
  Field,
  FilterTabs,
  ListRow,
  SELECT_CLASS,
  Section,
  StatusPill,
  TONE,
} from '@/features/wms/components/kit'
import { copCompact, plural } from '@/features/wms/components/visual/format'
import {
  MOVEMENT_ICON,
  movementSigned,
  movementTone,
  qtyWithUnit,
  skuUnit,
  unitWord,
} from '@/features/wms/components/visual/movement-meta'
import { PartidaDetailDrawer } from '@/features/wms/components/visual/partida-detail-drawer'
import {
  STOCK_STATE_META,
  partidaAlerts,
} from '@/features/wms/components/visual/stock-states'
import { SummaryStrip } from '@/features/wms/components/visual/summary-strip'
import { findScreenBySlug } from '@/features/wms/data/catalog'
import { TODAY_STR } from '@/features/wms/domain/clock'
import {
  formatQtyWithEquivalent,
  totalPhysicalPartida,
  type Movement,
  type MovementType,
  type SkuItem,
} from '@/features/wms/domain/inventory'
import { EmptyState, PageHeader, nf, shortDate } from './ui-helpers'

const PAGE_SIZE = 50

/** Nombre de bodega sin el prefijo «Bodega», para espacios angostos. */
const shortWarehouse = (name: string) => name.replace(/^Bodega /, '')

/** Separa «420 cajas (~604,8 m²)» en cantidad y equivalencia. */
function qtyParts(qty: number, sku?: SkuItem) {
  const full = formatQtyWithEquivalent(qty, sku)
  const m = full.match(/^(.*?) \(~(.*)\)$/)
  return m ? { main: m[1], equiv: `≈ ${m[2]}` } : { main: full, equiv: null }
}

/* -------------------------------------------------------------------------- */
/*  2.1 Existencias                                                            */
/* -------------------------------------------------------------------------- */

type AlertTab = 'all' | 'expiring' | 'stale' | 'problem'

export function InventoryScreen({
  onNavigateToOrder,
}: {
  onNavigateToOrder: () => void
}) {
  const {
    skus,
    partidas,
    warehouses,
    warehouse,
    role,
    isReadOnly,
    matchesScope,
    hasAccess,
    canActOnScreen,
  } = useWms()
  const navigate = useNavigate()
  const goToSlug = (slug: string) =>
    navigate({ to: '/wms/$code', params: { code: slug } })

  const [query, setQuery] = useState('')
  const [whFilter, setWhFilter] = useState('ALL')
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [tab, setTab] = useState<AlertTab>('all')
  const [limit, setLimit] = useState(PAGE_SIZE)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [stockOpen, setStockOpen] = useState(false)

  const showCost = role !== 'ASE'
  const screen = findScreenBySlug('2-1').scr
  const canAddStock = !isReadOnly && canActOnScreen(screen)

  const skuMap = useMemo(() => new Map(skus.map((s) => [s.sku, s])), [skus])
  const whName = (id: string) => warehouses.find((w) => w.id === id)?.name ?? id
  const scopeWarehouses = warehouses.filter((w) => matchesScope(w.id))
  const categories = [...new Set(skus.map((s) => s.category))].sort((a, b) =>
    a.localeCompare(b, 'es')
  )

  const rows = partidas
    .filter((p) => matchesScope(p.warehouse) && totalPhysicalPartida(p) > 0)
    .map((p) => ({ p, sku: skuMap.get(p.sku), alerts: partidaAlerts(p) }))
    .sort(
      (a, b) =>
        (a.sku?.name ?? a.p.sku).localeCompare(b.sku?.name ?? b.p.sku, 'es') ||
        a.p.warehouse.localeCompare(b.p.warehouse) ||
        (a.p.expiry ?? '9').localeCompare(b.p.expiry ?? '9')
    )

  const q = query.trim().toLowerCase()
  const base = rows.filter(({ p, sku }) => {
    if (whFilter !== 'ALL' && p.warehouse !== whFilter) return false
    if (categoryFilter !== 'ALL' && sku?.category !== categoryFilter)
      return false
    if (!q) return true
    const hay = `${p.id} ${p.sku} ${sku?.name ?? ''} ${sku?.category ?? ''} ${whName(p.warehouse)} ${p.supplier}`
    return hay.toLowerCase().includes(q)
  })

  const hasAlert = (key: string) => (r: (typeof rows)[number]) =>
    r.alerts.some((a) => a.key === key)
  const isProblem = (r: (typeof rows)[number]) =>
    r.p.qty.danado + r.p.qty.reclamo > 0
  const tabFilters: Record<AlertTab, (r: (typeof rows)[number]) => boolean> = {
    all: () => true,
    expiring: hasAlert('expiry'),
    stale: hasAlert('stale'),
    problem: isProblem,
  }
  const list = base.filter(tabFilters[tab])
  const visible = list.slice(0, limit)

  const sumBase = (fn: (r: (typeof rows)[number]) => number) =>
    base.reduce((acc, r) => acc + fn(r), 0)
  const disponible = sumBase((r) => r.p.qty.disponible)
  const disponibleCost = sumBase(
    (r) => r.p.qty.disponible * (r.sku?.unitCost ?? 0)
  )
  const reservado = sumBase((r) => r.p.qty.reservado)
  const conProblema = sumBase((r) => r.p.qty.danado + r.p.qty.reclamo)
  const riskRows = base.filter(
    (r) => hasAlert('expiry')(r) || hasAlert('stale')(r)
  )
  const enRiesgo = riskRows.reduce((acc, r) => acc + r.p.qty.disponible, 0)

  const resetFilters = () => {
    setQuery('')
    setWhFilter('ALL')
    setCategoryFilter('ALL')
    setTab('all')
  }

  const exportCsv = () => {
    const header = [
      'Partida',
      'SKU',
      'Producto',
      'Categoría',
      'Bodega',
      'Unidad',
      'Disponible',
      'Reservado',
      'En tránsito',
      'En reclamo',
      'Dañado',
      'Vencimiento',
      ...(showCost ? ['Costo unitario', 'Valor a costo'] : []),
    ]
    const body = list.map(({ p, sku }) => [
      p.id,
      p.sku,
      sku?.name ?? p.sku,
      sku?.category ?? '',
      whName(p.warehouse),
      sku?.unitMeasure ?? '',
      p.qty.disponible,
      p.qty.reservado,
      p.qty.transito,
      p.qty.reclamo,
      p.qty.danado,
      p.expiry ?? '',
      ...(showCost
        ? [sku?.unitCost ?? 0, totalPhysicalPartida(p) * (sku?.unitCost ?? 0)]
        : []),
    ])
    downloadCsv(`existencias-${TODAY_STR}.csv`, [header, ...body])
  }

  const actions = canAddStock ? (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type='button'
          variant='outline'
          className='h-10 gap-2 shadow-none'
        >
          Acciones
          <ChevronDown className='size-4' />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='min-w-56'>
        <DropdownMenuItem
          className='min-h-10'
          onSelect={() => setStockOpen(true)}
        >
          <PackagePlus className='size-4' />
          Ingresar stock directo
        </DropdownMenuItem>
        <DropdownMenuItem className='min-h-10' onSelect={exportCsv}>
          <Download className='size-4' />
          Descargar existencias (CSV)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ) : (
    <Button
      type='button'
      variant='outline'
      className='h-10 gap-2 shadow-none'
      onClick={exportCsv}
    >
      <Download className='size-4' />
      Descargar CSV
    </Button>
  )

  return (
    <div className='space-y-5 sm:space-y-6'>
      <PageHeader title='Existencias' actions={actions} />

      <SummaryStrip
        items={[
          {
            label: 'Disponible',
            value: nf(disponible),
            unit: 'unidades',
            hint: showCost
              ? `${copCompact(disponibleCost)} a costo`
              : plural(base.length, 'partida', 'partidas'),
          },
          {
            label: 'Reservado',
            value: nf(reservado),
            unit: 'unidades',
            hint: 'Comprometido en pedidos',
          },
          {
            label: 'Daño o reclamo',
            value: nf(conProblema),
            unit: 'unidades',
            hint: conProblema > 0 ? 'Pendiente de decisión' : 'Sin novedades',
            tone: conProblema > 0 ? 'warning' : undefined,
          },
          {
            label: 'En riesgo',
            value: nf(enRiesgo),
            unit: 'unidades',
            hint:
              riskRows.length > 0
                ? `${plural(riskRows.length, 'partida', 'partidas')} por vencer o rezagadas`
                : 'Nada por vencer ni rezagado',
            tone: enRiesgo > 0 ? 'warning' : undefined,
          },
        ]}
      />

      <div className='space-y-3'>
        <div
          className={cn(
            'grid gap-2',
            scopeWarehouses.length > 1
              ? 'sm:grid-cols-[minmax(0,1fr)_14rem_14rem]'
              : 'sm:grid-cols-[minmax(0,1fr)_14rem]'
          )}
        >
          <div className='relative'>
            <Search
              className='pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground'
              aria-hidden
            />
            <Input
              type='search'
              aria-label='Buscar producto, SKU, partida o proveedor'
              placeholder='Buscar producto o SKU'
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setLimit(PAGE_SIZE)
              }}
              className='h-11 ps-9 text-base sm:h-10 sm:text-sm'
            />
          </div>
          {scopeWarehouses.length > 1 && (
            <select
              aria-label='Filtrar por bodega'
              value={whFilter}
              onChange={(e) => setWhFilter(e.target.value)}
              className={cn(SELECT_CLASS, 'h-11 sm:h-10')}
            >
              <option value='ALL'>Todas las bodegas</option>
              {scopeWarehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {shortWarehouse(w.name)}
                </option>
              ))}
            </select>
          )}
          <select
            aria-label='Filtrar por categoría'
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className={cn(SELECT_CLASS, 'h-11 sm:h-10')}
          >
            <option value='ALL'>Todas las categorías</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <FilterTabs<AlertTab>
          value={tab}
          onChange={(v) => {
            setTab(v)
            setLimit(PAGE_SIZE)
          }}
          options={[
            { id: 'all', label: 'Todas', count: base.length },
            {
              id: 'expiring',
              label: 'Por vencer',
              count: base.filter(tabFilters.expiring).length,
            },
            {
              id: 'stale',
              label: 'Rezagadas',
              count: base.filter(tabFilters.stale).length,
            },
            {
              id: 'problem',
              label: 'Con daño o reclamo',
              count: base.filter(tabFilters.problem).length,
            },
          ]}
        />
      </div>

      <Section flush>
        {visible.length === 0 ? (
          <EmptyState
            title='No hay partidas con esos filtros'
            text='Quita algún filtro o busca por otro nombre o código.'
            action={
              <Button
                type='button'
                variant='outline'
                className='mt-2 h-10'
                onClick={resetFilters}
              >
                Limpiar filtros
              </Button>
            }
          />
        ) : (
          <>
            {/* Escritorio: tabla de 5 columnas */}
            <table className='hidden w-full text-sm xl:table'>
              <thead>
                <tr className='border-b text-start text-muted-foreground'>
                  <th scope='col' className='px-5 py-3 text-start font-medium'>
                    Producto
                  </th>
                  <th scope='col' className='px-3 py-3 text-start font-medium'>
                    Bodega
                  </th>
                  <th scope='col' className='px-3 py-3 text-start font-medium'>
                    Disponible
                  </th>
                  <th scope='col' className='px-3 py-3 text-start font-medium'>
                    Reservado
                  </th>
                  <th scope='col' className='px-5 py-3 text-start font-medium'>
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody className='divide-y'>
                {visible.map(({ p, sku, alerts }) => {
                  const disp = qtyParts(p.qty.disponible, sku)
                  return (
                    <tr
                      key={p.id}
                      onClick={() => setSelectedId(p.id)}
                      className='cursor-pointer align-top transition-colors hover:bg-accent/60'
                    >
                      <td className='px-5 py-3.5'>
                        <button
                          type='button'
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedId(p.id)
                          }}
                          className='block max-w-sm text-start font-medium hover:underline focus-visible:underline focus-visible:outline-none'
                        >
                          {sku?.name ?? p.sku}
                        </button>
                        <div className='mt-0.5 text-muted-foreground'>
                          {p.sku} · Partida {p.id}
                        </div>
                      </td>
                      <td className='px-3 py-3.5'>
                        {shortWarehouse(whName(p.warehouse))}
                      </td>
                      <td className='px-3 py-3.5 whitespace-nowrap tabular-nums'>
                        {p.qty.disponible > 0 ? (
                          <>
                            <div className='font-medium'>{disp.main}</div>
                            {disp.equiv && (
                              <div className='whitespace-nowrap text-muted-foreground'>
                                {disp.equiv}
                              </div>
                            )}
                          </>
                        ) : (
                          <span className='text-muted-foreground'>—</span>
                        )}
                      </td>
                      <td className='px-3 py-3.5 tabular-nums'>
                        {p.qty.reservado > 0 ? (
                          qtyWithUnit(p.qty.reservado, skuUnit(sku))
                        ) : (
                          <span className='text-muted-foreground'>—</span>
                        )}
                      </td>
                      <td className='px-5 py-3.5'>
                        {alerts.length > 0 ? (
                          <div className='flex flex-wrap gap-1.5'>
                            {alerts.map((a) => (
                              <StatusPill key={a.key} tone={a.tone}>
                                {a.label}
                              </StatusPill>
                            ))}
                          </div>
                        ) : (
                          <span className='text-muted-foreground'>—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {/* Celular y tableta: filas apiladas */}
            <ul className='divide-y xl:hidden'>
              {visible.map(({ p, sku, alerts }) => {
                const disp = qtyParts(p.qty.disponible, sku)
                return (
                  <li key={p.id}>
                    <ListRow onClick={() => setSelectedId(p.id)}>
                      <div className='font-medium'>{sku?.name ?? p.sku}</div>
                      <div className='mt-0.5 text-sm text-muted-foreground'>
                        {shortWarehouse(whName(p.warehouse))} · Partida {p.id}
                      </div>
                      <div className='mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-0.5 text-sm tabular-nums'>
                        <span>
                          <span className='text-muted-foreground'>
                            Disponible{' '}
                          </span>
                          <span className='font-medium'>
                            {p.qty.disponible > 0 ? disp.main : '—'}
                          </span>
                          {p.qty.disponible > 0 && disp.equiv && (
                            <span className='text-muted-foreground'>
                              {' '}
                              {disp.equiv}
                            </span>
                          )}
                        </span>
                        {p.qty.reservado > 0 && (
                          <span>
                            <span className='text-muted-foreground'>
                              Reservado{' '}
                            </span>
                            <span className='font-medium'>
                              {qtyWithUnit(p.qty.reservado, skuUnit(sku))}
                            </span>
                          </span>
                        )}
                      </div>
                      {alerts.length > 0 && (
                        <div className='mt-2 flex flex-wrap gap-1.5'>
                          {alerts.map((a) => (
                            <StatusPill key={a.key} tone={a.tone}>
                              {a.label}
                            </StatusPill>
                          ))}
                        </div>
                      )}
                    </ListRow>
                  </li>
                )
              })}
            </ul>

            {list.length > visible.length && (
              <button
                type='button'
                onClick={() => setLimit((l) => l + PAGE_SIZE)}
                className='flex h-12 w-full items-center justify-center border-t text-sm font-medium text-primary transition-colors hover:bg-accent/60'
              >
                Cargar más ({list.length - visible.length} restantes)
              </button>
            )}
          </>
        )}
      </Section>

      <PartidaDetailDrawer
        partidaId={selectedId}
        open={selectedId !== null}
        onOpenChange={(o) => !o && setSelectedId(null)}
        onNavigateToOrder={() => onNavigateToOrder()}
        onNavigate={goToSlug}
      />

      {canAddStock && (
        <Dialog open={stockOpen} onOpenChange={setStockOpen}>
          <DialogContent className='max-h-[92vh] overflow-y-auto sm:max-w-lg'>
            <DirectStockForm
              defaultWarehouse={
                scopeWarehouses.some((w) => w.id === warehouse)
                  ? warehouse
                  : (scopeWarehouses[0]?.id ?? warehouses[0]?.id ?? '')
              }
              onDone={() => setStockOpen(false)}
              onGoCatalog={
                hasAccess(findScreenBySlug('2-4').scr)
                  ? () => {
                      setStockOpen(false)
                      goToSlug('2-4')
                    }
                  : undefined
              }
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

/** Formulario de ingreso directo. Vive dentro del Dialog para reiniciarse al abrir. */
function DirectStockForm({
  defaultWarehouse,
  onDone,
  onGoCatalog,
}: {
  defaultWarehouse: string
  onDone: () => void
  onGoCatalog?: () => void
}) {
  const { skus, warehouses, addStockPartida } = useWms()
  const sortedSkus = useMemo(
    () => [...skus].sort((a, b) => a.name.localeCompare(b.name, 'es')),
    [skus]
  )

  const [wh, setWh] = useState(defaultWarehouse)
  const [skuCode, setSkuCode] = useState(sortedSkus[0]?.sku ?? '')
  const [qty, setQty] = useState('')
  const [supplier, setSupplier] = useState('')
  const [docRef, setDocRef] = useState('')
  const [expiry, setExpiry] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const clearError = (key: string) =>
    setErrors((prev) => {
      if (!(key in prev)) return prev
      const { [key]: _removed, ...rest } = prev
      return rest
    })

  const sku = sortedSkus.find((s) => s.sku === skuCode)
  const n = Number(qty)
  const validQty = Number.isInteger(n) && n > 0
  const equivalent =
    validQty && sku?.conversions?.[0] ? qtyParts(n, sku).equiv : null

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const next: Record<string, string> = {}
    if (!validQty) next.qty = 'Escribe una cantidad entera mayor que cero.'
    if (sku?.requiresExpiry) {
      if (!expiry)
        next.expiry = 'Este producto vence: indica la fecha de vencimiento.'
      else if (expiry < TODAY_STR)
        next.expiry = 'Esa fecha ya pasó. Revisa el vencimiento del empaque.'
    }
    if (!wh) next.wh = 'Elige la bodega donde queda la mercancía.'
    setErrors(next)
    if (Object.keys(next).length > 0) return
    addStockPartida({
      sku: skuCode,
      warehouse: wh,
      qty: n,
      supplier: supplier.trim(),
      expiry: sku?.requiresExpiry ? expiry : null,
      docRef: docRef.trim() || undefined,
    })
    onDone()
  }

  return (
    <form onSubmit={submit} className='space-y-4' noValidate>
      <DialogHeader>
        <DialogTitle>Ingresar stock directo</DialogTitle>
        <DialogDescription>
          Para mercancía que ya está en la bodega y no pasó por una recepción.
          Queda registrada a tu nombre.
        </DialogDescription>
      </DialogHeader>

      <Field label='Bodega' error={errors.wh} required>
        <select
          value={wh}
          onChange={(e) => {
            setWh(e.target.value)
            clearError('wh')
          }}
          className={cn(SELECT_CLASS, 'h-11 sm:h-10')}
        >
          {warehouses.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>
      </Field>

      <Field label='Producto' required>
        <select
          value={skuCode}
          onChange={(e) => {
            setSkuCode(e.target.value)
            clearError('expiry')
          }}
          className={cn(SELECT_CLASS, 'h-11 sm:h-10')}
        >
          {sortedSkus.map((s) => (
            <option key={s.sku} value={s.sku}>
              {s.name}
            </option>
          ))}
        </select>
      </Field>

      <div className='grid gap-4 sm:grid-cols-2'>
        <Field
          label={`Cantidad${sku ? ` (${sku.unitMeasure.toLowerCase()}s)` : ''}`}
          error={errors.qty}
          hint={
            equivalent
              ? `Equivale a ${equivalent.replace('≈ ', '')}`
              : undefined
          }
          required
        >
          <Input
            inputMode='numeric'
            autoComplete='off'
            placeholder='Ej. 50'
            value={qty}
            onChange={(e) => {
              setQty(e.target.value.replace(/\D/g, ''))
              clearError('qty')
            }}
            aria-invalid={Boolean(errors.qty)}
            className='h-11 text-base tabular-nums sm:h-10 sm:text-sm'
          />
        </Field>

        {sku?.requiresExpiry && (
          <Field label='Vencimiento' error={errors.expiry} required>
            <Input
              type='date'
              min={TODAY_STR}
              value={expiry}
              onChange={(e) => {
                setExpiry(e.target.value)
                clearError('expiry')
              }}
              aria-invalid={Boolean(errors.expiry)}
              className='h-11 sm:h-10'
            />
          </Field>
        )}
      </div>

      <div className='grid gap-4 sm:grid-cols-2'>
        <Field label='Proveedor' hint='Si no lo sabes, déjalo vacío.'>
          <Input
            value={supplier}
            onChange={(e) => setSupplier(e.target.value)}
            className='h-11 sm:h-10'
          />
        </Field>
        <Field label='Documento de soporte' hint='Factura, acta o remisión.'>
          <Input
            value={docRef}
            onChange={(e) => setDocRef(e.target.value)}
            className='h-11 sm:h-10'
          />
        </Field>
      </div>

      {onGoCatalog && (
        <p className='text-sm text-muted-foreground'>
          ¿No encuentras el producto?{' '}
          <button
            type='button'
            onClick={onGoCatalog}
            className='font-medium text-primary hover:underline'
          >
            Créalo en el catálogo
          </button>
          .
        </p>
      )}

      <DialogFooter className='gap-2 sm:gap-2'>
        <Button
          type='button'
          variant='outline'
          className='h-11 sm:h-9'
          onClick={onDone}
        >
          Cancelar
        </Button>
        <Button type='submit' className='h-11 sm:h-9'>
          Ingresar al inventario
        </Button>
      </DialogFooter>
    </form>
  )
}

/* -------------------------------------------------------------------------- */
/*  2.2 Movimientos (kárdex)                                                   */
/* -------------------------------------------------------------------------- */

type MovementGroup =
  | 'all'
  | 'ingresos'
  | 'entregas'
  | 'reservas'
  | 'perdidas'
  | 'traspasos'
  | 'reclamos'

const MOVEMENT_GROUPS: Record<
  Exclude<MovementGroup, 'all'>,
  { label: string; types: MovementType[] }
> = {
  ingresos: { label: 'Ingresos', types: ['Ingreso'] },
  entregas: { label: 'Entregas', types: ['Entrega'] },
  reservas: { label: 'Reservas', types: ['Reserva', 'Liberación'] },
  perdidas: {
    label: 'Daños y pérdidas',
    types: ['Daño', 'Baja', 'Ajuste conteo'],
  },
  traspasos: {
    label: 'Traspasos',
    types: ['Traspaso salida', 'Traspaso entrada'],
  },
  reclamos: {
    label: 'Reclamos',
    types: [
      'Reclamo',
      'Reintegro',
      'Devolución cliente',
      'Devolución proveedor',
    ],
  },
}

function stateFlow(m: Movement): string {
  const from = m.fromState ? STOCK_STATE_META[m.fromState].label : null
  const to = m.toState ? STOCK_STATE_META[m.toState].label : null
  if (from && to) return `${from} → ${to}`
  if (to) return `Entra · ${to}`
  if (from) return `Sale · ${from}`
  return ''
}

export function MovementsScreen() {
  const { movements, skus, warehouses, matchesScope } = useWms()
  const [query, setQuery] = useState('')
  const [group, setGroup] = useState<MovementGroup>('all')
  const [whFilter, setWhFilter] = useState('ALL')
  const [limit, setLimit] = useState(PAGE_SIZE)

  const skuMap = useMemo(() => new Map(skus.map((s) => [s.sku, s])), [skus])
  const whName = (id: string) => warehouses.find((w) => w.id === id)?.name ?? id
  const scopeWarehouses = warehouses.filter((w) => matchesScope(w.id))

  const inScope = useMemo(
    () =>
      movements
        .filter((m) => matchesScope(m.warehouse))
        .sort((a, b) => b.ts.localeCompare(a.ts) || b.id.localeCompare(a.id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [movements, warehouses, matchesScope]
  )

  const q = query.trim().toLowerCase()
  const base = inScope
    .filter((m) => whFilter === 'ALL' || m.warehouse === whFilter)
    .filter((m) => {
      if (!q) return true
      const s = skuMap.get(m.sku)
      return `${m.type} ${m.sku} ${s?.name ?? ''} ${m.partidaId} ${m.ref} ${m.user}`
        .toLowerCase()
        .includes(q)
    })
  const countOf = (g: Exclude<MovementGroup, 'all'>) =>
    base.filter((m) => MOVEMENT_GROUPS[g].types.includes(m.type)).length
  const list =
    group === 'all'
      ? base
      : base.filter((m) => MOVEMENT_GROUPS[group].types.includes(m.type))
  const visible = list.slice(0, limit)

  const exportCsv = () =>
    downloadCsv(`movimientos-${TODAY_STR}.csv`, [
      [
        'Fecha y hora',
        'Tipo',
        'SKU',
        'Producto',
        'Partida',
        'Bodega',
        'De',
        'A',
        'Cantidad',
        'Referencia',
        'Persona',
      ],
      ...list.map((m) => [
        m.ts,
        m.type,
        m.sku,
        skuMap.get(m.sku)?.name ?? m.sku,
        m.partidaId,
        whName(m.warehouse),
        m.fromState ? STOCK_STATE_META[m.fromState].label : '',
        m.toState ? STOCK_STATE_META[m.toState].label : '',
        m.qty,
        m.ref,
        m.user,
      ]),
    ])

  return (
    <div className='space-y-5 sm:space-y-6'>
      <PageHeader
        title='Movimientos'
        actions={
          <Button
            type='button'
            variant='outline'
            className='h-10 gap-2 shadow-none'
            onClick={exportCsv}
          >
            <Download className='size-4' />
            Descargar CSV
          </Button>
        }
      />

      <div className='space-y-3'>
        <div
          className={cn(
            'grid gap-2',
            scopeWarehouses.length > 1
              ? 'sm:grid-cols-[minmax(0,1fr)_16rem]'
              : 'grid-cols-1'
          )}
        >
          <div className='relative'>
            <Search
              className='pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground'
              aria-hidden
            />
            <Input
              type='search'
              aria-label='Buscar por producto, referencia o persona'
              placeholder='Buscar producto, referencia o persona'
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setLimit(PAGE_SIZE)
              }}
              className='h-11 ps-9 text-base sm:h-10 sm:text-sm'
            />
          </div>
          {scopeWarehouses.length > 1 && (
            <select
              aria-label='Filtrar por bodega'
              value={whFilter}
              onChange={(e) => setWhFilter(e.target.value)}
              className={cn(SELECT_CLASS, 'h-11 sm:h-10')}
            >
              <option value='ALL'>Todas las bodegas</option>
              {scopeWarehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {shortWarehouse(w.name)}
                </option>
              ))}
            </select>
          )}
        </div>

        <FilterTabs<MovementGroup>
          value={group}
          onChange={(v) => {
            setGroup(v)
            setLimit(PAGE_SIZE)
          }}
          options={[
            { id: 'all', label: 'Todos', count: base.length },
            ...(
              Object.keys(MOVEMENT_GROUPS) as Exclude<MovementGroup, 'all'>[]
            ).map((g) => ({
              id: g,
              label: MOVEMENT_GROUPS[g].label,
              count: countOf(g),
            })),
          ]}
        />
      </div>

      <Section flush>
        {visible.length === 0 ? (
          <EmptyState
            title='No hay movimientos con esos filtros'
            text='Prueba con otro tipo, otra bodega o una búsqueda más corta.'
          />
        ) : (
          <>
            <div
              className='hidden border-b px-5 py-3 text-sm text-muted-foreground xl:grid xl:grid-cols-[minmax(0,2.2fr)_minmax(0,1.4fr)_minmax(0,1.6fr)_minmax(0,1.2fr)_7rem] xl:gap-4'
              aria-hidden
            >
              <span>Movimiento</span>
              <span>Cantidad</span>
              <span>Referencia</span>
              <span>Persona</span>
              <span className='text-end'>Fecha</span>
            </div>
            <ul className='divide-y'>
              {visible.map((m) => (
                <MovementRow
                  key={m.id}
                  m={m}
                  sku={skuMap.get(m.sku)}
                  warehouseName={shortWarehouse(whName(m.warehouse))}
                />
              ))}
            </ul>
            {list.length > visible.length && (
              <button
                type='button'
                onClick={() => setLimit((l) => l + PAGE_SIZE)}
                className='flex h-12 w-full items-center justify-center border-t text-sm font-medium text-primary transition-colors hover:bg-accent/60'
              >
                Cargar más ({list.length - visible.length} restantes)
              </button>
            )}
          </>
        )}
      </Section>
    </div>
  )
}

function MovementRow({
  m,
  sku,
  warehouseName,
}: {
  m: Movement
  sku?: SkuItem
  warehouseName: string
}) {
  const Icon = MOVEMENT_ICON[m.type]
  const tone = movementTone(m)
  const qtyText = `${movementSigned(m)} ${unitWord(m.qty, skuUnit(sku))}`
  const when = `${shortDate(m.ts)}, ${m.ts.slice(11)}`
  const qtyClass = cn(
    'font-semibold tabular-nums',
    tone === 'neutral' ? 'text-foreground' : TONE[tone].text
  )

  return (
    <li className='px-4 py-3.5 sm:px-5 xl:grid xl:grid-cols-[minmax(0,2.2fr)_minmax(0,1.4fr)_minmax(0,1.6fr)_minmax(0,1.2fr)_7rem] xl:items-center xl:gap-4'>
      <div className='flex min-w-0 items-start gap-3'>
        <span
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-lg',
            TONE[tone].soft
          )}
        >
          <Icon className='size-[18px]' aria-hidden />
        </span>
        <div className='min-w-0 flex-1'>
          <div className='flex items-baseline justify-between gap-3'>
            <span className='font-medium'>{m.type}</span>
            <span className={cn('text-sm xl:hidden', qtyClass)}>{qtyText}</span>
          </div>
          <div className='truncate text-sm text-muted-foreground'>
            {sku?.name ?? m.sku}
          </div>
          <div className='mt-1 space-y-0.5 text-sm text-muted-foreground xl:hidden'>
            <div>{stateFlow(m)}</div>
            <div className='truncate'>
              {m.ref} · {warehouseName}
            </div>
            <div className='truncate'>
              {m.user} · {when}
            </div>
          </div>
        </div>
      </div>

      <div className='hidden text-sm xl:block'>
        <div className={qtyClass}>{qtyText}</div>
        <div className='text-muted-foreground'>{stateFlow(m)}</div>
      </div>
      <div className='hidden min-w-0 text-sm xl:block'>
        <div className='truncate'>{m.ref}</div>
        <div className='truncate text-muted-foreground'>
          {warehouseName} · {m.partidaId}
        </div>
      </div>
      <div className='hidden truncate text-sm xl:block'>{m.user}</div>
      <div className='hidden text-end text-sm xl:block'>
        <div>{shortDate(m.ts)}</div>
        <div className='text-muted-foreground'>{m.ts.slice(11)}</div>
      </div>
    </li>
  )
}
