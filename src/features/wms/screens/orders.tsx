import { useState } from 'react'
import {
  AlertTriangle,
  Building2,
  ChevronDown,
  ChevronUp,
  Clock,
  FileSpreadsheet,
  Globe,
  History,
  Plus,
  Receipt,
  Store,
  Trash2,
  UserCheck,
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
import { Textarea } from '@/components/ui/textarea'
import { useWms } from '@/context/wms-provider'
import { CategoryAvatar } from '@/features/wms/components/visual/category-icons'
import {
  PICKUP_OVERDUE_DAYS,
  daysBetween,
  formatQtyWithEquivalent,
  type PickupOrder,
} from '@/features/wms/domain/inventory'
import { EmptyState, KpiCard, PageHeader, cop, nf } from './ui-helpers'

const TODAY_STR = '2026-10-20'

const SAMPLE_CSV = `cliente,sku,cantidad,bodega
Constructora Santa María,POR-60120-CAL,30,BOD-CEN-01
Instaladores Norte,ADH-FLEX-25K,50,BOD-MOR-04
Remodelaciones Sur,CER-4545-TER,40,BOD-OBR-02`

interface OrderFormLine {
  id: string
  sku: string
  qty: string
}

export function OrdersScreen({
  onGoToPickup,
}: {
  onGoToPickup: () => void
}) {
  const {
    role,
    warehouses,
    skus,
    orders,
    partidas,
    buckets,
    matchesScope,
    createOrder,
    importOrdersCsv,
    prepareOrder,
    cancelOrder,
  } = useWms()

  const canManage = role === 'ADM' || role === 'JB'
  const [filter, setFilter] = useState<
    'ALL' | 'ACTIVE' | 'OVERDUE' | 'DELIVERED'
  >('ALL')
  const [newOpen, setNewOpen] = useState(false)
  const [csvOpen, setCsvOpen] = useState(false)
  const [expandedHistories, setExpandedHistories] = useState<Record<string, boolean>>({})

  // Formulario creación nuevo pedido multi-línea
  const [customer, setCustomer] = useState('')
  const [customerRut, setCustomerRut] = useState('901.440.120-8')
  const [channel, setChannel] = useState<PickupOrder['channel']>('Mostrador')
  const [wh, setWh] = useState(warehouses[0]?.id ?? 'BOD-CEN-01')
  const [formLines, setFormLines] = useState<OrderFormLine[]>([
    { id: 'line-1', sku: skus[0]?.sku ?? 'POR-60120-CAL', qty: '20' },
  ])

  // Import CSV
  const [csvText, setCsvText] = useState(SAMPLE_CSV)
  const [csvErrors, setCsvErrors] = useState<string[]>([])

  const skuMap = new Map(skus.map((s) => [s.sku, s]))
  const scoped = orders.filter((o) => matchesScope(o.warehouse))

  const isOverdue = (o: PickupOrder) => {
    if (
      o.status !== 'Reservado' &&
      o.status !== 'Preparado' &&
      o.status !== 'Retiro parcial'
    )
      return false
    return daysBetween(o.readyAt ?? o.createdAt, TODAY_STR) > PICKUP_OVERDUE_DAYS
  }

  const list = scoped.filter((o) => {
    if (filter === 'ACTIVE')
      return (
        o.status === 'Reservado' ||
        o.status === 'Preparado' ||
        o.status === 'Retiro parcial'
      )
    if (filter === 'OVERDUE') return isOverdue(o)
    if (filter === 'DELIVERED') return o.status === 'Entregado'
    return true
  })

  const readyCount = scoped.filter(
    (o) => o.status === 'Preparado' || o.status === 'Retiro parcial'
  ).length

  const getChannelBadge = (ch: PickupOrder['channel']) => {
    switch (ch) {
      case 'Mostrador':
        return (
          <Badge variant='outline' className='text-[10px] py-0 border-blue-300 text-blue-600 gap-1'>
            <Store className='size-3' /> Mostrador
          </Badge>
        )
      case 'Obra':
        return (
          <Badge variant='outline' className='text-[10px] py-0 border-amber-300 text-amber-600 gap-1'>
            <Building2 className='size-3' /> Obra
          </Badge>
        )
      case 'Web':
        return (
          <Badge variant='outline' className='text-[10px] py-0 border-purple-300 text-purple-600 gap-1'>
            <Globe className='size-3' /> Web
          </Badge>
        )
    }
  }

  // Handlers para agregar / quitar líneas en el formulario dinámico
  const handleAddFormLine = () => {
    setFormLines((prev) => [
      ...prev,
      {
        id: `line-${Date.now()}-${prev.length + 1}`,
        sku: skus[prev.length % skus.length]?.sku ?? 'POR-60120-CAL',
        qty: '10',
      },
    ])
  }

  const handleRemoveFormLine = (id: string) => {
    if (formLines.length <= 1) {
      toast.error('El pedido debe tener al menos un artículo')
      return
    }
    setFormLines((prev) => prev.filter((l) => l.id !== id))
  }

  const handleUpdateFormLine = (
    id: string,
    field: 'sku' | 'qty',
    val: string
  ) => {
    setFormLines((prev) =>
      prev.map((l) => (l.id === id ? { ...l, [field]: val } : l))
    )
  }

  // Stock disponible de un SKU en la bodega seleccionada para el formulario
  const getAvailableStockInWh = (targetSku: string, targetWh: string) => {
    return partidas
      .filter((p) => p.sku === targetSku && p.warehouse === targetWh)
      .reduce((sum, p) => sum + p.qty.disponible, 0)
  }

  // Cálculo total estimado del nuevo pedido en COP
  const estimatedOrderTotalCOP = formLines.reduce((acc, line) => {
    const s = skuMap.get(line.sku)
    const q = Math.max(0, Math.floor(Number(line.qty) || 0))
    return acc + q * (s?.unitCost ?? 0)
  }, 0)

  const toggleHistory = (orderId: string) => {
    setExpandedHistories((prev) => ({
      ...prev,
      [orderId]: !prev[orderId],
    }))
  }

  return (
    <div className='space-y-6'>
      <PageHeader
        title='Pedidos por entregar (Retiro en bodega)'
        subtitle='Facturación multi-artículo (Maestro-Detalle), reserva FEFO automática y control de entregas parciales en COP.'
        actions={
          canManage ? (
            <div className='flex items-center gap-2'>
              <Button
                size='sm'
                variant='outline'
                className='text-xs'
                onClick={() => {
                  setCsvErrors([])
                  setCsvOpen(true)
                }}
              >
                <FileSpreadsheet className='mr-1.5 size-4 text-emerald-600' />
                Importar CSV
              </Button>
              <Button size='sm' onClick={() => setNewOpen(true)} className='text-xs'>
                <Plus className='mr-1.5 size-4' />
                Nuevo pedido
              </Button>
            </div>
          ) : undefined
        }
      />

      {/* KPI Cards */}
      <div className='grid grid-cols-2 gap-3 lg:grid-cols-4'>
        <KpiCard
          label='Pedidos activos por entregar'
          value={String(buckets.porEntregar.activeOrdersCount)}
          sub={`${nf(buckets.porEntregar.units)} uds reservadas`}
        />
        <KpiCard
          label='Valor comprometido'
          value={cop(buckets.porEntregar.valueCOP ?? buckets.porEntregar.valueUSD)}
          sub='Stock separado de disponible'
        />
        <KpiCard
          label='Listos en mostrador'
          value={String(readyCount)}
          sub='Preparados para entrega'
        />
        <KpiCard
          label={`Atrasados (> ${PICKUP_OVERDUE_DAYS} días)`}
          value={String(buckets.porEntregar.overdueOrdersCount)}
          sub='Requiere llamado de aviso'
          tone={
            buckets.porEntregar.overdueOrdersCount > 0
              ? 'text-destructive font-bold'
              : undefined
          }
        />
      </div>

      {/* Filter Tabs */}
      <div className='flex flex-wrap items-center gap-2 border-b pb-3'>
        {[
          { id: 'ALL', label: 'Todos los pedidos' },
          { id: 'ACTIVE', label: 'Pendientes de retiro' },
          {
            id: 'OVERDUE',
            label: `Atrasados (> ${PICKUP_OVERDUE_DAYS} días)`,
            alert: buckets.porEntregar.overdueOrdersCount > 0,
          },
          { id: 'DELIVERED', label: 'Entregados' },
        ].map((tab) => (
          <Button
            key={tab.id}
            size='sm'
            variant={filter === tab.id ? 'default' : 'outline'}
            className='h-7 text-xs px-3'
            onClick={() => setFilter(tab.id as typeof filter)}
          >
            {tab.label}
            {tab.alert && (
              <span className='ml-1.5 size-2 rounded-full bg-destructive' />
            )}
          </Button>
        ))}
      </div>

      {/* Orders List: Maestro-Detalle (Estructura Tipo Factura) */}
      <div className='space-y-4'>
        {list.map((o) => {
          const days = daysBetween(o.readyAt ?? o.createdAt, TODAY_STR)
          const overdue = isOverdue(o)
          const totalOrdered = o.lines.reduce((acc, l) => acc + l.qtyOrdered, 0)
          const totalPicked = o.lines.reduce((acc, l) => acc + l.qtyPickedUp, 0)
          const totalPending = Math.max(0, totalOrdered - totalPicked)
          const progressPct = totalOrdered > 0 ? (totalPicked / totalOrdered) * 100 : 0

          // Valor total de la factura
          const totalInvoiceCOP = o.lines.reduce((acc, l) => {
            const cost = skuMap.get(l.sku)?.unitCost ?? 0
            return acc + l.qtyOrdered * cost
          }, 0)

          const isHistoryOpen = !!expandedHistories[o.id]

          return (
            <div
              key={o.id}
              className={`rounded-xl border bg-card shadow-xs transition-all hover:border-primary/40 overflow-hidden ${
                overdue ? 'border-rose-300 dark:border-rose-900 ring-1 ring-rose-500/20' : ''
              }`}
            >
              {/* CABECERA MAESTRO (Master Factura) */}
              <div className='border-b bg-muted/20 p-4'>
                <div className='flex flex-wrap items-center justify-between gap-3'>
                  {/* Left: Folio, Estado, Canal, Cliente */}
                  <div className='flex flex-wrap items-center gap-2.5'>
                    <div className='flex items-center gap-1.5'>
                      <Receipt className='size-4 text-primary' />
                      <span className='font-mono text-sm font-bold text-foreground'>
                        {o.id}
                      </span>
                    </div>
                    <Badge
                      variant={
                        o.status === 'Entregado'
                          ? 'secondary'
                          : o.status === 'Cancelado'
                            ? 'outline'
                            : o.status === 'Retiro parcial'
                              ? 'outline'
                              : 'default'
                      }
                      className='text-xs font-semibold'
                    >
                      {o.status}
                    </Badge>
                    {getChannelBadge(o.channel)}
                    <span className='font-semibold text-foreground text-sm'>
                      {o.customer}
                    </span>
                    <span className='text-xs text-muted-foreground font-mono'>
                      (RUT/NIT: {o.customerRut})
                    </span>
                  </div>

                  {/* Right: Bodega, Fechas, Importe total */}
                  <div className='flex flex-wrap items-center gap-3'>
                    <div className='text-end'>
                      <div className='text-xs text-muted-foreground'>
                        Bodega: <strong className='text-primary'>{o.warehouse}</strong>
                      </div>
                      <div className='text-sm font-bold tabular-nums text-foreground'>
                        {cop(totalInvoiceCOP)} COP
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sub-bar: Fechas, Alerta atraso y Progreso de despacho */}
                <div className='mt-3 flex flex-wrap items-center justify-between gap-3 text-xs border-t pt-2.5'>
                  <div className='flex items-center gap-4 text-muted-foreground'>
                    <span className='flex items-center gap-1'>
                      <Clock className='size-3.5' /> Emisión: {o.createdAt}
                    </span>
                    {o.readyAt && <span>· Preparado: {o.readyAt}</span>}
                    {overdue && (
                      <Badge variant='destructive' className='text-[10px] py-0 gap-1'>
                        <AlertTriangle className='size-3' />
                        {days} días sin retirar (&gt;{PICKUP_OVERDUE_DAYS}d)
                      </Badge>
                    )}
                  </div>

                  {/* Progress bar */}
                  <div className='flex items-center gap-3 min-w-[240px]'>
                    <div className='text-[11px] text-muted-foreground whitespace-nowrap'>
                      Despachado: <strong>{nf(totalPicked)} / {nf(totalOrdered)} uds</strong> ({progressPct.toFixed(0)}%)
                    </div>
                    <div className='h-2 w-28 overflow-hidden rounded-full bg-muted'>
                      <div
                        className={`h-full rounded-full transition-all ${
                          totalPicked === totalOrdered ? 'bg-emerald-500' : 'bg-primary'
                        }`}
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* DETALLE DE ARTÍCULOS (Lines Detail Table) */}
              <div className='p-4 space-y-3'>
                <div className='flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
                  <span>Detalle de Artículos ({o.lines.length} productos)</span>
                  <span className='text-foreground font-medium lowercase'>
                    {nf(totalPending)} uds pendientes por retirar
                  </span>
                </div>

                <div className='overflow-x-auto rounded-lg border'>
                  <table className='w-full text-xs'>
                    <thead className='border-b bg-muted/30 text-left text-muted-foreground'>
                      <tr>
                        <th className='px-3 py-2 font-medium'>#</th>
                        <th className='px-3 py-2 font-medium'>Producto / SKU</th>
                        <th className='px-3 py-2 font-medium'>Partida Asignada (FEFO)</th>
                        <th className='px-3 py-2 text-right font-medium'>Precio Unit. COP</th>
                        <th className='px-3 py-2 text-center font-medium'>Solicitado</th>
                        <th className='px-3 py-2 text-center font-medium'>Entregado</th>
                        <th className='px-3 py-2 text-center font-medium'>Saldo Pendiente</th>
                        <th className='px-3 py-2 text-right font-medium'>Subtotal COP</th>
                      </tr>
                    </thead>
                    <tbody className='divide-y'>
                      {o.lines.map((l, idx) => {
                        const s = skuMap.get(l.sku)
                        const cost = s?.unitCost ?? 0
                        const pending = Math.max(0, l.qtyOrdered - l.qtyPickedUp)
                        const lineSubtotal = l.qtyOrdered * cost

                        return (
                          <tr key={l.sku} className='hover:bg-muted/10'>
                            <td className='px-3 py-2 text-muted-foreground font-mono'>
                              {idx + 1}
                            </td>
                            <td className='px-3 py-2'>
                              <div className='flex items-center gap-2'>
                                <CategoryAvatar
                                  category={s?.category ?? 'Otros'}
                                  size='sm'
                                />
                                <div>
                                  <div className='font-semibold text-foreground'>
                                    {s?.name ?? l.sku}
                                  </div>
                                  <div className='text-[10px] text-muted-foreground font-mono'>
                                    {l.sku} · {s?.unitMeasure}
                                    {s?.conversions?.[0]
                                      ? ` (1 ${s.unitMeasure} = ${s.conversions[0].factor} ${s.conversions[0].targetUnit})`
                                      : ''}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className='px-3 py-2'>
                              {l.allocations.length > 0 ? (
                                <div className='flex flex-wrap gap-1'>
                                  {l.allocations.map((a) => (
                                    <Badge
                                      key={a.partidaId}
                                      variant='outline'
                                      className='text-[9px] py-0 font-mono bg-muted/40'
                                    >
                                      {a.partidaId} ({a.qty}u){a.expiry ? ` exp:${a.expiry}` : ''}
                                    </Badge>
                                  ))}
                                </div>
                              ) : (
                                <span className='text-muted-foreground'>—</span>
                              )}
                            </td>
                            <td className='px-3 py-2 text-right tabular-nums text-muted-foreground'>
                              {cop(cost)}
                            </td>
                            <td className='px-3 py-2 text-center font-bold tabular-nums'>
                              {formatQtyWithEquivalent(l.qtyOrdered, s)}
                            </td>
                            <td className='px-3 py-2 text-center tabular-nums text-emerald-600 dark:text-emerald-400 font-semibold'>
                              {nf(l.qtyPickedUp)}
                            </td>
                            <td className='px-3 py-2 text-center tabular-nums font-bold text-foreground'>
                              {pending > 0 ? (
                                <span className='text-blue-600 dark:text-blue-400'>
                                  {nf(pending)}
                                </span>
                              ) : (
                                <span className='text-muted-foreground'>0 (Completo)</span>
                              )}
                            </td>
                            <td className='px-3 py-2 text-right font-bold tabular-nums text-foreground'>
                              {cop(lineSubtotal)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* HISTÓRICO DE ENTREGAS PARCIALES (Delivery History) */}
                <div className='border-t pt-3'>
                  <div className='flex items-center justify-between'>
                    <button
                      type='button'
                      onClick={() => toggleHistory(o.id)}
                      className='flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline cursor-pointer'
                    >
                      <History className='size-3.5' />
                      <span>
                        Histórico de despachos y entregas ({o.pickups.length} remisiones)
                      </span>
                      {isHistoryOpen ? (
                        <ChevronUp className='size-3.5' />
                      ) : (
                        <ChevronDown className='size-3.5' />
                      )}
                    </button>

                    {/* Botones de acción del pedido */}
                    <div className='flex items-center gap-2'>
                      {canManage && o.status === 'Reservado' && (
                        <Button
                          size='sm'
                          className='h-7 text-xs px-2.5'
                          onClick={() => prepareOrder(o.id)}
                        >
                          Preparar en Mostrador
                        </Button>
                      )}
                      {(o.status === 'Preparado' || o.status === 'Retiro parcial') && (
                        <Button
                          size='sm'
                          className='h-7 text-xs px-3 bg-emerald-600 hover:bg-emerald-700 text-white'
                          onClick={onGoToPickup}
                        >
                          Despachar en Mostrador
                        </Button>
                      )}
                      {canManage &&
                        (o.status === 'Reservado' || o.status === 'Preparado') && (
                          <Button
                            size='sm'
                            variant='ghost'
                            className='h-7 text-xs text-muted-foreground hover:text-destructive px-2'
                            onClick={() => cancelOrder(o.id)}
                          >
                            Cancelar
                          </Button>
                        )}
                    </div>
                  </div>

                  {/* Panel desplegable de despachos */}
                  {isHistoryOpen && (
                    <div className='mt-2.5 space-y-2 rounded-lg border bg-muted/20 p-3'>
                      {o.pickups.length === 0 ? (
                        <p className='text-xs text-muted-foreground italic text-center py-2'>
                          No se han registrado entregas parciales para este pedido todavía.
                        </p>
                      ) : (
                        <div className='space-y-2'>
                          {o.pickups.map((p, pIdx) => (
                            <div
                              key={`${p.ts}-${pIdx}`}
                              className='flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-md border bg-background p-2.5 text-xs'
                            >
                              <div className='space-y-0.5'>
                                <div className='flex items-center gap-2'>
                                  <Badge variant='outline' className='font-mono text-[10px] py-0'>
                                    Remisión #{p.docRef}
                                  </Badge>
                                  <span className='text-[10px] text-muted-foreground font-mono'>
                                    {p.ts}
                                  </span>
                                </div>
                                <div className='flex items-center gap-1.5 text-muted-foreground text-[11px]'>
                                  <UserCheck className='size-3 text-primary' />
                                  <span>Recibió: <strong>{p.receivedByName}</strong> (Cédula/RUT: {p.receivedByRut})</span>
                                </div>
                              </div>

                              <div className='flex flex-wrap items-center gap-1.5 pt-1 sm:pt-0 border-t sm:border-t-0'>
                                {p.items.map((it) => (
                                  <Badge
                                    key={it.sku}
                                    variant='secondary'
                                    className='text-[10px] py-0 font-mono'
                                  >
                                    {it.sku}: +{nf(it.qty)} uds
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}

        {list.length === 0 && (
          <EmptyState text='No hay pedidos que coincidan con el filtro seleccionado.' />
        )}
      </div>

      {/* Modal Nuevo Pedido Dinámico Multi-Artículo */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className='sm:max-w-xl max-h-[90vh] overflow-y-auto'>
          <DialogHeader>
            <DialogTitle className='flex items-center justify-between text-base'>
              <span>Crear Pedido Multi-Artículo (Factura)</span>
              <Badge variant='outline' className='font-mono text-xs'>
                Moneda: COP
              </Badge>
            </DialogTitle>
          </DialogHeader>

          <form
            className='space-y-4 pt-2'
            onSubmit={(e) => {
              e.preventDefault()
              if (!customer.trim() || !customerRut.trim()) {
                toast.error('Ingresa cliente y RUT/NIT')
                return
              }

              // Validar líneas
              const cleanLines: { sku: string; qty: number }[] = []
              for (const l of formLines) {
                const q = Math.floor(Number(l.qty) || 0)
                if (q <= 0) {
                  toast.error(`Ingresa una cantidad mayor a 0 para el producto ${l.sku}`)
                  return
                }
                const avail = getAvailableStockInWh(l.sku, wh)
                if (q > avail) {
                  toast.error(
                    `Stock insuficiente para ${l.sku} en ${wh}: disponible ${avail}, solicitado ${q}`
                  )
                  return
                }
                cleanLines.push({ sku: l.sku, qty: q })
              }

              if (cleanLines.length === 0) {
                toast.error('Agrega al menos un artículo')
                return
              }

              const success = createOrder({
                customer: customer.trim(),
                customerRut: customerRut.trim(),
                channel,
                warehouse: wh,
                lines: cleanLines,
              })

              if (success) {
                setCustomer('')
                setFormLines([
                  { id: 'line-1', sku: skus[0]?.sku ?? 'POR-60120-CAL', qty: '20' },
                ])
                setNewOpen(false)
              }
            }}
          >
            {/* Datos de Cabecera */}
            <div className='rounded-lg border bg-muted/20 p-3 space-y-3 text-xs'>
              <div className='font-semibold text-foreground uppercase tracking-wider text-[11px]'>
                1. Datos del Cliente y Despacho
              </div>

              <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                <div className='space-y-1'>
                  <label className='font-medium'>Cliente / Razón Social</label>
                  <Input
                    required
                    className='h-8 text-xs'
                    value={customer}
                    onChange={(e) => setCustomer(e.target.value)}
                    placeholder='Ej. Constructora Andina S.A.S.'
                  />
                </div>
                <div className='space-y-1'>
                  <label className='font-medium'>RUT / NIT Cliente</label>
                  <Input
                    required
                    className='h-8 text-xs font-mono'
                    value={customerRut}
                    onChange={(e) => setCustomerRut(e.target.value)}
                    placeholder='901.440.120-8'
                  />
                </div>
                <div className='space-y-1'>
                  <label className='font-medium'>Canal de Venta</label>
                  <select
                    className='h-8 w-full rounded-md border bg-background px-2 text-xs'
                    value={channel}
                    onChange={(e) =>
                      setChannel(e.target.value as PickupOrder['channel'])
                    }
                  >
                    <option value='Mostrador'>Mostrador</option>
                    <option value='Obra'>Obra</option>
                    <option value='Web'>Web</option>
                  </select>
                </div>
                <div className='space-y-1'>
                  <label className='font-medium'>Bodega de Retiro</label>
                  <select
                    className='h-8 w-full rounded-md border bg-background px-2 text-xs'
                    value={wh}
                    onChange={(e) => setWh(e.target.value)}
                  >
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.id} · {w.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Grilla Dinámica de Artículos */}
            <div className='space-y-2.5'>
              <div className='flex items-center justify-between'>
                <span className='font-semibold text-xs text-foreground uppercase tracking-wider'>
                  2. Artículos del Pedido ({formLines.length})
                </span>
                <Button
                  type='button'
                  size='sm'
                  variant='outline'
                  className='h-7 text-xs gap-1 text-primary'
                  onClick={handleAddFormLine}
                >
                  <Plus className='size-3.5' /> Agregar producto
                </Button>
              </div>

              <div className='space-y-2 max-h-60 overflow-y-auto pr-1'>
                {formLines.map((line, idx) => {
                  const s = skuMap.get(line.sku)
                  const unitPrice = s?.unitCost ?? 0
                  const q = Math.max(0, Math.floor(Number(line.qty) || 0))
                  const subtotal = q * unitPrice
                  const avail = getAvailableStockInWh(line.sku, wh)

                  return (
                    <div
                      key={line.id}
                      className='flex items-center gap-2 rounded-lg border bg-background p-2.5 text-xs'
                    >
                      <span className='font-mono text-muted-foreground w-4 text-center'>
                        {idx + 1}
                      </span>

                      {/* Selector de Producto */}
                      <div className='flex-1 min-w-0'>
                        <select
                          className='h-8 w-full rounded-md border bg-background px-2 text-xs'
                          value={line.sku}
                          onChange={(e) =>
                            handleUpdateFormLine(line.id, 'sku', e.target.value)
                          }
                        >
                          {skus.map((sk) => (
                            <option key={sk.sku} value={sk.sku}>
                              {sk.sku} · {sk.name}
                            </option>
                          ))}
                        </select>
                        <div className='mt-1 flex items-center justify-between text-[11px] text-muted-foreground'>
                          <span>
                            Precio: <strong>{cop(unitPrice)} COP</strong>
                          </span>
                          <span
                            className={
                              avail < q
                                ? 'text-destructive font-bold'
                                : 'text-emerald-600 dark:text-emerald-400'
                            }
                          >
                            Disponible en {wh}: {avail} {s?.unitMeasure}s
                            {s?.conversions?.[0]
                              ? ` (~${(avail * s.conversions[0].factor).toFixed(2)} ${s.conversions[0].targetUnit})`
                              : ''}
                          </span>
                        </div>
                      </div>

                      {/* Cantidad */}
                      <div className='w-24 shrink-0 space-y-1'>
                        <Input
                          type='number'
                          min={1}
                          className='h-8 text-center text-xs font-bold'
                          value={line.qty}
                          onChange={(e) =>
                            handleUpdateFormLine(line.id, 'qty', e.target.value)
                          }
                        />
                        <div className='text-[10px] text-center text-muted-foreground truncate'>
                          {s?.unitMeasure}s
                          {s?.conversions?.[0] && q > 0
                            ? ` (~${(q * s.conversions[0].factor).toFixed(1)} ${s.conversions[0].targetUnit})`
                            : ''}
                        </div>
                      </div>

                      {/* Subtotal */}
                      <div className='w-28 text-end shrink-0'>
                        <span className='font-bold tabular-nums text-foreground'>
                          {cop(subtotal)}
                        </span>
                        <span className='block text-[10px] text-muted-foreground'>
                          Subtotal
                        </span>
                      </div>

                      {/* Botón eliminar */}
                      <button
                        type='button'
                        onClick={() => handleRemoveFormLine(line.id)}
                        className='text-muted-foreground hover:text-destructive p-1 rounded transition-colors'
                        title='Eliminar artículo'
                      >
                        <Trash2 className='size-4' />
                      </button>
                    </div>
                  )
                })}
              </div>

              {/* Pie de Factura Estimado */}
              <div className='flex items-center justify-between border-t pt-3'>
                <span className='text-xs font-medium text-muted-foreground'>
                  Importe Total Estimado de Factura:
                </span>
                <span className='text-base font-bold tabular-nums text-primary'>
                  {cop(estimatedOrderTotalCOP)} COP
                </span>
              </div>
            </div>

            <div className='flex justify-end gap-2 border-t pt-3'>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={() => setNewOpen(false)}
              >
                Cancelar
              </Button>
              <Button type='submit' size='sm'>
                Crear Factura / Pedido
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Import CSV */}
      <Dialog open={csvOpen} onOpenChange={setCsvOpen}>
        <DialogContent className='sm:max-w-lg'>
          <DialogHeader>
            <DialogTitle>Importar pedidos desde CSV</DialogTitle>
          </DialogHeader>
          <div className='space-y-3 pt-2 text-xs'>
            <p className='text-muted-foreground'>
              Formato esperado: <code>cliente,sku,cantidad,bodega</code>
            </p>
            <Textarea
              rows={6}
              className='font-mono text-xs'
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
            />
            {csvErrors.length > 0 && (
              <div className='rounded-md border border-destructive/40 bg-destructive/10 p-2 text-destructive'>
                {csvErrors.map((err, i) => (
                  <div key={i}>{err}</div>
                ))}
              </div>
            )}
            <div className='flex justify-end gap-2'>
              <Button
                variant='outline'
                size='sm'
                onClick={() => setCsvOpen(false)}
              >
                Cerrar
              </Button>
              <Button
                size='sm'
                onClick={() => {
                  const res = importOrdersCsv(csvText)
                  if (res.errors.length > 0) {
                    setCsvErrors(res.errors)
                  } else {
                    setCsvOpen(false)
                  }
                }}
              >
                Procesar importación
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
