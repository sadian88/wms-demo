import { useState } from 'react'
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Boxes,
  Check,
  Grid,
  History,
  LayoutList,
  PackagePlus,
  Plus,
  Ruler,
  Scale,
  ShieldAlert,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { useWms } from '@/context/wms-provider'
import {
  CategoryAvatar,
  CategoryBadge,
} from '@/features/wms/components/visual/category-icons'
import { PartidaDetailDrawer } from '@/features/wms/components/visual/partida-detail-drawer'
import { StockCompositionBar } from '@/features/wms/components/visual/stock-composition-bar'
import {
  EXPIRY_WARN_DAYS,
  daysBetween,
  formatQtyWithEquivalent,
  totalPhysicalPartida,
  type MovementType,
  type Partida,
  type StandardUnit,
  type StockState,
} from '@/features/wms/domain/inventory'
import { EmptyState, KpiCard, PageHeader, cop, nf } from './ui-helpers'

const TODAY_STR = '2026-10-20'

const STATE_LABELS: Record<StockState, string> = {
  disponible: 'Disponible',
  reservado: 'Reservado',
  danado: 'Dañado',
  reclamo: 'En reclamo',
  transito: 'En tránsito',
}

// 2.1 Existencias
export function InventoryScreen({
  onNavigateToOrder,
}: {
  onNavigateToOrder?: (orderId: string) => void
}) {
  const {
    skus,
    partidas,
    warehouses,
    warehouse,
    buckets,
    matchesScope,
    isReadOnly,
    createSku,
    addStockPartida,
  } = useWms()
  const [query, setQuery] = useState('')
  const [stateFilter, setStateFilter] = useState<'ALL' | StockState>('ALL')
  const [onlyExpiring, setOnlyExpiring] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
  const [selectedPartida, setSelectedPartida] = useState<Partida | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Modal Crear Producto
  const [skuModalOpen, setSkuModalOpen] = useState(false)
  const [skuFormCode, setSkuFormCode] = useState('')
  const [skuFormName, setSkuFormName] = useState('')
  const [skuFormCategory, setSkuFormCategory] = useState('Porcelanatos')
  const [skuFormBaseUnit, setSkuFormBaseUnit] = useState<StandardUnit>('Caja')
  const [skuFormCost, setSkuFormCost] = useState('85000')
  const [skuFormExpiry, setSkuFormExpiry] = useState(false)
  const [skuHasConversion, setSkuHasConversion] = useState(true)
  const [skuConvTargetUnit, setSkuConvTargetUnit] = useState<StandardUnit>('m²')
  const [skuConvFactor, setSkuConvFactor] = useState('1.44')

  // Modal Agregar Stock a Bodega
  const [addStockModalOpen, setAddStockModalOpen] = useState(false)
  const [stockSku, setStockSku] = useState(skus[0]?.sku ?? 'POR-60120-CAL')
  const [stockWh, setStockWh] = useState(
    warehouse !== 'ALL' && !warehouse.startsWith('ALM:')
      ? warehouse
      : warehouses[0]?.id ?? 'BOD-CEN-01'
  )
  const [stockQty, setStockQty] = useState('50')
  const [stockSupplier, setStockSupplier] = useState('Ceramix Nacional')
  const [stockExpiry, setStockExpiry] = useState('')
  const [stockDocRef, setStockDocRef] = useState('INV-INICIAL-2026')

  const skuMap = new Map(skus.map((s) => [s.sku, s]))

  const handleCreateSkuSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const cost = Number(skuFormCost)
    if (!skuFormCode.trim() || !skuFormName.trim()) {
      toast.error('El código SKU y el nombre del producto son requeridos')
      return
    }
    if (isNaN(cost) || cost <= 0) {
      toast.error('El costo unitario debe ser positivo')
      return
    }
    const conversions =
      skuHasConversion && Number(skuConvFactor) > 0
        ? [
            {
              targetUnit: skuConvTargetUnit,
              factor: Number(skuConvFactor),
              description: `1 ${skuFormBaseUnit} = ${skuConvFactor} ${skuConvTargetUnit}`,
            },
          ]
        : []

    const ok = createSku({
      sku: skuFormCode.trim().toUpperCase(),
      name: skuFormName.trim(),
      category: skuFormCategory,
      unitMeasure: skuFormBaseUnit,
      unitCost: cost,
      requiresExpiry: skuFormExpiry,
      conversions,
    })
    if (ok) {
      setStockSku(skuFormCode.trim().toUpperCase())
      setSkuModalOpen(false)
    }
  }

  const handleAddStockSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const q = Number(stockQty)
    if (isNaN(q) || q <= 0) {
      toast.error('La cantidad a ingresar debe ser mayor a 0')
      return
    }
    const skuObj = skuMap.get(stockSku)
    if (skuObj?.requiresExpiry && !stockExpiry) {
      toast.error('Este producto requiere fecha de vencimiento (FEFO)')
      return
    }

    addStockPartida({
      sku: stockSku,
      warehouse: stockWh,
      qty: q,
      supplier: stockSupplier.trim() || 'Proveedor General',
      expiry: stockExpiry || null,
      docRef: stockDocRef.trim() || 'INGRESO-DIRECTO',
    })
    setAddStockModalOpen(false)
  }

  const list = partidas
    .filter((p) => matchesScope(p.warehouse))
    .filter((p) => {
      if (stateFilter === 'ALL') return totalPhysicalPartida(p) > 0
      return p.qty[stateFilter] > 0
    })
    .filter((p) => {
      if (!onlyExpiring) return true
      if (!p.expiry) return false
      return daysBetween(TODAY_STR, p.expiry) <= EXPIRY_WARN_DAYS
    })
    .filter((p) => {
      const s = skuMap.get(p.sku)
      const haystack = `${p.id} ${p.sku} ${s?.name ?? ''} ${s?.category ?? ''} ${p.warehouse} ${p.supplier}`.toLowerCase()
      return haystack.includes(query.toLowerCase())
    })

  const handleOpenDetail = (p: Partida) => {
    setSelectedPartida(p)
    setDrawerOpen(true)
  }

  return (
    <div className='space-y-6'>
      <PageHeader
        title='Existencias por partida'
        subtitle='Control por SKU, bodega y fecha de vencimiento. Haz clic en cualquier partida para ver su Ficha 360°.'
        actions={
          <div className='flex flex-wrap items-center gap-2'>
            {!isReadOnly && (
              <>
                <Button
                  size='sm'
                  variant='outline'
                  className='h-7 text-xs gap-1.5'
                  onClick={() => {
                    setSkuFormCode('')
                    setSkuFormName('')
                    setSkuFormCost('85000')
                    setSkuModalOpen(true)
                  }}
                >
                  <Plus className='size-3.5' />
                  + Nuevo Producto
                </Button>
                <Button
                  size='sm'
                  className='h-7 text-xs gap-1.5 shadow-xs'
                  onClick={() => setAddStockModalOpen(true)}
                >
                  <PackagePlus className='size-3.5' />
                  + Agregar Stock a Bodega
                </Button>
              </>
            )}

            <div className='flex items-center gap-1.5 rounded-lg border bg-muted/40 p-1'>
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size='sm'
                className='h-7 px-2.5 text-xs'
                onClick={() => setViewMode('grid')}
              >
                <Grid className='mr-1.5 size-3.5' />
                Tarjetas
              </Button>
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size='sm'
                className='h-7 px-2.5 text-xs'
                onClick={() => setViewMode('table')}
              >
                <LayoutList className='mr-1.5 size-3.5' />
                Tabla
              </Button>
            </div>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className='grid grid-cols-2 gap-3 lg:grid-cols-4'>
        <KpiCard
          label='Disponible para venta'
          value={`${nf(buckets.enExistencia.units)} uds`}
          sub={cop(buckets.enExistencia.valueCOP ?? buckets.enExistencia.valueUSD)}
        />
        <KpiCard
          label='Reservado (por entregar)'
          value={`${nf(buckets.porEntregar.units)} uds`}
          sub={cop(buckets.porEntregar.valueCOP ?? buckets.porEntregar.valueUSD)}
        />
        <KpiCard
          label='Dañado + En reclamo'
          value={`${nf(buckets.danada.units + buckets.porReclamar.units)} uds`}
          sub={cop(
            (buckets.danada.valueCOP ?? buckets.danada.valueUSD) +
              (buckets.porReclamar.valueCOP ?? buckets.porReclamar.valueUSD)
          )}
          tone={
            buckets.danada.units + buckets.porReclamar.units > 0
              ? 'text-destructive'
              : undefined
          }
        />
        <KpiCard
          label='Stock físico total'
          value={`${nf(buckets.enExistencia.totalPhysicalUnits)} uds`}
          sub={cop(buckets.enExistencia.totalPhysicalCOP ?? buckets.enExistencia.totalPhysicalUSD)}
        />
      </div>

      {/* Search and Filters */}
      <div className='flex flex-wrap items-center gap-2.5'>
        <Input
          className='h-8 w-72 text-xs'
          placeholder='Buscar SKU, categoría, partida, proveedor…'
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          aria-label='Filtrar por estado'
          className='h-8 rounded-md border bg-background px-2.5 text-xs'
          value={stateFilter}
          onChange={(e) => setStateFilter(e.target.value as 'ALL' | StockState)}
        >
          <option value='ALL'>Todos los estados con stock</option>
          {Object.entries(STATE_LABELS).map(([k, label]) => (
            <option key={k} value={k}>
              Con stock en: {label}
            </option>
          ))}
        </select>
        <label className='flex cursor-pointer items-center gap-1.5 rounded-md border bg-card px-2.5 py-1.5 text-xs select-none'>
          <input
            type='checkbox'
            checked={onlyExpiring}
            onChange={(e) => setOnlyExpiring(e.target.checked)}
            className='rounded'
          />
          Por vencer (≤ {EXPIRY_WARN_DAYS} días)
        </label>
        <span className='ms-auto text-xs text-muted-foreground'>
          {list.length} partidas activas
        </span>
      </div>

      {/* View Mode: Grid (Cards enriquecidas) */}
      {viewMode === 'grid' ? (
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
          {list.map((p) => {
            const s = skuMap.get(p.sku)
            const phys = totalPhysicalPartida(p)
            const valCOP = phys * (s?.unitCost ?? 0)
            const daysToExp = p.expiry
              ? daysBetween(TODAY_STR, p.expiry)
              : null
            const expSoon =
              daysToExp !== null && daysToExp <= EXPIRY_WARN_DAYS
            const daysSinceLast = daysBetween(p.lastOutAt, TODAY_STR)

            return (
              <div
                key={p.id}
                onClick={() => handleOpenDetail(p)}
                className='group relative flex flex-col justify-between rounded-xl border bg-card p-4 transition-all hover:border-primary/50 hover:shadow-md cursor-pointer'
              >
                <div>
                  {/* Card Header with Category Avatar and Partida ID */}
                  <div className='flex items-start justify-between gap-3'>
                    <div className='flex items-center gap-2.5 min-w-0'>
                      <CategoryAvatar
                        category={s?.category ?? 'Otros'}
                        size='sm'
                      />
                      <div className='min-w-0'>
                        <div className='flex items-center gap-1.5'>
                          <span className='font-mono text-xs font-bold text-primary'>
                            {p.id}
                          </span>
                          <span className='text-[10px] text-muted-foreground'>
                            · {p.warehouse}
                          </span>
                        </div>
                        <h4 className='text-xs font-semibold leading-tight text-foreground truncate mt-0.5'>
                          {s?.name ?? p.sku}
                        </h4>
                      </div>
                    </div>
                  </div>

                  {/* Badges Bar */}
                  <div className='mt-2.5 flex flex-wrap items-center gap-1.5'>
                    <CategoryBadge
                      category={s?.category ?? 'Otros'}
                      className='text-[9px] py-0 px-1.5'
                    />
                    {expSoon && (
                      <Badge variant='destructive' className='text-[9px] py-0'>
                        Vence en {daysToExp}d
                      </Badge>
                    )}
                    {daysSinceLast >= 60 && (
                      <Badge variant='outline' className='text-[9px] py-0 border-amber-500/50 text-amber-600'>
                        Rezagada (hace {daysSinceLast}d)
                      </Badge>
                    )}
                  </div>

                  {/* Stock Composition Horizontal Bar */}
                  <div className='mt-4 space-y-1.5'>
                    <div className='flex items-center justify-between text-xs'>
                      <span className='text-[11px] text-muted-foreground'>
                        Composición física:
                      </span>
                      <span className='font-bold tabular-nums text-foreground'>
                        {formatQtyWithEquivalent(phys, s)}
                      </span>
                    </div>
                    <StockCompositionBar
                      qty={p.qty}
                      totalPhysical={phys}
                      height='sm'
                    />
                    <div className='flex items-center justify-between text-[10px] text-muted-foreground pt-0.5'>
                      <span className='text-emerald-600 dark:text-emerald-400 font-medium'>
                        Disp: {formatQtyWithEquivalent(p.qty.disponible, s)}
                      </span>
                      <span className='text-blue-600 dark:text-blue-400 font-medium'>
                        Res: {nf(p.qty.reservado)}
                      </span>
                      {p.qty.danado + p.qty.reclamo > 0 && (
                        <span className='text-rose-600 font-medium'>
                          Inc: {nf(p.qty.danado + p.qty.reclamo)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer with Valuation and Drawer trigger */}
                <div className='mt-4 flex items-center justify-between border-t pt-2.5 text-xs'>
                  <span className='font-bold tabular-nums text-foreground'>
                    {cop(valCOP)}
                  </span>
                  <span className='text-[11px] text-primary group-hover:underline flex items-center gap-1 font-medium'>
                    Ver Ficha 360° <ArrowRight className='size-3' />
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* View Mode: Compact Table with Micro-Graphs */
        <div className='overflow-x-auto rounded-xl border bg-card shadow-xs'>
          <table className='w-full text-xs'>
            <thead className='border-b bg-muted/40 text-left text-muted-foreground'>
              <tr>
                <th className='px-3.5 py-3 font-semibold'>Producto / Categoría</th>
                <th className='px-3.5 py-3 font-semibold'>Partida · Bodega</th>
                <th className='px-3.5 py-3 font-semibold w-48'>Composición Stock</th>
                <th className='px-3.5 py-3 font-semibold'>Disponible</th>
                <th className='px-3.5 py-3 font-semibold'>Reservado</th>
                <th className='px-3.5 py-3 font-semibold'>Vencimiento</th>
                <th className='px-3.5 py-3 text-right font-semibold'>Valor Físico</th>
              </tr>
            </thead>
            <tbody className='divide-y'>
              {list.map((p) => {
                const s = skuMap.get(p.sku)
                const phys = totalPhysicalPartida(p)
                const valCOP = phys * (s?.unitCost ?? 0)
                const daysToExp = p.expiry
                  ? daysBetween(TODAY_STR, p.expiry)
                  : null
                const expSoon =
                  daysToExp !== null && daysToExp <= EXPIRY_WARN_DAYS

                return (
                  <tr
                    key={p.id}
                    onClick={() => handleOpenDetail(p)}
                    className='hover:bg-muted/30 cursor-pointer transition-colors'
                  >
                    <td className='px-3.5 py-2.5'>
                      <div className='flex items-center gap-2'>
                        <CategoryAvatar
                          category={s?.category ?? 'Otros'}
                          size='sm'
                        />
                        <div className='min-w-0'>
                          <div className='font-semibold text-foreground truncate max-w-xs'>
                            {s?.name ?? p.sku}
                          </div>
                          <div className='text-[10px] text-muted-foreground font-mono'>
                            {p.sku}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className='px-3.5 py-2.5'>
                      <span className='font-mono font-bold text-primary'>
                        {p.id}
                      </span>
                      <div className='text-[11px] text-muted-foreground'>
                        {p.warehouse}
                      </div>
                    </td>
                    <td className='px-3.5 py-2.5'>
                      <StockCompositionBar
                        qty={p.qty}
                        totalPhysical={phys}
                        height='sm'
                      />
                    </td>
                    <td className='px-3.5 py-2.5 font-bold tabular-nums text-emerald-600 dark:text-emerald-400'>
                      {formatQtyWithEquivalent(p.qty.disponible, s)}
                    </td>
                    <td className='px-3.5 py-2.5 tabular-nums text-blue-600 dark:text-blue-400 font-medium'>
                      {nf(p.qty.reservado)}
                    </td>
                    <td className='px-3.5 py-2.5'>
                      {p.expiry ? (
                        <div className='flex items-center gap-1.5'>
                          <span>{p.expiry}</span>
                          {expSoon && (
                            <Badge variant='destructive' className='text-[10px] py-0'>
                              {daysToExp}d
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className='text-muted-foreground'>No vence</span>
                      )}
                    </td>
                    <td className='px-3.5 py-2.5 text-right font-bold tabular-nums text-foreground'>
                      {cop(valCOP)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {list.length === 0 && (
        <EmptyState text='No hay partidas que coincidan con los filtros seleccionados.' />
      )}

      {/* Partida 360° Detail Drawer */}
      <PartidaDetailDrawer
        partida={selectedPartida}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onNavigateToOrder={onNavigateToOrder}
      />

      {/* Modal Agregar Stock a Bodega */}
      <Dialog
        open={addStockModalOpen}
        onOpenChange={(open) => !open && setAddStockModalOpen(false)}
      >
        <DialogContent className='max-w-md'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2'>
              <PackagePlus className='size-5 text-primary' />
              Ingresar Stock Físico a Bodega
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAddStockSubmit} className='space-y-4 pt-1 text-xs'>
            <div className='space-y-1.5'>
              <label className='font-semibold text-foreground'>Bodega de Destino *</label>
              <select
                value={stockWh}
                onChange={(e) => setStockWh(e.target.value)}
                className='w-full h-9 rounded-md border bg-background px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary'
              >
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.id} · {w.name}
                  </option>
                ))}
              </select>
            </div>

            <div className='space-y-1.5'>
              <label className='font-semibold text-foreground'>Producto (SKU) *</label>
              <select
                value={stockSku}
                onChange={(e) => setStockSku(e.target.value)}
                className='w-full h-9 rounded-md border bg-background px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary'
              >
                {skus.map((s) => (
                  <option key={s.sku} value={s.sku}>
                    {s.sku} · {s.name} ({s.unitMeasure})
                  </option>
                ))}
              </select>
            </div>

            {/* Cantidad y Preview de Conversión en tiempo real */}
            {(() => {
              const currentSku = skuMap.get(stockSku)
              const conv = currentSku?.conversions?.[0]
              const baseU = currentSku?.unitMeasure ?? 'Caja'
              const q = Number(stockQty) || 0
              const equiv = conv ? (q * conv.factor).toFixed(2) : null
              const totalVal = q * (currentSku?.unitCost ?? 0)

              return (
                <div className='space-y-2'>
                  <div className='grid grid-cols-2 gap-3'>
                    <div className='space-y-1.5'>
                      <label className='font-semibold text-foreground'>
                        Cantidad a Ingresar ({baseU}s) *
                      </label>
                      <Input
                        type='number'
                        min={1}
                        required
                        value={stockQty}
                        onChange={(e) => setStockQty(e.target.value)}
                        className='font-bold tabular-nums'
                      />
                    </div>

                    <div className='space-y-1.5'>
                      <label className='font-semibold text-foreground'>
                        Doc. Soporte / Referencia
                      </label>
                      <Input
                        placeholder='ej. INV-INICIAL-2026'
                        value={stockDocRef}
                        onChange={(e) => setStockDocRef(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Banner de equivalencia y valorización */}
                  <div className='rounded-lg border bg-muted/40 p-2.5 space-y-1'>
                    <div className='flex items-center justify-between text-[11px]'>
                      <span className='text-muted-foreground'>Equivalencia física:</span>
                      <span className='font-bold text-foreground'>
                        {q} {baseU}{q !== 1 ? 's' : ''}
                        {equiv && conv ? ` (~${equiv} ${conv.targetUnit})` : ''}
                      </span>
                    </div>
                    <div className='flex items-center justify-between text-[11px]'>
                      <span className='text-muted-foreground'>Valorización en COP:</span>
                      <span className='font-bold text-primary tabular-nums'>
                        {cop(totalVal)}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })()}

            <div className='grid grid-cols-2 gap-3'>
              <div className='space-y-1.5'>
                <label className='font-semibold text-foreground'>Proveedor de Origen</label>
                <Input
                  placeholder='ej. Ceramix Nacional SAS'
                  value={stockSupplier}
                  onChange={(e) => setStockSupplier(e.target.value)}
                />
              </div>

              {skuMap.get(stockSku)?.requiresExpiry ? (
                <div className='space-y-1.5'>
                  <label className='font-semibold text-rose-600 dark:text-rose-400'>
                    Fecha Vencimiento (FEFO) *
                  </label>
                  <Input
                    type='date'
                    required
                    value={stockExpiry}
                    onChange={(e) => setStockExpiry(e.target.value)}
                    className='border-rose-300 dark:border-rose-800'
                  />
                </div>
              ) : (
                <div className='space-y-1.5'>
                  <label className='font-medium text-muted-foreground'>Fecha Vencimiento</label>
                  <Input
                    disabled
                    value='No aplica (No perecedero)'
                    className='bg-muted/30 text-muted-foreground'
                  />
                </div>
              )}
            </div>

            <div className='flex justify-end gap-2 pt-2 border-t'>
              <Button
                type='button'
                variant='outline'
                onClick={() => setAddStockModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button type='submit'>
                Confirmar Ingreso a Bodega
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Crear Nuevo Producto */}
      <Dialog
        open={skuModalOpen}
        onOpenChange={(open) => !open && setSkuModalOpen(false)}
      >
        <DialogContent className='max-w-lg'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2'>
              <Boxes className='size-5 text-primary' />
              Crear Nuevo Producto en Catálogo
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateSkuSubmit} className='space-y-4 pt-1 text-xs'>
            <div className='grid grid-cols-2 gap-3'>
              <div className='space-y-1.5'>
                <label className='font-semibold text-foreground'>Código SKU *</label>
                <Input
                  required
                  placeholder='ej. POR-6060-BLA'
                  value={skuFormCode}
                  onChange={(e) => setSkuFormCode(e.target.value.toUpperCase())}
                  className='font-mono font-bold'
                />
              </div>

              <div className='space-y-1.5'>
                <label className='font-semibold text-foreground'>Categoría *</label>
                <select
                  value={skuFormCategory}
                  onChange={(e) => setSkuFormCategory(e.target.value)}
                  className='w-full h-9 rounded-md border bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary'
                >
                  <option value='Porcelanatos'>Porcelanatos</option>
                  <option value='Cerámicas'>Cerámicas</option>
                  <option value='Revestimientos'>Revestimientos</option>
                  <option value='Adhesivos y Morteros'>Adhesivos y Morteros</option>
                  <option value='Químicos y Selladores'>Químicos y Selladores</option>
                  <option value='Perfiles y Accesorios'>Perfiles y Accesorios</option>
                  <option value='Grifería'>Grifería</option>
                  <option value='Otros'>Otros</option>
                </select>
              </div>
            </div>

            <div className='space-y-1.5'>
              <label className='font-semibold text-foreground'>
                Nombre descriptivo del producto *
              </label>
              <Input
                required
                placeholder='ej. Porcelanato Blanco Satinado 60x60 cm'
                value={skuFormName}
                onChange={(e) => setSkuFormName(e.target.value)}
              />
            </div>

            <div className='grid grid-cols-2 gap-3'>
              <div className='space-y-1.5'>
                <label className='font-semibold text-foreground'>
                  Unidad Base (Física en Bodega) *
                </label>
                <select
                  value={skuFormBaseUnit}
                  onChange={(e) =>
                    setSkuFormBaseUnit(e.target.value as StandardUnit)
                  }
                  className='w-full h-9 rounded-md border bg-background px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary'
                >
                  <option value='Caja'>Caja (Empaque cerámico/piezas)</option>
                  <option value='Saco'>Saco (Morteros/polvos)</option>
                  <option value='Balde'>Balde (Líquidos/pastas)</option>
                  <option value='Tira'>Tira (Perfiles/molduras)</option>
                  <option value='Rollo'>Rollo (Membranas/mallas)</option>
                  <option value='Unidad'>Unidad (Pieza individual)</option>
                  <option value='kg'>Kilogramo (kg)</option>
                  <option value='m'>Metro lineal (m)</option>
                  <option value='Litro'>Litro (L)</option>
                </select>
              </div>

              <div className='space-y-1.5'>
                <label className='font-semibold text-foreground'>
                  Costo Unitario COP ($) *
                </label>
                <Input
                  type='number'
                  min={1}
                  required
                  placeholder='ej. 85000'
                  value={skuFormCost}
                  onChange={(e) => setSkuFormCost(e.target.value)}
                  className='font-bold tabular-nums'
                />
              </div>
            </div>

            {/* Control FEFO */}
            <div className='flex items-center justify-between rounded-lg border bg-muted/20 p-3'>
              <div className='space-y-0.5'>
                <span className='font-semibold text-foreground'>
                  Control de Vencimiento Estricto (FEFO)
                </span>
                <p className='text-[11px] text-muted-foreground'>
                  Activar para productos perecederos (adhesivos, químicos).
                </p>
              </div>
              <Switch
                checked={skuFormExpiry}
                onCheckedChange={setSkuFormExpiry}
              />
            </div>

            {/* Parametrización de Conversión de Medidas */}
            <div className='rounded-xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50/40 dark:bg-indigo-950/20 p-4 space-y-3'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  <Ruler className='size-4 text-indigo-600 dark:text-indigo-400' />
                  <span className='font-bold text-foreground text-xs'>
                    Factor de Conversión de Unidades
                  </span>
                </div>
                <label className='inline-flex items-center gap-1.5 cursor-pointer text-xs font-medium'>
                  <input
                    type='checkbox'
                    checked={skuHasConversion}
                    onChange={(e) => setSkuHasConversion(e.target.checked)}
                    className='rounded border-gray-300'
                  />
                  <span>Habilitar conversión</span>
                </label>
              </div>

              {skuHasConversion ? (
                <div className='space-y-3 pt-1'>
                  <div className='grid grid-cols-2 gap-3'>
                    <div className='space-y-1'>
                      <label className='text-[11px] font-medium text-foreground'>
                        Unidad Equivalente (Venta/Obra)
                      </label>
                      <select
                        value={skuConvTargetUnit}
                        onChange={(e) =>
                          setSkuConvTargetUnit(e.target.value as StandardUnit)
                        }
                        className='w-full h-8 rounded-md border bg-background px-2.5 py-1 text-xs font-semibold'
                      >
                        <option value='m²'>m² (Metros Cuadrados)</option>
                        <option value='kg'>kg (Kilogramos)</option>
                        <option value='m'>m (Metros Lineales)</option>
                        <option value='Litro'>Litro (L)</option>
                        <option value='Unidad'>Unidad</option>
                      </select>
                    </div>

                    <div className='space-y-1'>
                      <label className='text-[11px] font-medium text-foreground'>
                        Cantidad por 1 {skuFormBaseUnit}
                      </label>
                      <Input
                        type='number'
                        step='0.01'
                        min='0.001'
                        required
                        value={skuConvFactor}
                        onChange={(e) => setSkuConvFactor(e.target.value)}
                        className='h-8 text-xs font-bold tabular-nums'
                      />
                    </div>
                  </div>

                  <div className='rounded-md bg-background/80 border p-2.5 text-[11px] space-y-1'>
                    <div className='flex items-center gap-1.5 font-bold text-indigo-700 dark:text-indigo-300'>
                      <Check className='size-3.5' />
                      Regla: 1 {skuFormBaseUnit} = {skuConvFactor || 0}{' '}
                      {skuConvTargetUnit}
                    </div>
                    <div className='text-muted-foreground'>
                      Ejemplo: Si despachas <strong>10 {skuFormBaseUnit}s</strong>, entregas{' '}
                      <strong>
                        {(10 * (Number(skuConvFactor) || 0)).toFixed(2)}{' '}
                        {skuConvTargetUnit}
                      </strong>
                      .
                    </div>
                  </div>
                </div>
              ) : (
                <p className='text-[11px] text-muted-foreground'>
                  Control directo 1:1 sin conversión secundaria.
                </p>
              )}
            </div>

            <div className='flex justify-end gap-2 pt-2 border-t'>
              <Button
                type='button'
                variant='outline'
                onClick={() => setSkuModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button type='submit'>
                Crear y Seleccionar Producto
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// 2.2 Movimientos (Kárdex)
export function MovementsScreen() {
  const { movements, matchesScope } = useWms()
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<'ALL' | MovementType>('ALL')

  const list = movements
    .filter((m) => matchesScope(m.warehouse))
    .filter((m) => typeFilter === 'ALL' || m.type === typeFilter)
    .filter((m) =>
      `${m.sku} ${m.partidaId} ${m.ref} ${m.user} ${m.type}`
        .toLowerCase()
        .includes(query.toLowerCase())
    )

  const getMovementVisual = (type: MovementType) => {
    switch (type) {
      case 'Ingreso':
      case 'Reintegro':
      case 'Devolución cliente':
      case 'Traspaso entrada':
        return {
          icon: ArrowDownLeft,
          color: 'text-emerald-600 dark:text-emerald-400',
          bg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800',
          badgeVariant: 'outline' as const,
        }
      case 'Entrega':
      case 'Reserva':
      case 'Traspaso salida':
      case 'Devolución proveedor':
        return {
          icon: ArrowUpRight,
          color: 'text-blue-600 dark:text-blue-400',
          bg: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800',
          badgeVariant: 'secondary' as const,
        }
      case 'Daño':
      case 'Baja':
        return {
          icon: ShieldAlert,
          color: 'text-rose-600 dark:text-rose-400',
          bg: 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800',
          badgeVariant: 'destructive' as const,
        }
      case 'Ajuste conteo':
        return {
          icon: Scale,
          color: 'text-purple-600 dark:text-purple-400',
          bg: 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800',
          badgeVariant: 'outline' as const,
        }
      default:
        return {
          icon: History,
          color: 'text-muted-foreground',
          bg: 'bg-muted border-border',
          badgeVariant: 'outline' as const,
        }
    }
  }

  return (
    <div className='space-y-6'>
      <PageHeader
        title='Movimientos (Kárdex)'
        subtitle='Bitácora cronológica inmutable con trazabilidad visual de origen a destino.'
      />

      <div className='flex flex-wrap items-center gap-2.5'>
        <Input
          className='h-8 w-72 text-xs'
          placeholder='Buscar SKU, partida, referencia o usuario…'
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          aria-label='Filtrar por tipo de movimiento'
          className='h-8 rounded-md border bg-background px-2.5 text-xs'
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as 'ALL' | MovementType)}
        >
          <option value='ALL'>Todos los tipos de movimiento</option>
          {[
            'Ingreso',
            'Reserva',
            'Liberación',
            'Entrega',
            'Daño',
            'Baja',
            'Traspaso salida',
            'Traspaso entrada',
            'Reclamo',
            'Reintegro',
            'Devolución cliente',
            'Devolución proveedor',
            'Ajuste conteo',
          ].map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <span className='ms-auto text-xs text-muted-foreground'>
          {list.length} movimientos registrados
        </span>
      </div>

      {/* Visual Activity Timeline list */}
      <div className='space-y-2.5'>
        {list.map((m) => {
          const visual = getMovementVisual(m.type)
          const Icon = visual.icon

          return (
            <div
              key={m.id}
              className='flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border bg-card p-3.5 shadow-xs transition-all hover:border-primary/40'
            >
              {/* Left: Icon + Type + Product info */}
              <div className='flex items-start gap-3 min-w-0'>
                <div
                  className={`flex size-9 shrink-0 items-center justify-center rounded-lg border ${visual.bg}`}
                >
                  <Icon className={`size-4.5 ${visual.color}`} />
                </div>
                <div className='min-w-0'>
                  <div className='flex items-center gap-2'>
                    <Badge variant={visual.badgeVariant} className='text-[10px] py-0'>
                      {m.type}
                    </Badge>
                    <span className='font-mono text-xs font-bold text-foreground'>
                      {m.sku}
                    </span>
                    <span className='text-[11px] text-muted-foreground'>
                      Partida: {m.partidaId}
                    </span>
                  </div>
                  <div className='mt-1 flex items-center gap-2 text-xs text-muted-foreground'>
                    <span className='font-medium text-foreground'>{m.warehouse}</span>
                    <span>· Ref: {m.ref}</span>
                    <span>· Por: {m.user}</span>
                  </div>
                </div>
              </div>

              {/* Right: State Transition Flow + Units & Date */}
              <div className='flex items-center justify-between sm:justify-end gap-4 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0'>
                {/* Visual Transition */}
                <div className='flex items-center gap-1.5 rounded-lg border bg-muted/40 px-2.5 py-1 text-xs'>
                  <span className='font-medium text-muted-foreground text-[11px]'>
                    {m.fromState ? STATE_LABELS[m.fromState] : 'Exterior'}
                  </span>
                  <ArrowRight className='size-3 text-muted-foreground' />
                  <span className='font-semibold text-foreground text-[11px]'>
                    {m.toState ? STATE_LABELS[m.toState] : 'Salida'}
                  </span>
                </div>

                {/* Units badge */}
                <div className='text-end'>
                  <div className='text-sm font-bold tabular-nums text-foreground'>
                    {m.qty > 0 ? `+${nf(m.qty)}` : nf(m.qty)} uds
                  </div>
                  <div className='text-[10px] text-muted-foreground tabular-nums'>
                    {m.ts}
                  </div>
                </div>
              </div>
            </div>
          )
        })}

        {list.length === 0 && (
          <EmptyState text='No hay movimientos para los filtros seleccionados.' />
        )}
      </div>
    </div>
  )
}
