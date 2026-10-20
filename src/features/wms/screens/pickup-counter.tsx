import { useState } from 'react'
import {
  CheckCircle2,
  History,
  Receipt,
  RotateCcw,
  Store,
  UserCheck,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useWms } from '@/context/wms-provider'
import {
  CategoryAvatar,
} from '@/features/wms/components/visual/category-icons'
import type { PickupOrder } from '@/features/wms/domain/inventory'
import { EmptyState, PageHeader, cop, nf } from './ui-helpers'

export function PickupCounterScreen() {
  const { orders, skus, matchesScope, isReadOnly, registerPickup } = useWms()
  const [query, setQuery] = useState('')
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [receivedByName, setReceivedByName] = useState('')
  const [receivedByRut, setReceivedByRut] = useState('')
  const [docRef, setDocRef] = useState('REM-104501')
  const [quantities, setQuantities] = useState<Record<string, string>>({})

  const skuMap = new Map(skus.map((s) => [s.sku, s]))

  const readyOrders = orders
    .filter((o) => matchesScope(o.warehouse))
    .filter((o) => o.status === 'Preparado' || o.status === 'Retiro parcial')
    .filter((o) =>
      `${o.id} ${o.customer} ${o.customerRut}`
        .toLowerCase()
        .includes(query.toLowerCase())
    )

  const openOrder = (o: PickupOrder) => {
    setSelectedOrderId(o.id)
    const init: Record<string, string> = {}
    for (const l of o.lines) {
      init[l.sku] = String(Math.max(0, l.qtyOrdered - l.qtyPickedUp))
    }
    setQuantities(init)
    setDocRef(`REM-10${o.id.replace(/\D/g, '')}`)
  }

  const activeOrder =
    readyOrders.find((o) => o.id === selectedOrderId) ?? readyOrders[0] ?? null

  // Cargar saldo pendiente completo
  const handleFillAll = () => {
    if (!activeOrder) return
    const init: Record<string, string> = {}
    for (const l of activeOrder.lines) {
      init[l.sku] = String(Math.max(0, l.qtyOrdered - l.qtyPickedUp))
    }
    setQuantities(init)
  }

  // Cargar saldo de una línea específica
  const handleFillLine = (sku: string, pending: number) => {
    setQuantities((prev) => ({
      ...prev,
      [sku]: String(pending),
    }))
  }

  const totalOrdered =
    activeOrder?.lines.reduce((s, l) => s + l.qtyOrdered, 0) ?? 0
  const totalPicked =
    activeOrder?.lines.reduce((s, l) => s + l.qtyPickedUp, 0) ?? 0
  const progressPct = totalOrdered > 0 ? (totalPicked / totalOrdered) * 100 : 0

  const totalInvoiceCOP =
    activeOrder?.lines.reduce((acc, l) => {
      const cost = skuMap.get(l.sku)?.unitCost ?? 0
      return acc + l.qtyOrdered * cost
    }, 0) ?? 0

  return (
    <div className='space-y-6'>
      <PageHeader
        title='Mostrador de retiro en bodega'
        subtitle='Despacho de facturas multi-artículo con entrega total o parcial por línea y trazabilidad en COP.'
      />

      <div className='flex flex-wrap items-center gap-2.5'>
        <Input
          className='h-8 w-80 text-xs'
          placeholder='Buscar pedido (PED-XXXX), cliente o RUT/NIT…'
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <span className='ms-auto text-xs text-muted-foreground'>
          {readyOrders.length} facturas/pedidos preparados para entrega
        </span>
      </div>

      <div className='grid grid-cols-1 gap-5 lg:grid-cols-12 items-start'>
        {/* Lista Lateral de Facturas en Espera */}
        <div className='divide-y rounded-xl border bg-card lg:col-span-4 shadow-xs overflow-hidden'>
          <div className='bg-muted/30 px-4 py-2.5 border-b flex items-center justify-between'>
            <div className='flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
              <Store className='size-3.5' /> Facturas en Espera
            </div>
            <Badge variant='secondary' className='text-[10px] py-0'>
              {readyOrders.length}
            </Badge>
          </div>

          {readyOrders.length === 0 && (
            <EmptyState text='No hay pedidos preparados pendientes de retiro.' />
          )}

          {readyOrders.map((o) => {
            const isSelected = activeOrder?.id === o.id
            const totalPend = o.lines.reduce(
              (s, l) => s + (l.qtyOrdered - l.qtyPickedUp),
              0
            )

            return (
              <button
                key={o.id}
                type='button'
                onClick={() => openOrder(o)}
                className={`flex w-full flex-col gap-1.5 p-3.5 text-start transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-primary/10 border-l-4 border-l-primary'
                    : 'hover:bg-muted/30'
                }`}
              >
                <div className='flex items-center justify-between'>
                  <span className='font-mono text-xs font-bold text-foreground'>
                    {o.id}
                  </span>
                  <Badge
                    variant={
                      o.status === 'Retiro parcial' ? 'outline' : 'default'
                    }
                    className='text-[10px] py-0'
                  >
                    {o.status}
                  </Badge>
                </div>
                <div className='text-xs font-semibold text-foreground truncate'>
                  {o.customer}
                </div>
                <div className='flex items-center justify-between text-[11px] text-muted-foreground'>
                  <span>NIT: {o.customerRut}</span>
                  <span className='font-bold text-foreground'>
                    {nf(totalPend)} uds saldo ({o.lines.length} ítems)
                  </span>
                </div>
              </button>
            )
          })}
        </div>

        {/* Panel Kiosco Maestro-Detalle de Entrega */}
        <div className='rounded-xl border bg-card p-5 lg:col-span-8 shadow-xs space-y-5'>
          {!activeOrder ? (
            <EmptyState text='Selecciona un pedido de la lista para registrar el retiro.' />
          ) : (
            <form
              className='space-y-5'
              onSubmit={(e) => {
                e.preventDefault()
                if (!receivedByName.trim() || !receivedByRut.trim()) return
                const parsed: Record<string, number> = {}
                for (const l of activeOrder.lines) {
                  const defaultRem = l.qtyOrdered - l.qtyPickedUp
                  const raw = quantities[l.sku] ?? String(defaultRem)
                  parsed[l.sku] = Math.max(0, Math.floor(Number(raw) || 0))
                }
                registerPickup(activeOrder.id, {
                  receivedByName: receivedByName.trim(),
                  receivedByRut: receivedByRut.trim(),
                  docRef: docRef.trim() || 'REM-MOSTRADOR',
                  quantities: parsed,
                })
                setReceivedByName('')
                setReceivedByRut('')
              }}
            >
              {/* CABECERA FACTURA MAESTRO */}
              <div className='flex flex-wrap items-center justify-between gap-3 border-b pb-4'>
                <div>
                  <div className='flex items-center gap-2'>
                    <Receipt className='size-4 text-primary' />
                    <span className='font-mono text-sm font-bold text-foreground'>
                      {activeOrder.id}
                    </span>
                    <Badge variant='outline' className='text-[10px] py-0 font-medium'>
                      {activeOrder.channel}
                    </Badge>
                    <span className='text-xs text-muted-foreground'>
                      Bodega: <strong>{activeOrder.warehouse}</strong>
                    </span>
                  </div>
                  <h3 className='text-base font-bold text-foreground mt-0.5'>
                    {activeOrder.customer}
                  </h3>
                  <div className='text-xs text-muted-foreground'>
                    RUT/NIT: <span className='font-mono font-medium'>{activeOrder.customerRut}</span>
                  </div>
                </div>

                <div className='text-end'>
                  <div className='text-xs text-muted-foreground'>Total Factura</div>
                  <div className='text-base font-bold tabular-nums text-foreground'>
                    {cop(totalInvoiceCOP)} COP
                  </div>
                </div>
              </div>

              {/* Medidor visual de progreso acumulado */}
              <div className='rounded-lg border bg-muted/20 p-3 space-y-1.5'>
                <div className='flex justify-between text-xs'>
                  <span className='text-muted-foreground font-medium'>
                    Progreso acumulado de la factura:
                  </span>
                  <span className='font-bold tabular-nums text-foreground'>
                    {nf(totalPicked)} / {nf(totalOrdered)} uds entregadas ({progressPct.toFixed(0)}%)
                  </span>
                </div>
                <div className='h-2.5 w-full overflow-hidden rounded-full bg-muted'>
                  <div
                    className={`h-full rounded-full transition-all ${
                      totalPicked === totalOrdered ? 'bg-emerald-500' : 'bg-primary'
                    }`}
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>

              {/* DETALLE MULTI-ARTÍCULO: Despacho por Línea */}
              <div className='space-y-3'>
                <div className='flex items-center justify-between'>
                  <label className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
                    Líneas a despachar en esta entrega ({activeOrder.lines.length} productos):
                  </label>
                  <Button
                    type='button'
                    variant='ghost'
                    size='sm'
                    className='h-6 text-xs text-primary gap-1'
                    onClick={handleFillAll}
                  >
                    <RotateCcw className='size-3' /> Cargar saldo completo de la factura
                  </Button>
                </div>

                <div className='overflow-x-auto rounded-lg border divide-y bg-background'>
                  {activeOrder.lines.map((l) => {
                    const skuObj = skuMap.get(l.sku)
                    const pending = Math.max(0, l.qtyOrdered - l.qtyPickedUp)
                    const cost = skuObj?.unitCost ?? 0
                    const currentVal = quantities[l.sku] ?? String(pending)

                    return (
                      <div
                        key={l.sku}
                        className='flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 p-3 text-xs'
                      >
                        {/* Producto */}
                        <div className='flex items-start gap-2.5 min-w-0 flex-1'>
                          <CategoryAvatar
                            category={skuObj?.category ?? 'Otros'}
                            size='sm'
                          />
                          <div className='min-w-0'>
                            <div className='font-bold text-foreground truncate'>
                              {skuObj?.name ?? l.sku}
                            </div>
                            <div className='text-[11px] text-muted-foreground font-mono'>
                              {l.sku} · {cop(cost)} COP / {skuObj?.unitMeasure}
                              {skuObj?.conversions?.[0]
                                ? ` (1 ${skuObj.unitMeasure} = ${skuObj.conversions[0].factor} ${skuObj.conversions[0].targetUnit})`
                                : ''}
                            </div>
                            <div className='text-[10px] text-muted-foreground mt-0.5'>
                              Ordenado: <strong>{l.qtyOrdered}</strong> | Ya entregado:{' '}
                              <strong>{l.qtyPickedUp}</strong> |{' '}
                              <span className='text-blue-600 dark:text-blue-400 font-semibold'>
                                Saldo: {pending} {skuObj?.unitMeasure.toLowerCase()}s
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Input de cantidad a entregar y botón de saldo */}
                        <div className='flex items-center gap-2 shrink-0'>
                          <div className='space-y-1 text-end'>
                            <Input
                              type='number'
                              min={0}
                              max={pending}
                              value={currentVal}
                              onChange={(e) =>
                                setQuantities({
                                  ...quantities,
                                  [l.sku]: e.target.value,
                                })
                              }
                              className='h-8 w-24 text-center font-bold text-xs'
                            />
                            <div className='text-[10px] text-muted-foreground'>
                              {skuObj?.unitMeasure}s
                              {skuObj?.conversions?.[0] && Number(currentVal) > 0
                                ? ` (~${(Number(currentVal) * skuObj.conversions[0].factor).toFixed(1)} ${skuObj.conversions[0].targetUnit})`
                                : ''}
                            </div>
                          </div>

                          <Button
                            type='button'
                            variant='outline'
                            size='sm'
                            className='h-8 text-[11px] px-2'
                            onClick={() => handleFillLine(l.sku, pending)}
                            title='Entregar todo el saldo de este producto'
                          >
                            Todo ({pending})
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* IDENTIFICACIÓN DEL RECEPTOR */}
              <div className='rounded-lg border bg-muted/10 p-3.5 space-y-3'>
                <div className='flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
                  <UserCheck className='size-3.5 text-primary' />
                  <span>Acta de Entrega / Identificación de quien retira</span>
                </div>

                <div className='grid grid-cols-1 sm:grid-cols-3 gap-3'>
                  <div className='space-y-1'>
                    <label className='text-[11px] font-medium'>
                      Nombre y Apellido Receptor
                    </label>
                    <Input
                      required
                      className='h-8 text-xs'
                      value={receivedByName}
                      onChange={(e) => setReceivedByName(e.target.value)}
                      placeholder='Ej. Carlos Mendoza'
                    />
                  </div>
                  <div className='space-y-1'>
                    <label className='text-[11px] font-medium'>
                      Cédula / RUT Receptor
                    </label>
                    <Input
                      required
                      className='h-8 text-xs font-mono'
                      value={receivedByRut}
                      onChange={(e) => setReceivedByRut(e.target.value)}
                      placeholder='10.450.890'
                    />
                  </div>
                  <div className='space-y-1'>
                    <label className='text-[11px] font-medium'>
                      N° Remisión / Guía Despacho
                    </label>
                    <Input
                      className='h-8 text-xs font-mono'
                      value={docRef}
                      onChange={(e) => setDocRef(e.target.value)}
                      placeholder='REM-104501'
                    />
                  </div>
                </div>
              </div>

              {/* HISTÓRICO DE DESPACHOS PREVIOS EN EL MOSTRADOR */}
              <div className='space-y-2 border-t pt-3'>
                <div className='flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
                  <History className='size-3.5' />
                  <span>Histórico de Entregas Previas ({activeOrder.pickups.length} remisiones)</span>
                </div>

                {activeOrder.pickups.length === 0 ? (
                  <p className='text-xs text-muted-foreground italic rounded-md border border-dashed p-2.5 text-center'>
                    Esta factura aún no registra entregas parciales previas.
                  </p>
                ) : (
                  <div className='space-y-1.5'>
                    {activeOrder.pickups.map((p, idx) => (
                      <div
                        key={`${p.ts}-${idx}`}
                        className='flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/20 p-2 text-xs'
                      >
                        <div className='flex items-center gap-2'>
                          <Badge variant='outline' className='font-mono text-[10px] py-0'>
                            #{p.docRef}
                          </Badge>
                          <span className='text-muted-foreground text-[11px]'>
                            {p.ts}
                          </span>
                          <span className='font-medium text-foreground'>
                            · Recibió: {p.receivedByName} ({p.receivedByRut})
                          </span>
                        </div>
                        <div className='flex flex-wrap gap-1'>
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

              {/* Botón de confirmación */}
              <div className='flex justify-end pt-2 border-t'>
                <Button
                  type='submit'
                  disabled={
                    isReadOnly ||
                    !receivedByName.trim() ||
                    !receivedByRut.trim()
                  }
                  className='h-9 text-xs px-5 bg-emerald-600 hover:bg-emerald-700 text-white'
                >
                  <CheckCircle2 className='mr-1.5 size-4' />
                  Confirmar Entrega en Mostrador
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
