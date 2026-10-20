import { useState } from 'react'
import {
  Calendar,
  Clock,
  Plus,
  Send,
  Truck,
  User,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useWms } from '@/context/wms-provider'
import {
  AgingChart,
  type AgingBucketData,
} from '@/features/wms/components/visual/aging-chart'
import {
  CRITICAL_STALE_DAYS,
  EXPIRY_WARN_DAYS,
  STALE_DAYS,
  daysBetween,
} from '@/features/wms/domain/inventory'
import { EmptyState, KpiCard, PageHeader, cop, nf } from './ui-helpers'

const TODAY_STR = '2026-10-20'

// 6.1 Reclamos y devoluciones
export function ClaimsScreen() {
  const {
    role,
    partidas,
    claims,
    buckets,
    matchesScope,
    openCustomerReturn,
    advanceClaim,
  } = useWms()

  const canAct = role === 'ADM' || role === 'JB'
  const scopedPartidas = partidas.filter((p) => matchesScope(p.warehouse))
  const list = claims.filter((c) => matchesScope(c.warehouse))

  const [retOpen, setRetOpen] = useState(false)
  const [customer, setCustomer] = useState('')
  const [docRef, setDocRef] = useState('GD-104490')
  const [partidaId, setPartidaId] = useState(scopedPartidas[0]?.id ?? '')
  const [qty, setQty] = useState('4')
  const [reason, setReason] = useState('Sobrante de obra en cajas cerradas')

  return (
    <div className='space-y-6'>
      <PageHeader
        title='Reclamos a proveedor y devoluciones de clientes'
        subtitle='Toda mercadería averiada o devuelta permanece aislada sin contaminar el stock vendible.'
        actions={
          canAct ? (
            <Button size='sm' onClick={() => setRetOpen(true)} className='text-xs'>
              <Plus className='mr-1.5 size-4' />
              Registrar devolución de cliente
            </Button>
          ) : undefined
        }
      />

      {/* KPI Cards */}
      <div className='grid grid-cols-2 gap-3 lg:grid-cols-3'>
        <KpiCard
          label='Unidades físicas en estado Reclamo'
          value={`${nf(buckets.porReclamar.units)} uds`}
          sub={cop(buckets.porReclamar.valueCOP ?? buckets.porReclamar.valueUSD)}
          tone={buckets.porReclamar.units > 0 ? 'text-amber-600' : undefined}
        />
        <KpiCard
          label='Casos abiertos (Proveedor + Cliente)'
          value={String(buckets.porReclamar.openClaimsCount)}
          sub='Pendientes de resolución'
        />
        <KpiCard
          label='Monto total reclamado abierto'
          value={cop(buckets.porReclamar.openClaimsCOP ?? buckets.porReclamar.openClaimsUSD)}
          sub='Incluye roturas y faltantes'
        />
      </div>

      {/* Pipeline & Lista de Reclamos */}
      <div className='space-y-3.5'>
        {list.length === 0 && (
          <EmptyState text='No hay reclamos ni devoluciones en la bodega seleccionada.' />
        )}
        {list.map((c) => {
          const isSupplier = c.type === 'Proveedor'
          const isResolved = c.status === 'Resuelto'

          return (
            <div
              key={c.id}
              className={`rounded-xl border bg-card p-4 shadow-xs transition-all hover:border-primary/40 space-y-3 ${
                isSupplier
                  ? 'border-l-4 border-l-blue-500'
                  : 'border-l-4 border-l-emerald-500'
              }`}
            >
              {/* Header */}
              <div className='flex flex-wrap items-center justify-between gap-2 border-b pb-2.5'>
                <div className='flex items-center gap-2'>
                  <span className='font-mono text-xs font-bold text-foreground'>
                    {c.id}
                  </span>
                  <Badge
                    variant={isSupplier ? 'default' : 'secondary'}
                    className='text-[10px] py-0 gap-1'
                  >
                    {isSupplier ? (
                      <>
                        <Truck className='size-3' /> Reclamo Proveedor
                      </>
                    ) : (
                      <>
                        <User className='size-3' /> Devolución Cliente
                      </>
                    )}
                  </Badge>
                  <span className='text-xs font-medium text-primary'>
                    {c.warehouse} · Partida: {c.partidaId}
                  </span>
                </div>

                <div className='flex items-center gap-2'>
                  <Badge
                    variant={
                      isResolved
                        ? 'secondary'
                        : c.status === 'Enviado'
                          ? 'default'
                          : 'outline'
                    }
                    className='text-xs'
                  >
                    {c.status}
                  </Badge>
                </div>
              </div>

              {/* Case Details & Flow */}
              <div className='grid grid-cols-1 sm:grid-cols-12 gap-3 items-center'>
                <div className='sm:col-span-7 space-y-1'>
                  <div className='text-xs font-semibold text-foreground'>
                    {c.counterparty} · Doc/Guía: {c.docRef}
                  </div>
                  <div className='text-xs text-muted-foreground'>
                    {c.sku} · Motivo: {c.reason}
                  </div>
                  {c.resolution && (
                    <div className='text-[11px] font-medium text-emerald-600 dark:text-emerald-400'>
                      ✓ Resolución: {c.resolution}
                    </div>
                  )}
                </div>

                {/* Right: Quantity, Value & Action Buttons */}
                <div className='sm:col-span-5 flex flex-wrap items-center justify-between sm:justify-end gap-3'>
                  <div className='text-end'>
                    <span className='text-sm font-bold tabular-nums text-foreground'>
                      {nf(c.qty)} uds
                    </span>
                    <span className='block text-xs font-semibold tabular-nums text-muted-foreground'>
                      {cop(c.valueCOP ?? c.valueUSD)}
                    </span>
                  </div>

                  {canAct && !isResolved && (
                    <div className='flex flex-wrap items-center gap-1.5'>
                      {isSupplier && c.status === 'Abierto' && (
                        <Button
                          size='sm'
                          variant='outline'
                          className='h-7 text-xs px-2.5'
                          onClick={() => advanceClaim(c.id, 'Enviar')}
                        >
                          <Send className='mr-1 size-3' /> Notificar
                        </Button>
                      )}
                      {isSupplier && (
                        <>
                          <Button
                            size='sm'
                            className='h-7 text-xs px-2.5 bg-blue-600 hover:bg-blue-700 text-white'
                            onClick={() =>
                              advanceClaim(c.id, 'Nota de crédito / Descarte')
                            }
                          >
                            Nota de Crédito
                          </Button>
                          <Button
                            size='sm'
                            variant='ghost'
                            className='h-7 text-xs px-2'
                            onClick={() =>
                              advanceClaim(c.id, 'Reintegrar a disponible')
                            }
                          >
                            Reintegrar
                          </Button>
                        </>
                      )}
                      {!isSupplier && (
                        <>
                          <Button
                            size='sm'
                            className='h-7 text-xs px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white'
                            onClick={() =>
                              advanceClaim(c.id, 'Reintegrar a disponible')
                            }
                          >
                            Apto (Reintegrar)
                          </Button>
                          <Button
                            size='sm'
                            variant='destructive'
                            className='h-7 text-xs px-2.5'
                            onClick={() => advanceClaim(c.id, 'Pasar a dañado')}
                          >
                            Dañado
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal Devolución de Cliente */}
      <Dialog open={retOpen} onOpenChange={setRetOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Registrar devolución de cliente</DialogTitle>
          </DialogHeader>
          <form
            className='space-y-3 pt-2 text-xs'
            onSubmit={(e) => {
              e.preventDefault()
              const q = Number(qty)
              if (!customer.trim() || !partidaId || !Number.isInteger(q) || q <= 0)
                return
              openCustomerReturn({
                customer: customer.trim(),
                docRef: docRef.trim(),
                partidaId,
                qty: q,
                reason: reason.trim(),
              })
              setCustomer('')
              setRetOpen(false)
            }}
          >
            <div className='space-y-1'>
              <label className='font-medium'>Cliente / Comprador</label>
              <Input
                required
                className='h-8 text-xs'
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                placeholder='Nombre del cliente u obra'
              />
            </div>
            <div className='grid grid-cols-2 gap-3'>
              <div className='space-y-1'>
                <label className='font-medium'>Guía / Boleta original</label>
                <Input
                  required
                  className='h-8 text-xs font-mono'
                  value={docRef}
                  onChange={(e) => setDocRef(e.target.value)}
                />
              </div>
              <div className='space-y-1'>
                <label className='font-medium'>Cantidad devuelta</label>
                <Input
                  type='number'
                  min={1}
                  required
                  className='h-8 text-xs font-bold'
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                />
              </div>
            </div>
            <div className='space-y-1'>
              <label className='font-medium'>Partida asociada</label>
              <select
                required
                className='h-8 w-full rounded-md border bg-background px-2 text-xs'
                value={partidaId}
                onChange={(e) => setPartidaId(e.target.value)}
              >
                {scopedPartidas.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.id} · {p.sku} ({p.warehouse})
                  </option>
                ))}
              </select>
            </div>
            <div className='space-y-1'>
              <label className='font-medium'>Motivo de devolución</label>
              <Input
                required
                className='h-8 text-xs'
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
            <div className='flex justify-end gap-2 pt-2'>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={() => setRetOpen(false)}
              >
                Cancelar
              </Button>
              <Button type='submit' size='sm'>
                Ingresar en estado Reclamo
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// 6.2 Rezagados y vencimientos
export function StaleAndExpiryScreen() {
  const { skus, partidas, buckets, matchesScope } = useWms()
  const [selectedAgingBracket, setSelectedAgingBracket] = useState<
    '0-30' | '31-60' | '61-90' | '90+' | null
  >(null)

  const skuMap = new Map(skus.map((s) => [s.sku, s]))

  const scopedAvail = partidas.filter(
    (p) => matchesScope(p.warehouse) && p.qty.disponible > 0
  )

  // Compute 4 Aging Brackets dynamically
  const agingData: Record<
    '0-30' | '31-60' | '61-90' | '90+',
    { units: number; valueCOP: number; valueUSD: number; partidas: number }
  > = {
    '0-30': { units: 0, valueCOP: 0, valueUSD: 0, partidas: 0 },
    '31-60': { units: 0, valueCOP: 0, valueUSD: 0, partidas: 0 },
    '61-90': { units: 0, valueCOP: 0, valueUSD: 0, partidas: 0 },
    '90+': { units: 0, valueCOP: 0, valueUSD: 0, partidas: 0 },
  }

  for (const p of scopedAvail) {
    const s = skuMap.get(p.sku)
    const cost = s?.unitCost ?? 0
    const idle = daysBetween(p.lastOutAt, TODAY_STR)
    const u = p.qty.disponible
    const val = u * cost

    if (idle <= 30) {
      agingData['0-30'].units += u
      agingData['0-30'].valueCOP += val
      agingData['0-30'].valueUSD += val
      agingData['0-30'].partidas += 1
    } else if (idle <= 60) {
      agingData['31-60'].units += u
      agingData['31-60'].valueCOP += val
      agingData['31-60'].valueUSD += val
      agingData['31-60'].partidas += 1
    } else if (idle <= 90) {
      agingData['61-90'].units += u
      agingData['61-90'].valueCOP += val
      agingData['61-90'].valueUSD += val
      agingData['61-90'].partidas += 1
    } else {
      agingData['90+'].units += u
      agingData['90+'].valueCOP += val
      agingData['90+'].valueUSD += val
      agingData['90+'].partidas += 1
    }
  }

  const agingBuckets: AgingBucketData[] = [
    {
      key: '0-30',
      label: 'Rotación Fresca',
      rangeText: '0 - 30 días',
      units: agingData['0-30'].units,
      valueCOP: agingData['0-30'].valueCOP,
      valueUSD: agingData['0-30'].valueUSD,
      partidasCount: agingData['0-30'].partidas,
      color: '#10b981', // emerald-500
      bgLight: 'bg-emerald-50 dark:bg-emerald-950/20',
      borderLight: 'border-emerald-200 dark:border-emerald-800',
      statusText: 'Óptimo',
    },
    {
      key: '31-60',
      label: 'Rotación Regular',
      rangeText: '31 - 60 días',
      units: agingData['31-60'].units,
      valueCOP: agingData['31-60'].valueCOP,
      valueUSD: agingData['31-60'].valueUSD,
      partidasCount: agingData['31-60'].partidas,
      color: '#3b82f6', // blue-500
      bgLight: 'bg-blue-50 dark:bg-blue-950/20',
      borderLight: 'border-blue-200 dark:border-blue-800',
      statusText: 'Normal',
    },
    {
      key: '61-90',
      label: 'Rezagado Atención',
      rangeText: '61 - 90 días',
      units: agingData['61-90'].units,
      valueCOP: agingData['61-90'].valueCOP,
      valueUSD: agingData['61-90'].valueUSD,
      partidasCount: agingData['61-90'].partidas,
      color: '#f59e0b', // amber-500
      bgLight: 'bg-amber-50 dark:bg-amber-950/20',
      borderLight: 'border-amber-200 dark:border-amber-800',
      statusText: 'Revisar',
    },
    {
      key: '90+',
      label: 'Rezagado Crítico',
      rangeText: '> 90 días',
      units: agingData['90+'].units,
      valueCOP: agingData['90+'].valueCOP,
      valueUSD: agingData['90+'].valueUSD,
      partidasCount: agingData['90+'].partidas,
      color: '#ef4444', // red-500
      bgLight: 'bg-rose-50 dark:bg-rose-950/20',
      borderLight: 'border-rose-200 dark:border-rose-800',
      statusText: 'Liquidación',
    },
  ]

  const totalAvailUnits = scopedAvail.reduce((s, p) => s + p.qty.disponible, 0)
  const totalAvailCOP = scopedAvail.reduce(
    (s, p) => s + p.qty.disponible * (skuMap.get(p.sku)?.unitCost ?? 0),
    0
  )

  const expiringList = scopedAvail
    .filter((p) => p.expiry && daysBetween(TODAY_STR, p.expiry) <= EXPIRY_WARN_DAYS)
    .sort((a, b) => (a.expiry ?? '').localeCompare(b.expiry ?? ''))

  const filteredStaleList = scopedAvail
    .filter((p) => {
      const idle = daysBetween(p.lastOutAt, TODAY_STR)
      if (selectedAgingBracket === '0-30') return idle <= 30
      if (selectedAgingBracket === '31-60') return idle > 30 && idle <= 60
      if (selectedAgingBracket === '61-90') return idle > 60 && idle <= 90
      if (selectedAgingBracket === '90+') return idle > 90
      return idle >= STALE_DAYS
    })
    .sort(
      (a, b) =>
        daysBetween(b.lastOutAt, TODAY_STR) -
        daysBetween(a.lastOutAt, TODAY_STR)
    )

  return (
    <div className='space-y-6'>
      <PageHeader
        title='Mercadería rezagada y próxima a vencer'
        subtitle='Análisis de aging buckets para acelerar la rotación y proteger el capital inmovilizado.'
      />

      {/* Gráfico Visual de Aging Buckets interactivo */}
      <AgingChart
        buckets={agingBuckets}
        totalUnits={totalAvailUnits}
        totalCOP={totalAvailCOP}
        selectedKey={selectedAgingBracket}
        onSelectBucket={setSelectedAgingBracket}
      />

      {/* KPI Cards */}
      <div className='grid grid-cols-2 gap-3 lg:grid-cols-4'>
        <KpiCard
          label='Unidades en riesgo (sin duplicar)'
          value={`${nf(buckets.rezagadaPorVencer.units)} uds`}
          sub={cop(buckets.rezagadaPorVencer.valueCOP ?? buckets.rezagadaPorVencer.valueUSD)}
          tone={
            buckets.rezagadaPorVencer.units > 0 ? 'text-destructive' : undefined
          }
        />
        <KpiCard
          label={`Por vencer (≤ ${EXPIRY_WARN_DAYS} días)`}
          value={`${buckets.rezagadaPorVencer.expiringSoonCount} partidas`}
          sub='Priorizar en despachos FEFO'
        />
        <KpiCard
          label={`Rezagadas (≥ ${STALE_DAYS} días)`}
          value={`${buckets.rezagadaPorVencer.stalePartidasCount} partidas`}
          sub='Capital inmovilizado'
        />
        <KpiCard
          label={`Críticas (≥ ${CRITICAL_STALE_DAYS} días)`}
          value={`${buckets.rezagadaPorVencer.criticalStaleCount} partidas`}
          sub='Candidatas a liquidación'
        />
      </div>

      {/* Sección 1: Próximos a vencer FEFO */}
      <div className='space-y-2.5 rounded-xl border bg-card p-4 shadow-xs'>
        <div className='flex items-center justify-between border-b pb-2.5'>
          <div className='flex items-center gap-2'>
            <Calendar className='size-4 text-rose-500' />
            <h3 className='text-xs font-semibold uppercase tracking-wider text-foreground'>
              Cronograma de Vencimientos FEFO (≤ {EXPIRY_WARN_DAYS} días)
            </h3>
          </div>
          <span className='text-[11px] text-muted-foreground'>
            {expiringList.length} partidas en riesgo de caducidad
          </span>
        </div>

        <div className='overflow-x-auto'>
          <table className='w-full text-xs'>
            <thead className='border-b bg-muted/40 text-left text-muted-foreground'>
              <tr>
                <th className='px-3.5 py-2.5 font-medium'>Partida · Bodega</th>
                <th className='px-3.5 py-2.5 font-medium'>Producto</th>
                <th className='px-3.5 py-2.5 font-medium'>Vencimiento</th>
                <th className='px-3.5 py-2.5 font-medium'>Urgencia</th>
                <th className='px-3.5 py-2.5 font-medium'>Disponible</th>
                <th className='px-3.5 py-2.5 text-right font-medium'>Capital Expuesto</th>
              </tr>
            </thead>
            <tbody className='divide-y'>
              {expiringList.map((p) => {
                const s = skuMap.get(p.sku)
                const daysLeft = daysBetween(TODAY_STR, p.expiry!)
                return (
                  <tr key={p.id} className='hover:bg-muted/20'>
                    <td className='px-3.5 py-2.5 font-mono font-bold text-foreground'>
                      {p.id} · <span className='font-normal text-muted-foreground'>{p.warehouse}</span>
                    </td>
                    <td className='px-3.5 py-2.5'>
                      <div className='font-semibold text-foreground'>{p.sku}</div>
                      <div className='text-muted-foreground truncate max-w-xs text-[11px]'>{s?.name}</div>
                    </td>
                    <td className='px-3.5 py-2.5 font-medium text-foreground'>{p.expiry}</td>
                    <td className='px-3.5 py-2.5'>
                      <Badge
                        variant='destructive'
                        className='text-[10px] py-0 font-bold'
                      >
                        {daysLeft} días restantes
                      </Badge>
                    </td>
                    <td className='px-3.5 py-2.5 font-bold tabular-nums text-foreground'>
                      {nf(p.qty.disponible)} {s?.unitMeasure.toLowerCase()}s
                    </td>
                    <td className='px-3.5 py-2.5 text-right font-bold tabular-nums text-foreground'>
                      {cop(p.qty.disponible * (s?.unitCost ?? 0))}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {expiringList.length === 0 && (
            <EmptyState text='No hay partidas próximas a vencer en los próximos 30 días.' />
          )}
        </div>
      </div>

      {/* Sección 2: Partidas Rezagadas (Filtradas por Aging Bucket o general) */}
      <div className='space-y-2.5 rounded-xl border bg-card p-4 shadow-xs'>
        <div className='flex flex-wrap items-center justify-between gap-2 border-b pb-2.5'>
          <div className='flex items-center gap-2'>
            <Clock className='size-4 text-amber-500' />
            <h3 className='text-xs font-semibold uppercase tracking-wider text-foreground'>
              {selectedAgingBracket
                ? `Partidas del tramo: ${selectedAgingBracket} días (${filteredStaleList.length})`
                : `Partidas Rezagadas sin Salida (≥ ${STALE_DAYS} días)`}
            </h3>
          </div>
          {selectedAgingBracket && (
            <Button
              variant='ghost'
              size='sm'
              className='h-6 text-xs text-primary'
              onClick={() => setSelectedAgingBracket(null)}
            >
              Mostrar todas (≥ {STALE_DAYS}d)
            </Button>
          )}
        </div>

        <div className='overflow-x-auto'>
          <table className='w-full text-xs'>
            <thead className='border-b bg-muted/40 text-left text-muted-foreground'>
              <tr>
                <th className='px-3.5 py-2.5 font-medium'>Partida · Bodega</th>
                <th className='px-3.5 py-2.5 font-medium'>Producto</th>
                <th className='px-3.5 py-2.5 font-medium'>Última salida</th>
                <th className='px-3.5 py-2.5 font-medium'>Inactividad</th>
                <th className='px-3.5 py-2.5 font-medium'>Disponible</th>
                <th className='px-3.5 py-2.5 text-right font-medium'>Capital Inmovilizado</th>
              </tr>
            </thead>
            <tbody className='divide-y'>
              {filteredStaleList.map((p) => {
                const s = skuMap.get(p.sku)
                const daysIdle = daysBetween(p.lastOutAt, TODAY_STR)
                const isCrit = daysIdle >= CRITICAL_STALE_DAYS
                return (
                  <tr key={p.id} className='hover:bg-muted/20'>
                    <td className='px-3.5 py-2.5 font-mono font-bold text-foreground'>
                      {p.id} · <span className='font-normal text-muted-foreground'>{p.warehouse}</span>
                    </td>
                    <td className='px-3.5 py-2.5'>
                      <div className='font-semibold text-foreground'>{p.sku}</div>
                      <div className='text-muted-foreground truncate max-w-xs text-[11px]'>{s?.name}</div>
                    </td>
                    <td className='px-3.5 py-2.5 text-muted-foreground'>{p.lastOutAt}</td>
                    <td className='px-3.5 py-2.5'>
                      <Badge
                        variant={isCrit ? 'destructive' : 'outline'}
                        className={`text-[10px] py-0 ${
                          !isCrit && daysIdle >= STALE_DAYS
                            ? 'border-amber-500/50 text-amber-600'
                            : ''
                        }`}
                      >
                        {daysIdle} días {isCrit ? '(Crítico ≥ 90d)' : ''}
                      </Badge>
                    </td>
                    <td className='px-3.5 py-2.5 font-bold tabular-nums text-foreground'>
                      {nf(p.qty.disponible)} {s?.unitMeasure.toLowerCase()}s
                    </td>
                    <td className='px-3.5 py-2.5 text-right font-bold tabular-nums text-foreground'>
                      {cop(p.qty.disponible * (s?.unitCost ?? 0))}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filteredStaleList.length === 0 && (
            <EmptyState text='No hay partidas en el tramo de antigüedad seleccionado.' />
          )}
        </div>
      </div>
    </div>
  )
}
