import { useState } from 'react'
import {
  AlertTriangle,
  ChevronRight,
  CheckCircle2,
  Plus,
  Send,
  Truck,
  Undo2,
  User,
  FileText,
  Trash2,
} from 'lucide-react'
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
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Callout,
  DefRow,
  Field,
  FilterTabs,
  ListRow,
  SELECT_CLASS,
  StatStrip,
  StatusPill,
  type Tone,
} from '@/features/wms/components/kit'
import {
  AgingChart,
  type AgingBucketData,
} from '@/features/wms/components/visual/aging-chart'
import { TODAY_STR } from '@/features/wms/domain/clock'
import {
  CRITICAL_STALE_DAYS,
  EXPIRY_WARN_DAYS,
  STALE_DAYS,
  daysBetween,
  type ClaimCase,
} from '@/features/wms/domain/inventory'
import { ActionOption } from './action-option'
import { EmptyState, PageHeader, cop, nf, shortDate } from './ui-helpers'
import { qtyText } from './unit-labels'

type ClaimAction = Parameters<ReturnType<typeof useWms>['advanceClaim']>[1]

const CLAIM_PILL: Record<ClaimCase['status'], Tone> = {
  Abierto: 'warning',
  Enviado: 'info',
  Resuelto: 'success',
}

function ageText(createdAt: string): string {
  const d = daysBetween(createdAt, TODAY_STR)
  if (d <= 0) return 'hoy'
  return d === 1 ? 'hace 1 día' : `hace ${d} días`
}

/* -------------------------------------------------------------------------- */
/*  6.1 Reclamos y devoluciones                                                */
/* -------------------------------------------------------------------------- */

export function ClaimsScreen() {
  const {
    role,
    isReadOnly,
    skus,
    partidas,
    claims,
    warehouses,
    matchesScope,
    advanceClaim,
  } = useWms()

  const canAct = !isReadOnly && (role === 'ADM' || role === 'JB')

  const [tab, setTab] = useState<'all' | 'Proveedor' | 'Cliente'>('all')
  const [detailId, setDetailId] = useState<string | null>(null)
  const [returnOpen, setReturnOpen] = useState(false)

  const skuOf = (code: string) => skus.find((s) => s.sku === code)

  const scoped = claims.filter((c) => matchesScope(c.warehouse))
  const rank = (c: ClaimCase) => (c.status === 'Resuelto' ? 1 : 0)
  const visible = scoped
    .filter((c) => tab === 'all' || c.type === tab)
    .sort((a, b) => rank(a) - rank(b) || b.createdAt.localeCompare(a.createdAt))

  const open = scoped.filter((c) => c.status === 'Abierto').length
  const sent = scoped.filter((c) => c.status === 'Enviado').length
  const pendingValue = scoped
    .filter((c) => c.status !== 'Resuelto')
    .reduce((sum, c) => sum + c.valueCOP, 0)

  const detail = scoped.find((c) => c.id === detailId) ?? null

  return (
    <div className='space-y-6'>
      <PageHeader
        title='Reclamos y devoluciones'
        actions={
          canAct ? (
            <Button
              onClick={() => setReturnOpen(true)}
              className='h-10 gap-2 sm:h-10'
            >
              <Plus />
              Registrar devolución de cliente
            </Button>
          ) : undefined
        }
      />

      <StatStrip
        items={[
          {
            label: 'Abiertos',
            value: nf(open),
            tone: open > 0 ? 'warning' : 'neutral',
          },
          {
            label: 'Enviados',
            value: nf(sent),
            tone: sent > 0 ? 'info' : 'neutral',
          },
          { label: 'Valor en reclamo', value: cop(pendingValue) },
        ]}
      />

      <div className='space-y-3'>
        <FilterTabs
          value={tab}
          onChange={setTab}
          options={[
            { id: 'all', label: 'Todos', count: scoped.length },
            {
              id: 'Proveedor',
              label: 'Proveedor',
              count: scoped.filter((c) => c.type === 'Proveedor').length,
            },
            {
              id: 'Cliente',
              label: 'Cliente',
              count: scoped.filter((c) => c.type === 'Cliente').length,
            },
          ]}
        />

        <section className='overflow-hidden rounded-xl border bg-card'>
          {visible.length === 0 ? (
            <EmptyState
              title='Sin reclamos'
              text={
                tab === 'all'
                  ? 'No hay reclamos ni devoluciones en las bodegas seleccionadas. Se crean solos al recibir mercadería rota o al registrar una devolución de cliente.'
                  : `No hay reclamos de ${tab === 'Proveedor' ? 'proveedor' : 'cliente'} en las bodegas seleccionadas.`
              }
              icon={FileText}
            />
          ) : (
            <ul className='divide-y'>
              {visible.map((c) => {
                const unit = skuOf(c.sku)?.unitMeasure ?? 'Unidad'
                const actionable = canAct && c.status !== 'Resuelto'
                return (
                  <li key={c.id}>
                    <ListRow
                      onClick={() => setDetailId(c.id)}
                      trailing={
                        <>
                          {actionable && (
                            <span className='hidden h-10 items-center rounded-md border bg-background px-3 text-sm font-medium sm:inline-flex'>
                              Gestionar
                            </span>
                          )}
                          <ChevronRight
                            aria-hidden
                            className={`size-4 shrink-0 text-muted-foreground ${actionable ? 'sm:hidden' : ''}`}
                          />
                        </>
                      }
                    >
                      <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4'>
                        <div className='min-w-0 flex-1'>
                          <div className='flex flex-wrap items-center gap-x-2 gap-y-0.5'>
                            <span className='font-medium'>
                              {c.counterparty}
                            </span>
                            <span className='inline-flex items-center gap-1 text-xs text-muted-foreground'>
                              {c.type === 'Proveedor' ? (
                                <Truck className='size-3.5' aria-hidden />
                              ) : (
                                <User className='size-3.5' aria-hidden />
                              )}
                              {c.type}
                            </span>
                          </div>
                          <div className='mt-0.5 text-sm'>
                            <span className='font-semibold tabular-nums'>
                              {qtyText(c.qty, unit)}
                            </span>
                            <span className='text-muted-foreground'>
                              {' '}
                              · {skuOf(c.sku)?.name ?? c.sku}
                            </span>
                          </div>
                          <div className='mt-0.5 truncate text-sm text-muted-foreground'>
                            {c.reason}
                          </div>
                        </div>
                        <div className='flex items-center justify-between gap-4 sm:justify-end'>
                          <div className='sm:text-end'>
                            <div className='font-semibold tabular-nums'>
                              {cop(c.valueCOP)}
                            </div>
                            <div className='text-xs text-muted-foreground'>
                              {ageText(c.createdAt)}
                            </div>
                          </div>
                          <StatusPill
                            tone={CLAIM_PILL[c.status]}
                            className='sm:w-24 sm:justify-center'
                          >
                            {c.status}
                          </StatusPill>
                        </div>
                      </div>
                    </ListRow>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>

      {/* Detalle y acciones */}
      <Sheet
        open={detail !== null}
        onOpenChange={(o) => !o && setDetailId(null)}
      >
        <SheetContent className='w-full gap-0 sm:max-w-md'>
          {detail && (
            <ClaimDetail
              claim={detail}
              unit={skuOf(detail.sku)?.unitMeasure ?? 'Unidad'}
              skuName={skuOf(detail.sku)?.name ?? detail.sku}
              warehouseName={
                warehouses.find((w) => w.id === detail.warehouse)?.name ??
                detail.warehouse
              }
              unitsInClaim={
                partidas.find((p) => p.id === detail.partidaId)?.qty.reclamo ??
                0
              }
              canAct={canAct}
              onAction={(a) => {
                advanceClaim(detail.id, a)
                setDetailId(null)
              }}
            />
          )}
        </SheetContent>
      </Sheet>

      {returnOpen && (
        <CustomerReturnDialog onClose={() => setReturnOpen(false)} />
      )}
    </div>
  )
}

function ClaimDetail({
  claim: c,
  unit,
  skuName,
  warehouseName,
  unitsInClaim,
  canAct,
  onAction,
}: {
  claim: ClaimCase
  unit: string
  skuName: string
  warehouseName: string
  unitsInClaim: number
  canAct: boolean
  onAction: (a: ClaimAction) => void
}) {
  const isSupplier = c.type === 'Proveedor'
  const unresolved = c.status !== 'Resuelto'

  return (
    <>
      <SheetHeader className='pe-12'>
        <SheetTitle className='text-lg'>{c.counterparty}</SheetTitle>
        <SheetDescription asChild>
          <div className='flex flex-wrap items-center gap-2'>
            <StatusPill tone={CLAIM_PILL[c.status]}>{c.status}</StatusPill>
            <span>
              {isSupplier ? 'Reclamo a proveedor' : 'Devolución de cliente'} ·{' '}
              {c.id}
            </span>
          </div>
        </SheetDescription>
      </SheetHeader>

      <div className='min-h-0 flex-1 space-y-5 overflow-y-auto px-4 pb-6'>
        <dl className='divide-y'>
          <DefRow label={isSupplier ? 'Orden de compra' : 'Factura o remisión'}>
            <span className='font-mono'>{c.docRef}</span>
          </DefRow>
          <DefRow label='Producto'>
            {skuName}
            <span className='block font-mono text-xs font-normal text-muted-foreground'>
              {c.sku} · partida {c.partidaId}
            </span>
          </DefRow>
          <DefRow label='Cantidad'>{qtyText(c.qty, unit)}</DefRow>
          <DefRow label='Valor'>{cop(c.valueCOP)}</DefRow>
          <DefRow label='Bodega'>{warehouseName}</DefRow>
          <DefRow label='Registrado'>
            {shortDate(c.createdAt)} · {ageText(c.createdAt)}
          </DefRow>
        </dl>

        <div>
          <h3 className='font-semibold'>Motivo</h3>
          <p className='mt-1 text-sm text-muted-foreground'>{c.reason}</p>
        </div>

        {!unresolved && (
          <Callout
            tone='success'
            icon={CheckCircle2}
            title={c.resolution ?? 'Caso resuelto'}
          />
        )}

        {unresolved && canAct && (
          <div className='space-y-3'>
            <h3 className='font-semibold'>¿Qué quieres hacer?</h3>
            {isSupplier ? (
              <>
                {c.status === 'Abierto' && (
                  <ActionOption
                    icon={Send}
                    title='Marcar como enviado'
                    description='Avisa que el reclamo ya se mandó al proveedor. Las unidades siguen apartadas.'
                    onClick={() => onAction('Enviar')}
                  />
                )}
                <ActionOption
                  icon={FileText}
                  title='Registrar nota de crédito'
                  description='El proveedor aceptó: las unidades salen del inventario y el reclamo se cierra.'
                  onClick={() => onAction('Nota de crédito / Descarte')}
                />
                <ActionOption
                  icon={Undo2}
                  title='Reintegrar a disponible'
                  description='Las unidades están bien: vuelven a la venta y el reclamo se cierra.'
                  onClick={() => onAction('Reintegrar a disponible')}
                />
              </>
            ) : (
              <>
                <ActionOption
                  icon={Undo2}
                  title='Reintegrar a disponible'
                  description='La mercadería está en buen estado: vuelve a la venta y se cierra la devolución.'
                  onClick={() => onAction('Reintegrar a disponible')}
                />
                {unitsInClaim > 0 && (
                  <ActionOption
                    icon={Trash2}
                    danger
                    title='Pasar a dañado'
                    description='La mercadería llegó rota: pasa a dañado para darla de baja y se cierra la devolución.'
                    onClick={() => onAction('Pasar a dañado')}
                  />
                )}
              </>
            )}
          </div>
        )}
      </div>
    </>
  )
}

/* -------------------------------------------------------------------------- */
/*  Registrar devolución de cliente                                            */
/* -------------------------------------------------------------------------- */

function CustomerReturnDialog({ onClose }: { onClose: () => void }) {
  const { partidas, skus, warehouses, matchesScope, openCustomerReturn } =
    useWms()

  const [customer, setCustomer] = useState('')
  const [docRef, setDocRef] = useState('')
  const [partidaId, setPartidaId] = useState('')
  const [qty, setQty] = useState('')
  const [reason, setReason] = useState('')
  const [attempted, setAttempted] = useState(false)

  const options = partidas.filter((p) => matchesScope(p.warehouse))
  const partida = options.find((p) => p.id === partidaId)
  const unit = skus.find((s) => s.sku === partida?.sku)?.unitMeasure ?? 'Unidad'
  const qtyN = Number(qty)

  const errors = {
    customer: customer.trim() ? '' : 'Escribe el nombre del cliente o la obra.',
    docRef: docRef.trim() ? '' : 'Escribe el número de la factura o remisión.',
    partida: partida ? '' : 'Elige el producto que devuelve.',
    qty:
      Number.isInteger(qtyN) && qtyN > 0
        ? ''
        : 'Escribe una cantidad entera mayor que cero.',
    reason: reason.trim() ? '' : 'Cuéntanos brevemente por qué lo devuelve.',
  }
  const showErr = (k: keyof typeof errors) => (attempted ? errors[k] : '')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setAttempted(true)
    if (Object.values(errors).some(Boolean) || !partida) return
    openCustomerReturn({
      customer: customer.trim(),
      docRef: docRef.trim().toUpperCase(),
      partidaId: partida.id,
      qty: qtyN,
      reason: reason.trim(),
    })
    onClose()
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className='max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>Registrar devolución de cliente</DialogTitle>
          <DialogDescription>
            La mercadería queda apartada en «Reclamo» hasta que decidas qué
            hacer con ella.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate className='space-y-4'>
          <Field label='Cliente' required error={showErr('customer')}>
            <Input
              value={customer}
              onChange={(e) => setCustomer(e.target.value)}
              placeholder='Nombre del cliente u obra'
              className='h-10'
            />
          </Field>
          <Field
            label='N.º de factura o remisión'
            required
            error={showErr('docRef')}
          >
            <Input
              value={docRef}
              onChange={(e) => setDocRef(e.target.value)}
              placeholder='Ej. FV-10452'
              className='h-10 font-mono'
            />
          </Field>
          <Field label='Producto' required error={showErr('partida')}>
            <select
              value={partidaId}
              onChange={(e) => setPartidaId(e.target.value)}
              className={`${SELECT_CLASS} h-10`}
            >
              <option value=''>Elige un producto…</option>
              {options.map((p) => (
                <option key={p.id} value={p.id}>
                  {skus.find((s) => s.sku === p.sku)?.name ?? p.sku} ·{' '}
                  {warehouses.find((w) => w.id === p.warehouse)?.name ??
                    p.warehouse}{' '}
                  · {p.id}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label={`Cantidad devuelta${partida ? ` (${unit.toLowerCase()})` : ''}`}
            required
            error={showErr('qty')}
          >
            <Input
              inputMode='numeric'
              placeholder='0'
              value={qty}
              onChange={(e) => setQty(e.target.value.replace(/\D/g, ''))}
              className='h-10 tabular-nums'
            />
          </Field>
          <Field label='Motivo' required error={showErr('reason')}>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder='Ej. Sobrante de obra en cajas selladas'
              className='h-10'
            />
          </Field>
          <DialogFooter className='pt-2'>
            <Button
              type='button'
              variant='outline'
              className='h-10'
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button type='submit' className='h-10'>
              Registrar devolución
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/* -------------------------------------------------------------------------- */
/*  6.2 Rezagados y vencimientos                                               */
/* -------------------------------------------------------------------------- */

const FRESH_DAYS = 30

export function StaleAndExpiryScreen() {
  const { skus, partidas, warehouses, matchesScope } = useWms()
  const [tab, setTab] = useState<'expiry' | 'stale'>('expiry')

  const skuOf = (code: string) => skus.find((s) => s.sku === code)
  const whName = (id: string) => warehouses.find((w) => w.id === id)?.name ?? id

  const available = partidas.filter(
    (p) => matchesScope(p.warehouse) && p.qty.disponible > 0
  )
  const idleDays = (p: (typeof available)[number]) =>
    daysBetween(p.lastOutAt, TODAY_STR)
  const capital = (p: (typeof available)[number]) =>
    p.qty.disponible * (skuOf(p.sku)?.unitCost ?? 0)

  const expiring = available
    .filter(
      (p) => p.expiry && daysBetween(TODAY_STR, p.expiry) <= EXPIRY_WARN_DAYS
    )
    .sort((a, b) => (a.expiry ?? '').localeCompare(b.expiry ?? ''))
  const stale = available
    .filter((p) => idleDays(p) >= STALE_DAYS)
    .sort((a, b) => idleDays(b) - idleDays(a))

  const staleCapital = stale.reduce((sum, p) => sum + capital(p), 0)

  const buckets: AgingBucketData[] = [
    {
      key: 'fresh',
      label: `Menos de ${FRESH_DAYS} d`,
      partidas: available.filter((p) => idleDays(p) < FRESH_DAYS).length,
      tone: 'success',
    },
    {
      key: 'ok',
      label: `${FRESH_DAYS}–${STALE_DAYS - 1} d`,
      partidas: available.filter(
        (p) => idleDays(p) >= FRESH_DAYS && idleDays(p) < STALE_DAYS
      ).length,
      tone: 'neutral',
    },
    {
      key: 'stale',
      label: `${STALE_DAYS}–${CRITICAL_STALE_DAYS - 1} d`,
      partidas: available.filter(
        (p) => idleDays(p) >= STALE_DAYS && idleDays(p) < CRITICAL_STALE_DAYS
      ).length,
      tone: 'warning',
    },
    {
      key: 'critical',
      label: `${CRITICAL_STALE_DAYS} d o más`,
      partidas: available.filter((p) => idleDays(p) >= CRITICAL_STALE_DAYS)
        .length,
      tone: 'danger',
    },
  ]

  const rows = tab === 'expiry' ? expiring : stale

  return (
    <div className='space-y-6'>
      <PageHeader title='Rezagados y vencimientos' />

      <StatStrip
        items={[
          {
            label: 'Por vencer',
            value: nf(expiring.length),
            tone: expiring.length > 0 ? 'warning' : 'neutral',
          },
          {
            label: 'Rezagados',
            value: nf(stale.length),
            tone: stale.length > 0 ? 'warning' : 'neutral',
          },
          {
            label: 'Capital inmovilizado',
            value: cop(staleCapital),
            hint: 'Rezagados, al costo',
          },
        ]}
      />

      <AgingChart buckets={buckets} />

      <div className='space-y-3'>
        <FilterTabs
          value={tab}
          onChange={setTab}
          options={[
            {
              id: 'expiry',
              label: `Por vencer ≤ ${EXPIRY_WARN_DAYS} d`,
              count: expiring.length,
            },
            {
              id: 'stale',
              label: `Rezagados ≥ ${STALE_DAYS} d`,
              count: stale.length,
            },
          ]}
        />

        <section className='overflow-hidden rounded-xl border bg-card'>
          {rows.length === 0 ? (
            <EmptyState
              icon={tab === 'expiry' ? AlertTriangle : CheckCircle2}
              title={tab === 'expiry' ? 'Nada por vencer' : 'Nada rezagado'}
              text={
                tab === 'expiry'
                  ? `No hay partidas que venzan en los próximos ${EXPIRY_WARN_DAYS} días.`
                  : `No hay partidas con ${STALE_DAYS} días o más sin salida. Todo está rotando.`
              }
            />
          ) : (
            <ul className='divide-y'>
              {rows.map((p) => {
                const s = skuOf(p.sku)
                let pillTone: Tone
                let pillText: string
                let detail: string
                if (tab === 'expiry' && p.expiry) {
                  const left = daysBetween(TODAY_STR, p.expiry)
                  pillTone = left <= 7 ? 'danger' : 'warning'
                  pillText =
                    left < 0
                      ? `Vencida hace ${-left} d`
                      : left === 0
                        ? 'Vence hoy'
                        : `Vence en ${left} d`
                  detail = `Vence el ${shortDate(p.expiry)}`
                } else {
                  const idle = idleDays(p)
                  const critical = idle >= CRITICAL_STALE_DAYS
                  pillTone = critical ? 'danger' : 'warning'
                  pillText = critical
                    ? `${idle} d sin salida · Crítico`
                    : `${idle} d sin salida`
                  detail = `Última salida ${shortDate(p.lastOutAt)}`
                }
                return (
                  <li key={p.id}>
                    <ListRow>
                      <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4'>
                        <div className='min-w-0 flex-1'>
                          <div className='line-clamp-2 font-medium'>
                            {s?.name ?? p.sku}
                          </div>
                          <div className='mt-0.5 text-sm text-muted-foreground'>
                            <span className='font-semibold text-foreground tabular-nums'>
                              {qtyText(
                                p.qty.disponible,
                                s?.unitMeasure ?? 'Unidad'
                              )}
                            </span>{' '}
                            · {whName(p.warehouse)}
                          </div>
                          <div className='mt-0.5 text-xs text-muted-foreground'>
                            {detail} · Partida {p.id}
                          </div>
                        </div>
                        <div className='flex items-center justify-between gap-4 sm:justify-end'>
                          <div className='text-sm text-muted-foreground tabular-nums sm:text-end'>
                            {cop(capital(p))}
                          </div>
                          <StatusPill tone={pillTone}>{pillText}</StatusPill>
                        </div>
                      </div>
                    </ListRow>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
