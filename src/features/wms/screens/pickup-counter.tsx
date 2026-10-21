import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  Check,
  CheckCircle2,
  ChevronRight,
  Lock,
  MapPin,
  Minus,
  PackageCheck,
  Plus,
  Receipt as ReceiptIcon,
  Search,
  SearchX,
  XCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useWms } from '@/context/wms-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Callout,
  DefRow,
  Field,
  ListRow,
  PhotoCapture,
  PhotoStrip,
  Section,
  Stepper,
  StatusPill,
  type Tone,
} from '@/features/wms/components/kit'
import { findScreenBySlug } from '@/features/wms/data/catalog'
import { INITIAL_WAREHOUSES } from '@/features/wms/data/topology-data'
import { TODAY_STR } from '@/features/wms/domain/clock'
import {
  PICKUP_OVERDUE_DAYS,
  daysBetween,
  formatQtyWithEquivalent,
  type PickupOrder,
  type SkuItem,
} from '@/features/wms/domain/inventory'
import {
  DELIVERY_BLOCK_MESSAGE,
  canDeliver,
  deliveryBlockReason,
  findOrderByInvoice,
  linePrice,
  normalizeInvoiceNumber,
  orderTotals,
  type DeliveryBlock,
} from '@/features/wms/domain/invoicing'
import { PageHeader, cop, nf } from './ui-helpers'

// Etiquetas cortas: en celular solo se ve la del paso activo y debe caber.
const STEPS = ['Factura', 'Productos', 'Recibe']

type Quantities = Record<string, number>

interface Receipt {
  orderId: string
  remission: string
  invoice: string
  customer: string
  receivedBy: string
  deliveredUnits: number
  deliveredCOP: number
  pendingUnits: number
  pendingCOP: number
}

/** Nombre de la unidad en minúscula y plural: «caja» → «cajas». */
function unitName(sku: SkuItem | undefined, n: number): string {
  const u = (sku?.unitMeasure ?? 'unidad').toLowerCase()
  if (n === 1) return u
  if (/[aeiouáéíóú]$/.test(u)) return `${u}s`
  if (/[a-z]$/.test(u)) return `${u}es`
  return u
}

const clampQty = (n: number, max: number) =>
  Math.max(0, Math.min(max, Number.isFinite(n) ? Math.floor(n) : 0))

/* -------------------------------------------------------------------------- */
/*  Pantalla                                                                   */
/* -------------------------------------------------------------------------- */

export function PickupCounterScreen() {
  const {
    orders,
    skus,
    matchesScope,
    isReadOnly,
    canActOnScreen,
    registerPickup,
    nextRemission,
    user,
  } = useWms()

  const canAct = !isReadOnly && canActOnScreen(findScreenBySlug('4-2').scr)
  const skuMap = useMemo(() => new Map(skus.map((s) => [s.sku, s])), [skus])

  const [step, setStep] = useState<0 | 1 | 2>(0)
  const [orderId, setOrderId] = useState<string | null>(null)
  const [quantities, setQuantities] = useState<Quantities>({})
  const [receipt, setReceipt] = useState<Receipt | null>(null)
  const topRef = useRef<HTMLDivElement>(null)

  // La factura siempre se lee del estado vivo: si cambia mientras se trabaja
  // (anulada, entregada por otra persona) el flujo vuelve al paso 1.
  const order = orders.find((o) => o.id === orderId) ?? null
  const activeOrder =
    order && canDeliver(order) && matchesScope(order.warehouse) ? order : null
  const currentStep = activeOrder ? step : 0

  const goTo = (next: 0 | 1 | 2) => {
    setStep(next)
    topRef.current?.scrollIntoView({ block: 'start' })
  }

  const pick = (o: PickupOrder) => {
    setOrderId(o.id)
    setQuantities({})
    setReceipt(null)
    goTo(1)
  }

  const reset = () => {
    setOrderId(null)
    setQuantities({})
    setReceipt(null)
    goTo(0)
  }

  const confirm = (params: {
    receivedByName: string
    receivedByRut: string
    docRef?: string
    remission: string
    photos: string[]
  }) => {
    if (!activeOrder) return
    const lines = activeOrder.lines.map((l) => ({
      line: l,
      qty: clampQty(quantities[l.sku] ?? 0, l.qtyOrdered - l.qtyPickedUp),
    }))
    const ok = registerPickup(activeOrder.id, {
      receivedByName: params.receivedByName,
      receivedByRut: params.receivedByRut,
      docRef: params.docRef,
      quantities,
      photos: params.photos,
    })
    if (!ok) return
    const deliveredUnits = lines.reduce((s, x) => s + x.qty, 0)
    const deliveredCOP = lines.reduce(
      (s, x) => s + x.qty * linePrice(x.line, skuMap),
      0
    )
    const t = orderTotals(activeOrder, skuMap)
    setReceipt({
      orderId: activeOrder.id,
      remission: params.remission,
      invoice: activeOrder.invoice?.number ?? activeOrder.id,
      customer: activeOrder.customer,
      receivedBy: params.receivedByName,
      deliveredUnits,
      deliveredCOP,
      pendingUnits: t.pendingUnits - deliveredUnits,
      pendingCOP: t.pendingCOP - deliveredCOP,
    })
    topRef.current?.scrollIntoView({ block: 'start' })
  }

  return (
    <div className='w-full space-y-4'>
      <div ref={topRef} className='scroll-mt-20' />
      <PageHeader title='Entrega en bodega' />

      {!canAct && (
        <Callout tone='info' icon={Lock} title='Solo puedes consultar'>
          Tu perfil no registra entregas. Aquí ves lo que está pendiente por
          entregar y lo entregado hoy.
        </Callout>
      )}

      {receipt ? (
        <SuccessView
          receipt={receipt}
          canSeeBalance={
            !!orders.find((o) => o.id === receipt.orderId && canDeliver(o))
          }
          onAgain={reset}
          onBalance={() => {
            const o = orders.find((x) => x.id === receipt.orderId)
            if (o) pick(o)
          }}
        />
      ) : (
        <>
          {canAct && <Stepper steps={STEPS} current={currentStep} />}

          {currentStep === 0 && (
            <InvoiceStep canAct={canAct} skuMap={skuMap} onPick={pick} />
          )}

          {currentStep === 1 && activeOrder && (
            <QuantitiesStep
              order={activeOrder}
              skuMap={skuMap}
              quantities={quantities}
              onChange={setQuantities}
              onBack={reset}
              onNext={() => goTo(2)}
            />
          )}

          {currentStep === 2 && activeOrder && (
            <ReceiverStep
              order={activeOrder}
              skuMap={skuMap}
              quantities={quantities}
              userName={user.name}
              defaultRemission={nextRemission()}
              onBack={() => goTo(1)}
              onConfirm={confirm}
            />
          )}
        </>
      )}

      {(receipt || currentStep !== 0) && <TodayDeliveries />}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Paso 1 · Factura                                                           */
/* -------------------------------------------------------------------------- */

type Lookup =
  | { kind: 'missing'; text: string }
  | { kind: 'blocked'; order: PickupOrder; reason: DeliveryBlock }
  | { kind: 'scope'; order: PickupOrder }

const BLOCK_VIEW: Record<
  DeliveryBlock,
  { title: string; tone: Tone; icon: typeof Ban }
> = {
  sin_factura: {
    title: 'Este pedido no tiene factura',
    tone: 'warning',
    icon: ReceiptIcon,
  },
  factura_anulada: {
    title: 'Factura anulada',
    tone: 'danger',
    icon: Ban,
  },
  ya_entregado: {
    title: 'Ya fue entregada',
    tone: 'warning',
    icon: PackageCheck,
  },
  cancelado: { title: 'Pedido cancelado', tone: 'danger', icon: XCircle },
}

/**
 * Una factura anulada se informa como anulada aunque el pedido también esté
 * cancelado: es la causa que le sirve al operario y a caja.
 */
function blockReasonOf(order: PickupOrder): DeliveryBlock | null {
  if (order.invoice?.status === 'Anulada') return 'factura_anulada'
  return deliveryBlockReason(order)
}

function InvoiceStep({
  canAct,
  skuMap,
  onPick,
}: {
  canAct: boolean
  skuMap: Map<string, SkuItem>
  onPick: (o: PickupOrder) => void
}) {
  const { orders, warehouses, matchesScope } = useWms()
  const [text, setText] = useState('')
  const [lookup, setLookup] = useState<Lookup | null>(null)
  const [showAll, setShowAll] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (canAct) inputRef.current?.focus()
  }, [canAct])

  const whName = (id: string) =>
    [...warehouses, ...INITIAL_WAREHOUSES].find((w) => w.id === id)?.name ?? id

  const search = () => {
    const raw = text.trim()
    if (!raw) {
      inputRef.current?.focus()
      return
    }
    // Se busca por número de factura; como ayuda, también por número de pedido.
    const normalized = normalizeInvoiceNumber(raw)
    const found =
      findOrderByInvoice(orders, raw) ?? orders.find((o) => o.id === normalized)
    if (!found) {
      setLookup({ kind: 'missing', text: raw })
      return
    }
    if (!matchesScope(found.warehouse)) {
      setLookup({ kind: 'scope', order: found })
      return
    }
    const reason = blockReasonOf(found)
    if (reason) {
      setLookup({ kind: 'blocked', order: found, reason })
      return
    }
    if (!canDeliver(found)) {
      setLookup({ kind: 'missing', text: raw })
      return
    }
    setLookup(null)
    onPick(found)
  }

  const pending = orders
    .filter((o) => canDeliver(o) && matchesScope(o.warehouse))
    .map((o) => ({ order: o, totals: orderTotals(o, skuMap) }))
    .filter((x) => x.totals.pendingUnits > 0)
    .sort((a, b) =>
      (a.order.invoice?.issuedAt ?? '').localeCompare(
        b.order.invoice?.issuedAt ?? ''
      )
    )
  const visible = showAll ? pending : pending.slice(0, 8)

  return (
    <div className='grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:grid-rows-[auto_1fr]'>
      {canAct && (
        <form
          className='space-y-3 rounded-xl border bg-card p-4 sm:p-5 lg:col-start-1 lg:row-start-1'
          onSubmit={(e) => {
            e.preventDefault()
            search()
          }}
        >
          <div className='space-y-1.5'>
            <label htmlFor='invoice-number' className='text-sm font-medium'>
              Número de factura
            </label>
            <div className='flex gap-2'>
              <Input
                id='invoice-number'
                ref={inputRef}
                value={text}
                onChange={(e) => {
                  setText(e.target.value)
                  if (lookup) setLookup(null)
                }}
                inputMode='text'
                autoComplete='off'
                autoCapitalize='characters'
                spellCheck={false}
                enterKeyHint='search'
                placeholder='Ej. FV-10447'
                className='h-10 flex-1 tracking-wide'
              />
              <Button type='submit' className='h-10 px-5'>
                <Search className='size-4' />
                Buscar
              </Button>
            </div>
          </div>

          {lookup?.kind === 'missing' && (
            <Callout
              tone='danger'
              icon={SearchX}
              title='No encontramos esa factura'
            >
              <p>
                Revisa que el número esté completo (por ejemplo FV-10447;
                también sirve solo 10447). Si la factura es de hoy y no aparece,
                pídele a caja que la cargue.
              </p>
            </Callout>
          )}

          {lookup?.kind === 'scope' && (
            <Callout
              tone='warning'
              icon={MapPin}
              title='Esta factura es de otra bodega'
            >
              La {lookup.order.invoice?.number ?? lookup.order.id} se entrega en{' '}
              {whName(lookup.order.warehouse)}. Pídele a quien atiende esa
              bodega que la entregue, o cambia de bodega en la barra superior.
            </Callout>
          )}

          {lookup?.kind === 'blocked' && (
            <Callout
              tone={BLOCK_VIEW[lookup.reason].tone}
              icon={BLOCK_VIEW[lookup.reason].icon}
              title={BLOCK_VIEW[lookup.reason].title}
            >
              <p>
                {lookup.order.invoice?.number ?? lookup.order.id} ·{' '}
                {lookup.order.customer}
              </p>
              <p className='mt-1'>{DELIVERY_BLOCK_MESSAGE[lookup.reason]}</p>
              {lookup.reason === 'factura_anulada' &&
                lookup.order.invoice?.voidReason && (
                  <p className='mt-1'>
                    Motivo: {lookup.order.invoice.voidReason}
                  </p>
                )}
            </Callout>
          )}
        </form>
      )}

      <Section
        flush
        className='lg:col-start-2 lg:row-span-2 lg:row-start-1'
        title='Por entregar hoy'
        action={
          pending.length > 0 ? (
            <span className='text-sm text-muted-foreground tabular-nums'>
              {pending.length} {pending.length === 1 ? 'factura' : 'facturas'}
            </span>
          ) : undefined
        }
      >
        {pending.length === 0 ? (
          <div className='flex flex-col items-center gap-2 px-4 py-10 text-center'>
            <div className='flex size-10 items-center justify-center rounded-full bg-success-soft text-success-ink'>
              <CheckCircle2 className='size-5' />
            </div>
            <p className='max-w-sm text-sm text-muted-foreground'>
              No hay facturas con saldo por entregar en tus bodegas.
            </p>
          </div>
        ) : (
          <ul className='divide-y'>
            {visible.map(({ order, totals }) => {
              const age = daysBetween(
                order.invoice?.issuedAt ?? order.createdAt,
                TODAY_STR
              )
              const pendingPct =
                totals.totalCOP > 0
                  ? (totals.pendingCOP / totals.totalCOP) * 100
                  : (totals.pendingUnits / Math.max(1, totals.orderedUnits)) *
                    100
              return (
                <li key={order.id}>
                  <ListRow
                    onClick={canAct ? () => onPick(order) : undefined}
                    trailing={
                      <div className='flex items-center gap-2'>
                        <div className='text-end'>
                          <div className='font-semibold tabular-nums'>
                            {Math.round(pendingPct)}%
                          </div>
                          <div className='text-sm text-muted-foreground'>
                            pendiente
                          </div>
                        </div>
                        {canAct && (
                          <ChevronRight className='size-4 shrink-0 text-muted-foreground' />
                        )}
                      </div>
                    }
                  >
                    <div className='flex flex-wrap items-center gap-x-2 gap-y-1'>
                      <span className='font-semibold tabular-nums'>
                        {order.invoice?.number}
                      </span>
                      {age > PICKUP_OVERDUE_DAYS && (
                        <StatusPill tone='warning'>
                          {age} días sin retirar
                        </StatusPill>
                      )}
                    </div>
                    <div className='text-sm'>{order.customer}</div>
                    <div className='text-sm text-muted-foreground'>
                      {whName(order.warehouse)}
                    </div>
                  </ListRow>
                </li>
              )
            })}
          </ul>
        )}
        {pending.length > visible.length && (
          <div className='border-t p-2'>
            <Button
              type='button'
              variant='ghost'
              className='h-10 w-full'
              onClick={() => setShowAll(true)}
            >
              Ver las {pending.length - visible.length} restantes
            </Button>
          </div>
        )}
      </Section>

      <TodayDeliveries className='lg:col-start-1 lg:row-start-2' />
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Paso 2 · Qué se entrega                                                    */
/* -------------------------------------------------------------------------- */

function InvoiceHeader({
  order,
  action,
  className,
}: {
  order: PickupOrder
  action?: React.ReactNode
  className?: string
}) {
  const { warehouses } = useWms()
  const wh =
    [...warehouses, ...INITIAL_WAREHOUSES].find((w) => w.id === order.warehouse)
      ?.name ?? order.warehouse
  return (
    <Section className={className}>
      <div className='flex items-start justify-between gap-3'>
        <div className='min-w-0'>
          <div className='text-lg font-semibold tabular-nums'>
            {order.invoice?.number ?? order.id}
          </div>
          <div className='truncate font-medium'>{order.customer}</div>
          <div className='text-sm text-muted-foreground'>
            NIT {order.customerRut} · {wh}
          </div>
        </div>
        {action}
      </div>
    </Section>
  )
}

function QtyControl({
  value,
  max,
  label,
  onChange,
}: {
  value: number
  max: number
  label: string
  onChange: (n: number) => void
}) {
  return (
    <div className='flex items-center gap-1.5'>
      <Button
        type='button'
        variant='outline'
        className='size-10'
        aria-label={`Una menos de ${label}`}
        disabled={value <= 0}
        onClick={() => onChange(clampQty(value - 1, max))}
      >
        <Minus className='size-4' />
      </Button>
      <Input
        value={String(value)}
        onChange={(e) =>
          onChange(clampQty(Number(e.target.value.replace(/\D/g, '')), max))
        }
        onFocus={(e) => e.currentTarget.select()}
        inputMode='numeric'
        autoComplete='off'
        aria-label={`Cantidad a entregar de ${label}`}
        className='h-10 w-16 text-center font-semibold tabular-nums'
      />
      <Button
        type='button'
        variant='outline'
        className='size-10'
        aria-label={`Una más de ${label}`}
        disabled={value >= max}
        onClick={() => onChange(clampQty(value + 1, max))}
      >
        <Plus className='size-4' />
      </Button>
    </div>
  )
}

/** Barra fija al pie del flujo con el resumen y la acción principal. */
function StickyBar({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'sticky bottom-0 z-10 -mx-4 space-y-2 border-t bg-background px-4 py-3 sm:bottom-3 sm:mx-0 sm:rounded-xl sm:border sm:bg-card sm:px-5 lg:top-20 lg:bottom-auto',
        className
      )}
    >
      {children}
    </div>
  )
}

function QuantitiesStep({
  order,
  skuMap,
  quantities,
  onChange,
  onBack,
  onNext,
}: {
  order: PickupOrder
  skuMap: Map<string, SkuItem>
  quantities: Quantities
  onChange: (q: Quantities) => void
  onBack: () => void
  onNext: () => void
}) {
  const rows = order.lines.map((line) => {
    const pending = line.qtyOrdered - line.qtyPickedUp
    const qty = clampQty(quantities[line.sku] ?? 0, pending)
    return { line, sku: skuMap.get(line.sku), pending, qty }
  })
  const totalPending = rows.reduce((s, r) => s + r.pending, 0)
  const units = rows.reduce((s, r) => s + r.qty, 0)
  const value = rows.reduce((s, r) => s + r.qty * linePrice(r.line, skuMap), 0)
  const leftover = totalPending - units
  const set = (sku: string, n: number) => onChange({ ...quantities, [sku]: n })
  const allSelected = rows.every((r) => r.qty === r.pending)

  return (
    <div className='grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_22rem] lg:grid-rows-[auto_1fr]'>
      <InvoiceHeader
        className='lg:col-start-2 lg:row-start-1'
        order={order}
        action={
          <Button
            type='button'
            variant='ghost'
            className='-me-2 h-10 shrink-0'
            onClick={onBack}
          >
            Cambiar
          </Button>
        }
      />

      <Section
        flush
        className='lg:col-start-1 lg:row-span-2 lg:row-start-1'
        title='Qué se entrega'
        action={
          <Button
            type='button'
            variant='outline'
            className='h-10'
            disabled={allSelected}
            onClick={() =>
              onChange(
                Object.fromEntries(rows.map((r) => [r.line.sku, r.pending]))
              )
            }
          >
            <PackageCheck className='size-4' />
            Entregar todo el saldo
          </Button>
        }
      >
        <ul className='divide-y'>
          {rows.map(({ line, sku, pending, qty }) => {
            const name = sku?.name ?? line.sku
            return (
              <li key={line.sku} className='px-4 py-4 sm:px-5'>
                <div className='font-medium'>{name}</div>
                <div className='mt-0.5 text-sm text-muted-foreground tabular-nums'>
                  Pedido {nf(line.qtyOrdered)} · Entregado{' '}
                  {nf(line.qtyPickedUp)}
                </div>
                {pending > 0 ? (
                  <>
                    <div className='text-sm font-medium tabular-nums'>
                      Saldo: {formatQtyWithEquivalent(pending, sku)}
                    </div>
                    <div className='mt-3 flex flex-wrap items-center gap-2'>
                      <QtyControl
                        value={qty}
                        max={pending}
                        label={name}
                        onChange={(n) => set(line.sku, n)}
                      />
                      <span className='text-sm text-muted-foreground'>
                        {unitName(sku, qty)}
                      </span>
                      <Button
                        type='button'
                        variant='outline'
                        className='ms-auto h-10'
                        disabled={qty === pending}
                        onClick={() => set(line.sku, pending)}
                      >
                        Todo
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className='mt-1 flex items-center gap-1.5 text-sm font-medium text-success-ink'>
                    <Check className='size-4' />
                    Esta línea ya se entregó completa
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </Section>

      <StickyBar className='lg:col-start-2 lg:row-start-2'>
        <div className='flex items-end justify-between gap-3'>
          <div>
            <div className='text-sm text-muted-foreground'>Vas a entregar</div>
            <div className='text-lg font-semibold tabular-nums'>
              {nf(units)} {units === 1 ? 'unidad' : 'unidades'}
            </div>
          </div>
          <div className='text-end text-lg font-semibold tabular-nums'>
            {cop(value)}
          </div>
        </div>
        {units > 0 && leftover > 0 && (
          <p className='flex items-start gap-1.5 text-sm font-medium text-warning-ink'>
            <AlertTriangle className='mt-0.5 size-4 shrink-0' />
            Quedará saldo pendiente de {nf(leftover)}{' '}
            {leftover === 1 ? 'unidad' : 'unidades'}.
          </p>
        )}
        {units === 0 && (
          <p className='text-sm text-muted-foreground'>
            Indica cuánto vas a entregar para continuar.
          </p>
        )}
        <Button
          type='button'
          className='h-10 w-full'
          disabled={units === 0}
          onClick={onNext}
        >
          Continuar
        </Button>
      </StickyBar>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Paso 3 · Quién recibe                                                      */
/* -------------------------------------------------------------------------- */

function ReceiverStep({
  order,
  skuMap,
  quantities,
  userName,
  defaultRemission,
  onBack,
  onConfirm,
}: {
  order: PickupOrder
  skuMap: Map<string, SkuItem>
  quantities: Quantities
  userName: string
  defaultRemission: string
  onBack: () => void
  onConfirm: (params: {
    receivedByName: string
    receivedByRut: string
    docRef?: string
    remission: string
    photos: string[]
  }) => void
}) {
  const [name, setName] = useState('')
  const [rut, setRut] = useState('')
  const [remission, setRemission] = useState(defaultRemission)
  const [photos, setPhotos] = useState<string[]>([])

  const rows = order.lines
    .map((line) => {
      const pending = line.qtyOrdered - line.qtyPickedUp
      return {
        line,
        sku: skuMap.get(line.sku),
        qty: clampQty(quantities[line.sku] ?? 0, pending),
        pending,
      }
    })
    .filter((r) => r.qty > 0)
  const units = rows.reduce((s, r) => s + r.qty, 0)
  const value = rows.reduce((s, r) => s + r.qty * linePrice(r.line, skuMap), 0)
  const totalPending = order.lines.reduce(
    (s, l) => s + (l.qtyOrdered - l.qtyPickedUp),
    0
  )
  const leftover = totalPending - units

  const nameOk = name.trim().length >= 3
  const rutOk = rut.replace(/\D/g, '').length >= 5
  const missing = !nameOk
    ? 'Escribe el nombre de quien retira.'
    : !rutOk
      ? 'Escribe la cédula de quien retira.'
      : null

  const submit = () => {
    if (missing) return
    const rem = remission.trim() || defaultRemission
    onConfirm({
      receivedByName: name.trim(),
      receivedByRut: rut.trim(),
      // Si no se cambió, el sistema asigna y avanza el consecutivo solo.
      docRef: rem === defaultRemission ? undefined : rem,
      remission: rem,
      photos,
    })
  }

  return (
    <div className='grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_22rem] lg:grid-rows-[auto_auto_1fr]'>
      <InvoiceHeader className='lg:col-start-2 lg:row-start-1' order={order} />

      <Section
        title='Quién recibe'
        className='lg:col-start-1 lg:row-span-3 lg:row-start-1'
      >
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
          <Field label='Nombre de quien retira' required>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete='off'
              autoCapitalize='words'
              className='h-10'
            />
          </Field>
          <Field label='Cédula' required>
            <Input
              value={rut}
              onChange={(e) => setRut(e.target.value)}
              inputMode='numeric'
              autoComplete='off'
              className='h-10'
            />
          </Field>
          <Field
            label='Número de remisión'
            hint='Ya viene asignado. Cámbialo solo si usas otro consecutivo.'
            className='sm:col-span-2'
          >
            <Input
              value={remission}
              onChange={(e) => setRemission(e.target.value)}
              autoComplete='off'
              className='h-10'
            />
          </Field>
          <div className='space-y-1.5 sm:col-span-2'>
            <div className='text-sm font-medium'>
              Foto de la entrega o de la cédula{' '}
              <span className='font-normal text-muted-foreground'>
                (opcional)
              </span>
            </div>
            <PhotoCapture
              photos={photos}
              onChange={setPhotos}
              max={2}
              label='Tomar foto'
            />
          </div>
        </div>
      </Section>

      <Section
        title='Lo que vas a confirmar'
        flush
        className='lg:col-start-2 lg:row-start-2'
      >
        <ul className='divide-y'>
          {rows.map(({ line, sku, qty }) => (
            <li
              key={line.sku}
              className='flex items-baseline justify-between gap-3 px-4 py-3 sm:px-5'
            >
              <span className='min-w-0 text-sm'>{sku?.name ?? line.sku}</span>
              <span className='shrink-0 text-end text-sm font-medium tabular-nums'>
                {nf(qty)} {unitName(sku, qty)}
              </span>
            </li>
          ))}
        </ul>
        <dl className='divide-y border-t px-4 sm:px-5'>
          <DefRow label='Total a entregar'>
            {nf(units)} {units === 1 ? 'unidad' : 'unidades'}
          </DefRow>
          <DefRow label='Valor'>{cop(value)}</DefRow>
          {leftover > 0 && (
            <DefRow label='Quedará pendiente'>
              <span className='text-warning-ink'>
                {nf(leftover)} {leftover === 1 ? 'unidad' : 'unidades'}
              </span>
            </DefRow>
          )}
        </dl>
      </Section>

      <StickyBar className='lg:col-start-2 lg:row-start-3'>
        <p className='text-sm text-muted-foreground'>
          Entrega a nombre de{' '}
          <span className='font-medium text-foreground'>{userName}</span>
        </p>
        {missing && <p className='text-sm text-muted-foreground'>{missing}</p>}
        <div className='flex gap-2'>
          <Button
            type='button'
            variant='outline'
            className='h-10 px-4'
            onClick={onBack}
          >
            <ArrowLeft className='size-4' />
            Atrás
          </Button>
          <Button
            type='button'
            className='h-10 flex-1'
            disabled={!!missing}
            onClick={submit}
          >
            Confirmar entrega
          </Button>
        </div>
      </StickyBar>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Éxito                                                                      */
/* -------------------------------------------------------------------------- */

function SuccessView({
  receipt,
  canSeeBalance,
  onAgain,
  onBalance,
}: {
  receipt: Receipt
  canSeeBalance: boolean
  onAgain: () => void
  onBalance: () => void
}) {
  const partial = receipt.pendingUnits > 0
  return (
    <div className='grid grid-cols-1 items-start gap-4 lg:grid-cols-2'>
      <Section>
        <div className='flex flex-col items-center gap-2 py-2 text-center'>
          <div className='flex size-14 items-center justify-center rounded-full bg-success-soft text-success-ink'>
            <CheckCircle2 className='size-8' />
          </div>
          <h2 className='text-xl font-semibold tracking-tight'>
            Entrega registrada
          </h2>
          <div className='text-sm text-muted-foreground'>
            Remisión{' '}
            <span className='text-lg font-semibold text-foreground tabular-nums'>
              {receipt.remission}
            </span>
          </div>
        </div>
        <dl className='mt-3 divide-y border-t'>
          <DefRow label='Factura'>{receipt.invoice}</DefRow>
          <DefRow label='Cliente'>{receipt.customer}</DefRow>
          <DefRow label='Recibió'>{receipt.receivedBy}</DefRow>
          <DefRow label='Entregado'>
            {nf(receipt.deliveredUnits)}{' '}
            {receipt.deliveredUnits === 1 ? 'unidad' : 'unidades'} ·{' '}
            {cop(receipt.deliveredCOP)}
          </DefRow>
        </dl>
      </Section>

      <div className='space-y-4'>
        {partial ? (
          <Callout
            tone='warning'
            icon={AlertTriangle}
            title={`Queda pendiente: ${nf(receipt.pendingUnits)} ${receipt.pendingUnits === 1 ? 'unidad' : 'unidades'}`}
          >
            Por entregar de esta factura: {cop(receipt.pendingCOP)}.
          </Callout>
        ) : (
          <Callout
            tone='success'
            icon={CheckCircle2}
            title='Factura entregada completa'
          >
            No queda nada pendiente de esta factura.
          </Callout>
        )}

        <div className='flex flex-col gap-2 sm:flex-row-reverse'>
          <Button className='h-10 flex-1' onClick={onAgain}>
            Entregar otra factura
          </Button>
          {partial && canSeeBalance && (
            <Button
              variant='outline'
              className='h-10 flex-1'
              onClick={onBalance}
            >
              Ver saldo
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Historial del día                                                          */
/* -------------------------------------------------------------------------- */

function TodayDeliveries({ className }: { className?: string }) {
  const { orders, matchesScope } = useWms()
  const rows = orders
    .filter((o) => matchesScope(o.warehouse))
    .flatMap((o) =>
      o.pickups
        .filter((p) => p.ts.startsWith(TODAY_STR))
        .map((p) => ({ order: o, pickup: p }))
    )
    .sort((a, b) => b.pickup.ts.localeCompare(a.pickup.ts))

  const list =
    rows.length === 0 ? (
      <p className='px-4 py-6 text-center text-sm text-muted-foreground sm:px-5'>
        Todavía no se ha registrado ninguna entrega hoy.
      </p>
    ) : (
      <ul className='divide-y'>
        {rows.map(({ order, pickup }) => {
          const units = pickup.items.reduce((s, i) => s + i.qty, 0)
          return (
            <li
              key={`${order.id}-${pickup.docRef}-${pickup.ts}`}
              className='space-y-1 px-4 py-3 sm:px-5'
            >
              <div className='flex items-baseline justify-between gap-3'>
                <span className='font-semibold tabular-nums'>
                  {order.invoice?.number ?? order.id}
                </span>
                <span className='text-sm text-muted-foreground tabular-nums'>
                  {pickup.ts.slice(11, 16)}
                </span>
              </div>
              <div className='truncate text-sm'>{order.customer}</div>
              <div className='text-sm text-muted-foreground'>
                {pickup.docRef} · {nf(units)}{' '}
                {units === 1 ? 'unidad' : 'unidades'} · Entregó{' '}
                {pickup.deliveredBy ?? 'sin registro'} · Recibió{' '}
                {pickup.receivedByName}
              </div>
              <PhotoStrip photos={pickup.photos} size='sm' />
            </li>
          )
        })}
      </ul>
    )

  const title = (
    <>
      Entregas de hoy{' '}
      <span className='font-normal text-muted-foreground tabular-nums'>
        ({rows.length})
      </span>
    </>
  )

  return (
    <>
      <Section title={title} flush className={cn('hidden lg:block', className)}>
        {list}
      </Section>
      <details
        className={cn('group rounded-xl border bg-card lg:hidden', className)}
      >
        <summary className='flex min-h-10 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-base font-semibold sm:px-5 [&::-webkit-details-marker]:hidden'>
          <span>{title}</span>
          <ChevronRight className='size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90' />
        </summary>
        <div className='border-t'>{list}</div>
      </details>
    </>
  )
}
