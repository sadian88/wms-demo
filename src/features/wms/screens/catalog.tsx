import { useState } from 'react'
import {
  Boxes,
  Calculator,
  Check,
  Edit2,
  Package,
  Plus,
  Ruler,
  Search,
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
import {
  type SkuItem,
  type StandardUnit,
} from '@/features/wms/domain/inventory'
import { EmptyState, KpiCard, PageHeader, cop, nf } from './ui-helpers'

export function CatalogScreen() {
  const { skus, partidas, isReadOnly, createSku, updateSkuCatalog } = useWms()

  const [query, setQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL')
  const [onlyWithConversion, setOnlyWithConversion] = useState(false)

  // Estado para modal de creación / edición de producto y conversión
  const [skuModalOpen, setSkuModalOpen] = useState(false)
  const [editingSku, setEditingSku] = useState<SkuItem | null>(null)
  const [skuFormCode, setSkuFormCode] = useState('')
  const [skuFormName, setSkuFormName] = useState('')
  const [skuFormCategory, setSkuFormCategory] = useState('Porcelanatos')
  const [skuFormBaseUnit, setSkuFormBaseUnit] = useState<StandardUnit>('Caja')
  const [skuFormCost, setSkuFormCost] = useState('85000')
  const [skuFormExpiry, setSkuFormExpiry] = useState(false)
  const [skuHasConversion, setSkuHasConversion] = useState(true)
  const [skuConvTargetUnit, setSkuConvTargetUnit] = useState<StandardUnit>('m²')
  const [skuConvFactor, setSkuConvFactor] = useState('1.44')
  const [skuConvDesc, setSkuConvDesc] = useState('')

  // Estado para la calculadora interactiva de conversión de bodega
  const [calcSku, setCalcSku] = useState(skus[0]?.sku ?? 'POR-60120-CAL')
  const [calcTargetQty, setCalcTargetQty] = useState('100')

  // Stock físico total acumulado por SKU en todas las bodegas
  const stockBySku = new Map<string, number>()
  for (const p of partidas) {
    const phys =
      p.qty.disponible +
      p.qty.reservado +
      p.qty.danado +
      p.qty.reclamo +
      p.qty.transito
    stockBySku.set(p.sku, (stockBySku.get(p.sku) ?? 0) + phys)
  }

  const categories = Array.from(new Set(skus.map((s) => s.category)))

  const filteredSkus = skus
    .filter((s) => {
      if (selectedCategory !== 'ALL' && s.category !== selectedCategory)
        return false
      if (onlyWithConversion && (!s.conversions || s.conversions.length === 0))
        return false
      if (!query.trim()) return true
      const haystack = `${s.sku} ${s.name} ${s.category} ${s.unitMeasure}`.toLowerCase()
      return haystack.includes(query.toLowerCase())
    })

  const openCreateSkuModal = () => {
    setEditingSku(null)
    setSkuFormCode('')
    setSkuFormName('')
    setSkuFormCategory('Porcelanatos')
    setSkuFormBaseUnit('Caja')
    setSkuFormCost('85000')
    setSkuFormExpiry(false)
    setSkuHasConversion(true)
    setSkuConvTargetUnit('m²')
    setSkuConvFactor('1.44')
    setSkuConvDesc('')
    setSkuModalOpen(true)
  }

  const openEditSkuModal = (s: SkuItem) => {
    setEditingSku(s)
    setSkuFormCode(s.sku)
    setSkuFormName(s.name)
    setSkuFormCategory(s.category)
    setSkuFormBaseUnit(s.unitMeasure)
    setSkuFormCost(String(s.unitCost))
    setSkuFormExpiry(s.requiresExpiry)
    if (s.conversions && s.conversions.length > 0) {
      setSkuHasConversion(true)
      setSkuConvTargetUnit(s.conversions[0].targetUnit)
      setSkuConvFactor(String(s.conversions[0].factor))
      setSkuConvDesc(s.conversions[0].description ?? '')
    } else {
      setSkuHasConversion(false)
      setSkuConvTargetUnit('m²')
      setSkuConvFactor('1.00')
      setSkuConvDesc('')
    }
    setSkuModalOpen(true)
  }

  const handleSaveSku = (e: React.FormEvent) => {
    e.preventDefault()
    const cost = Number(skuFormCost)
    if (!skuFormCode.trim() || !skuFormName.trim()) {
      toast.error('El código SKU y el nombre del producto son requeridos')
      return
    }
    if (isNaN(cost) || cost <= 0) {
      toast.error('El costo unitario debe ser un valor positivo')
      return
    }

    const conversions =
      skuHasConversion && Number(skuConvFactor) > 0
        ? [
            {
              targetUnit: skuConvTargetUnit,
              factor: Number(skuConvFactor),
              description:
                skuConvDesc.trim() ||
                `1 ${skuFormBaseUnit} = ${skuConvFactor} ${skuConvTargetUnit}`,
            },
          ]
        : []

    if (editingSku) {
      updateSkuCatalog(editingSku.sku, {
        name: skuFormName.trim(),
        category: skuFormCategory,
        unitMeasure: skuFormBaseUnit,
        unitCost: cost,
        requiresExpiry: skuFormExpiry,
        conversions,
      })
      setSkuModalOpen(false)
    } else {
      const ok = createSku({
        sku: skuFormCode.trim().toUpperCase(),
        name: skuFormName.trim(),
        category: skuFormCategory,
        unitMeasure: skuFormBaseUnit,
        unitCost: cost,
        requiresExpiry: skuFormExpiry,
        conversions,
      })
      if (ok) setSkuModalOpen(false)
    }
  }

  return (
    <div className='space-y-6'>
      <PageHeader
        title='Catálogo de Productos y Conversión de Unidades'
        subtitle='Maestro de SKUs, unidades base físicas de bodega (Caja, Saco, Tira), factores de conversión a unidades de venta/obra (m², kg, m, L) y calculadora en tiempo real.'
        actions={
          !isReadOnly ? (
            <Button
              size='sm'
              onClick={openCreateSkuModal}
              className='gap-1.5 text-xs shadow-xs'
            >
              <Plus className='size-4' />
              + Crear Nuevo Producto
            </Button>
          ) : undefined
        }
      />

      {/* KPI Cards */}
      <div className='grid grid-cols-2 gap-3 lg:grid-cols-4'>
        <KpiCard
          label='Total SKUs Registrados'
          value={`${skus.length} productos`}
          sub='Catálogo maestro de bodegas'
        />
        <KpiCard
          label='Con Conversión Parametrizada'
          value={`${skus.filter((s) => (s.conversions?.length ?? 0) > 0).length} SKUs`}
          sub='Equivalencia m², kg, m, L activa'
        />
        <KpiCard
          label='Control Vencimiento FEFO'
          value={`${skus.filter((s) => s.requiresExpiry).length} SKUs`}
          sub='Perecederos monitoreados'
        />
        <KpiCard
          label='Costo Promedio Catálogo'
          value={cop(
            Math.round(
              skus.reduce((a, s) => a + s.unitCost, 0) /
                Math.max(1, skus.length)
            )
          )}
          sub='Valor unitario de referencia COP'
        />
      </div>

      {/* Filtros y Búsqueda */}
      <div className='flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-3 shadow-2xs'>
        <div className='flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]'>
          <div className='relative flex-1 min-w-[200px]'>
            <Search className='absolute left-2.5 top-2.5 size-3.5 text-muted-foreground' />
            <Input
              placeholder='Buscar por código SKU, nombre o categoría...'
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className='h-8 pl-8 text-xs'
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className='h-8 rounded-md border bg-background px-3 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary'
          >
            <option value='ALL'>Todas las categorías</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <label className='inline-flex items-center gap-2 text-xs font-medium cursor-pointer'>
          <input
            type='checkbox'
            checked={onlyWithConversion}
            onChange={(e) => setOnlyWithConversion(e.target.checked)}
            className='rounded border-gray-300'
          />
          <span>Solo con conversión (m², kg, m)</span>
        </label>
      </div>

      {/* Tabla de Productos y Conversiones */}
      <div className='overflow-x-auto rounded-xl border bg-card shadow-xs'>
        <table className='w-full text-xs'>
          <thead className='border-b bg-muted/40 text-left text-muted-foreground'>
            <tr>
              <th className='px-4 py-3 font-semibold'>Producto / Categoría</th>
              <th className='px-3.5 py-3 font-semibold'>SKU</th>
              <th className='px-3.5 py-3 font-semibold'>Unidad Base</th>
              <th className='px-3.5 py-3 font-semibold'>Factor de Conversión (Equivalencia)</th>
              <th className='px-3.5 py-3 font-semibold'>Stock en Bodegas</th>
              <th className='px-3.5 py-3 font-semibold'>Costo COP</th>
              <th className='px-3.5 py-3 font-semibold'>Control FEFO</th>
              {!isReadOnly && (
                <th className='px-4 py-3 text-right font-semibold'>Acción</th>
              )}
            </tr>
          </thead>
          <tbody className='divide-y'>
            {filteredSkus.map((s) => {
              const conv = s.conversions?.[0]
              const totalStock = stockBySku.get(s.sku) ?? 0

              return (
                <tr key={s.sku} className='hover:bg-muted/20 transition-colors'>
                  <td className='px-4 py-3'>
                    <div className='flex items-center gap-3'>
                      <CategoryAvatar category={s.category} size='md' />
                      <div className='min-w-0'>
                        <div className='font-bold text-foreground text-xs leading-snug'>
                          {s.name}
                        </div>
                        <CategoryBadge
                          category={s.category}
                          className='text-[9px] py-0 px-1.5 mt-1'
                        />
                      </div>
                    </div>
                  </td>
                  <td className='px-3.5 py-3 font-mono font-bold text-primary'>
                    {s.sku}
                  </td>
                  <td className='px-3.5 py-3'>
                    <Badge variant='outline' className='text-xs font-semibold px-2 py-0.5'>
                      {s.unitMeasure}
                    </Badge>
                  </td>
                  <td className='px-3.5 py-3'>
                    {conv ? (
                      <div className='space-y-1'>
                        <Badge className='bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 text-xs font-mono gap-1.5 py-0.5 px-2'>
                          <Ruler className='size-3.5 text-indigo-600' />
                          1 {s.unitMeasure} = {conv.factor} {conv.targetUnit}
                        </Badge>
                        {conv.description && (
                          <div className='text-[11px] text-muted-foreground'>
                            {conv.description}
                          </div>
                        )}
                      </div>
                    ) : (
                      <Badge variant='secondary' className='text-[10px] text-muted-foreground'>
                        1 a 1 (Directo)
                      </Badge>
                    )}
                  </td>
                  <td className='px-3.5 py-3'>
                    <div className='flex items-center gap-1.5'>
                      <Package className='size-3.5 text-muted-foreground' />
                      <span className='font-bold tabular-nums text-foreground'>
                        {nf(totalStock)} {s.unitMeasure.toLowerCase()}s
                      </span>
                    </div>
                    {conv && totalStock > 0 && (
                      <div className='text-[10px] text-muted-foreground font-medium pl-5'>
                        ~{(totalStock * conv.factor).toFixed(1)} {conv.targetUnit}
                      </div>
                    )}
                  </td>
                  <td className='px-3.5 py-3 font-bold tabular-nums text-foreground'>
                    {cop(s.unitCost)}
                  </td>
                  <td className='px-3.5 py-3'>
                    <Badge
                      variant={s.requiresExpiry ? 'destructive' : 'secondary'}
                      className='text-[10px] py-0'
                    >
                      {s.requiresExpiry ? 'Sí (FEFO)' : 'No vence'}
                    </Badge>
                  </td>
                  {!isReadOnly && (
                    <td className='px-4 py-3 text-right'>
                      <Button
                        size='sm'
                        variant='outline'
                        className='h-7 text-xs px-2.5 gap-1.5 shadow-2xs hover:bg-muted'
                        onClick={() => openEditSkuModal(s)}
                      >
                        <Edit2 className='size-3' />
                        Parametrizar
                      </Button>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>

        {filteredSkus.length === 0 && (
          <EmptyState text='No se encontraron productos con los filtros seleccionados.' />
        )}
      </div>

      {/* Calculadora Interactiva de Conversión de Bodega */}
      {(() => {
        const targetSku = skus.find((s) => s.sku === calcSku) || skus[0]
        const conv = targetSku?.conversions?.[0]
        const factor = conv?.factor ?? 1
        const targetUnit = conv?.targetUnit ?? 'uds'
        const baseUnit = targetSku?.unitMeasure ?? 'Caja'
        const inputVal = Number(calcTargetQty) || 0
        const exactBase = factor > 0 ? inputVal / factor : inputVal
        const roundedBase = Math.ceil(exactBase)
        const realDelivered = Number((roundedBase * factor).toFixed(2))
        const diff = Number((realDelivered - inputVal).toFixed(2))
        const estCost = roundedBase * (targetSku?.unitCost ?? 0)

        return (
          <div className='rounded-xl border bg-muted/20 p-5 space-y-4 shadow-xs'>
            <div className='flex flex-wrap items-center justify-between gap-2 border-b pb-3'>
              <div className='flex items-center gap-2.5'>
                <div className='p-2 rounded-xl bg-primary/10 text-primary'>
                  <Calculator className='size-5' />
                </div>
                <div>
                  <h4 className='text-sm font-bold text-foreground'>
                    Calculadora y Conversor de Unidades en Tiempo Real
                  </h4>
                  <p className='text-xs text-muted-foreground'>
                    Calcula al instante pedidos de obra o clientes en metros/kilos a unidades físicas exactas de despacho en bodega para evitar mermas.
                  </p>
                </div>
              </div>
              <Badge variant='outline' className='text-xs font-mono border-primary/30 text-primary py-1 px-2.5'>
                Factor actual: 1 {baseUnit} = {factor} {targetUnit}
              </Badge>
            </div>

            <div className='grid grid-cols-1 md:grid-cols-12 gap-5 items-center'>
              <div className='md:col-span-5 space-y-2'>
                <label className='text-xs font-semibold text-foreground'>
                  1. Selecciona el Producto del Catálogo:
                </label>
                <select
                  value={calcSku}
                  onChange={(e) => setCalcSku(e.target.value)}
                  className='w-full rounded-md border bg-background px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs'
                >
                  {skus.map((s) => (
                    <option key={s.sku} value={s.sku}>
                      {s.sku} · {s.name} ({s.unitMeasure}
                      {s.conversions?.[0]
                        ? ` = ${s.conversions[0].factor} ${s.conversions[0].targetUnit}`
                        : ''}
                      )
                    </option>
                  ))}
                </select>
              </div>

              <div className='md:col-span-3 space-y-2'>
                <label className='text-xs font-semibold text-foreground'>
                  2. Requerimiento en {targetUnit}:
                </label>
                <div className='relative'>
                  <Input
                    type='number'
                    min={0.1}
                    step={0.1}
                    value={calcTargetQty}
                    onChange={(e) => setCalcTargetQty(e.target.value)}
                    className='h-9 text-sm font-extrabold tabular-nums pr-12 shadow-2xs'
                  />
                  <span className='absolute right-3 top-2.5 text-xs font-bold text-muted-foreground'>
                    {targetUnit}
                  </span>
                </div>
              </div>

              {/* Resultado destacado en tiempo real */}
              <div className='md:col-span-4 rounded-xl border bg-card p-4 shadow-sm space-y-2 border-primary/20'>
                <div className='flex items-center justify-between text-xs text-muted-foreground'>
                  <span>Resultado exacto:</span>
                  <span className='font-mono font-semibold'>
                    {exactBase.toFixed(2)} {baseUnit}s
                  </span>
                </div>
                <div className='flex items-center justify-between text-xs pt-1'>
                  <span className='font-bold text-foreground text-xs'>
                    Despacho cerrado:
                  </span>
                  <span className='text-base font-extrabold text-primary tabular-nums'>
                    {roundedBase} {baseUnit}
                    {roundedBase !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className='flex items-center justify-between text-[11px] text-muted-foreground pt-1.5 border-t'>
                  <span>Entrega real ({targetUnit}):</span>
                  <span className='font-bold text-emerald-600 dark:text-emerald-400'>
                    {realDelivered} {targetUnit} ({diff >= 0 ? `+${diff}` : diff}{' '}
                    merma/corte)
                  </span>
                </div>
                <div className='flex items-center justify-between text-[11px] text-muted-foreground'>
                  <span>Valor total estimado:</span>
                  <span className='font-bold text-foreground'>{cop(estCost)}</span>
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Modal Crear / Editar Producto y Factores de Conversión */}
      <Dialog
        open={skuModalOpen}
        onOpenChange={(open) => !open && setSkuModalOpen(false)}
      >
        <DialogContent className='max-w-lg'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2'>
              <Boxes className='size-5 text-primary' />
              {editingSku
                ? `Editar Producto · ${editingSku.sku}`
                : 'Crear Nuevo Producto en Catálogo'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveSku} className='space-y-4 pt-1 text-xs'>
            <div className='grid grid-cols-2 gap-3'>
              <div className='space-y-1.5'>
                <label className='font-semibold text-foreground'>
                  Código SKU *
                </label>
                <Input
                  required
                  disabled={!!editingSku}
                  placeholder='ej. POR-6060-BLA'
                  value={skuFormCode}
                  onChange={(e) => setSkuFormCode(e.target.value.toUpperCase())}
                  className='font-mono font-bold'
                />
              </div>

              <div className='space-y-1.5'>
                <label className='font-semibold text-foreground'>
                  Categoría *
                </label>
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
                {editingSku
                  ? 'Actualizar Producto'
                  : 'Guardar Producto en Catálogo'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

