import { useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Plus,
  ShieldCheck,
  Truck,
} from 'lucide-react'
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
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Callout,
  DefRow,
  Field,
  SELECT_CLASS,
  StatStrip,
  StatusPill,
  type Tone,
} from '@/features/wms/components/kit'
import type { WmsTransfer } from '@/features/wms/domain/inventory'
import { ActionOption } from './action-option'
import { EmptyState, PageHeader, nf, shortDate } from './ui-helpers'
import { fmtNum, qtyText, unitName } from './unit-labels'

type Status = WmsTransfer['status']

const STEPS = ['Solicitado', 'Aprobado', 'En tránsito', 'Recibido']

/** Posición del traspaso en los 4 hitos (0 a 3). */
const STEP_INDEX: Record<Status, number> = {
  Solicitado: 0,
  Aprobado: 1,
  'En tránsito': 2,
  'Recibido total': 3,
  'Cerrado con diferencias': 3,
}

const STATUS_PILL: Record<Status, { label: string; tone: Tone }> = {
  Solicitado: { label: 'Por aprobar', tone: 'warning' },
  Aprobado: { label: 'Listo para despachar', tone: 'info' },
  'En tránsito': { label: 'En tránsito', tone: 'info' },
  'Recibido total': { label: 'Recibido', tone: 'success' },
  'Cerrado con diferencias': { label: 'Con diferencias', tone: 'danger' },
}

const isPending = (v: string) => v.toLowerCase().startsWith('pendiente')

/* -------------------------------------------------------------------------- */
/*  Indicador de progreso (4 hitos)                                            */
/* -------------------------------------------------------------------------- */

function TransferProgress({ status }: { status: Status }) {
  const idx = STEP_INDEX[status]
  const finished = idx === 3
  const withDifferences = status === 'Cerrado con diferencias'

  return (
    <ol
      aria-label={`Paso ${idx + 1} de 4: ${STEPS[idx]}`}
      className='flex items-start'
    >
      {STEPS.map((label, i) => {
        const done = i < idx || finished
        const active = i === idx && !finished
        const problem = withDifferences && i === 3
        return (
          <li
            key={label}
            className='relative flex flex-1 flex-col items-center gap-1.5'
          >
            {i > 0 && (
              <span
                aria-hidden
                className={cn(
                  'absolute end-1/2 top-[7px] h-0.5 w-full',
                  i <= idx ? 'bg-success' : 'bg-border'
                )}
              />
            )}
            <span
              aria-hidden
              className={cn(
                'relative z-10 size-4 rounded-full border-2 border-card',
                done && 'bg-success',
                problem && 'bg-danger',
                active && 'bg-primary ring-4 ring-primary/20',
                !done && !active && 'bg-border'
              )}
            />
            <span
              className={cn(
                'text-center text-xs',
                active || (finished && i === 3)
                  ? 'font-semibold text-foreground'
                  : 'text-muted-foreground'
              )}
            >
              {label}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

/* -------------------------------------------------------------------------- */
/*  Pantalla                                                                   */
/* -------------------------------------------------------------------------- */

export function TransfersScreen() {
  const {
    role,
    isReadOnly,
    warehouses,
    skus,
    transfers,
    matchesScope,
    advanceTransfer,
  } = useWms()

  const [requestOpen, setRequestOpen] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [receiveId, setReceiveId] = useState<string | null>(null)

  const canApprove = !isReadOnly && (role === 'ADM' || role === 'JB')
  const canMove =
    !isReadOnly && (role === 'ADM' || role === 'JB' || role === 'OPE')

  const whName = (id: string) => warehouses.find((w) => w.id === id)?.name ?? id
  const unitOf = (sku: string) =>
    skus.find((s) => s.sku === sku)?.unitMeasure ?? 'Unidad'

  const list = transfers
    .filter(
      (t) => matchesScope(t.originWarehouse) || matchesScope(t.destWarehouse)
    )
    .sort((a, b) => {
      const ra = STEP_INDEX[a.status] === 3 ? 1 : 0
      const rb = STEP_INDEX[b.status] === 3 ? 1 : 0
      if (ra !== rb) return ra - rb
      return b.createdAt.localeCompare(a.createdAt)
    })

  const toApprove = list.filter((t) => t.status === 'Solicitado').length
  const inTransit = list.filter((t) => t.status === 'En tránsito').length
  const withDiff = list.filter(
    (t) => t.status === 'Cerrado con diferencias'
  ).length

  const detail = list.find((t) => t.id === detailId) ?? null
  const receiving = list.find((t) => t.id === receiveId) ?? null

  /** La acción que sigue para un traspaso, según el estado y el rol. */
  const nextAction = (t: WmsTransfer) => {
    if (t.status === 'Solicitado' && canApprove) {
      return {
        label: 'Aprobar',
        icon: ShieldCheck,
        run: () => advanceTransfer(t.id, 'Aprobado'),
      }
    }
    if (t.status === 'Aprobado' && canMove) {
      return {
        label: 'Despachar',
        icon: Truck,
        run: () => advanceTransfer(t.id, 'En tránsito'),
      }
    }
    if (t.status === 'En tránsito' && canMove) {
      return {
        label: 'Recibir',
        icon: CheckCircle2,
        run: () => setReceiveId(t.id),
      }
    }
    return null
  }

  const waitingNote = (t: WmsTransfer) =>
    t.status === 'Solicitado' && !canApprove && !isReadOnly
      ? 'Espera la aprobación del jefe de bodega'
      : null

  return (
    <div className='space-y-6'>
      <PageHeader
        title='Traspasos'
        actions={
          canMove ? (
            <Button
              onClick={() => setRequestOpen(true)}
              className='h-10 gap-2 sm:h-10'
            >
              <Plus />
              Solicitar traspaso
            </Button>
          ) : undefined
        }
      />

      <StatStrip
        items={[
          {
            label: 'Por aprobar',
            value: nf(toApprove),
            tone: toApprove > 0 ? 'warning' : 'neutral',
          },
          {
            label: 'En tránsito',
            value: nf(inTransit),
            tone: inTransit > 0 ? 'info' : 'neutral',
          },
          {
            label: 'Con diferencias',
            value: nf(withDiff),
            tone: withDiff > 0 ? 'danger' : 'neutral',
          },
        ]}
      />

      <section className='overflow-hidden rounded-xl border bg-card'>
        {list.length === 0 ? (
          <EmptyState
            title='Aún no hay traspasos'
            text='Cuando una bodega necesite producto de otra, solicita el traspaso aquí y sigue su avance hasta que llegue.'
            icon={Truck}
            action={
              canMove ? (
                <Button
                  className='mt-1 h-10'
                  onClick={() => setRequestOpen(true)}
                >
                  Solicitar traspaso
                </Button>
              ) : undefined
            }
          />
        ) : (
          <ul className='divide-y'>
            {list.map((t) => {
              const action = nextAction(t)
              const note = waitingNote(t)
              const pill = STATUS_PILL[t.status]
              return (
                <li
                  key={t.id}
                  className='flex flex-col gap-4 px-4 py-4 sm:px-5 lg:flex-row lg:items-center lg:gap-6'
                >
                  <button
                    type='button'
                    onClick={() => setDetailId(t.id)}
                    className='min-w-0 flex-1 rounded-md text-start outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50'
                    aria-label={`Ver detalle del traspaso ${t.id}`}
                  >
                    <div className='font-medium'>
                      {whName(t.originWarehouse)}
                    </div>
                    <div className='flex items-center gap-1.5 font-medium'>
                      <ArrowRight
                        aria-label='hacia'
                        className='size-4 shrink-0 text-muted-foreground'
                      />
                      {whName(t.destWarehouse)}
                    </div>
                    <div className='mt-1.5 text-sm'>
                      <span className='font-semibold tabular-nums'>
                        {qtyText(t.qtyRequested, unitOf(t.sku))}
                      </span>
                      <span className='text-muted-foreground'>
                        {' '}
                        · {t.skuName}
                      </span>
                    </div>
                    <div className='mt-0.5 text-xs text-muted-foreground'>
                      {t.id} · {shortDate(t.createdAt)}
                    </div>
                  </button>

                  <div className='lg:w-72 lg:shrink-0'>
                    <TransferProgress status={t.status} />
                  </div>

                  <div className='flex items-center justify-between gap-3 lg:w-60 lg:shrink-0 lg:justify-end'>
                    <StatusPill tone={pill.tone}>{pill.label}</StatusPill>
                    {action ? (
                      <Button
                        onClick={action.run}
                        className='h-10 gap-2 sm:h-10'
                      >
                        <action.icon />
                        {action.label}
                      </Button>
                    ) : (
                      note && (
                        <span className='max-w-40 text-end text-sm text-muted-foreground'>
                          {note}
                        </span>
                      )
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {requestOpen && (
        <RequestTransferDialog onClose={() => setRequestOpen(false)} />
      )}

      {/* Detalle del traspaso */}
      <Sheet
        open={detail !== null}
        onOpenChange={(o) => !o && setDetailId(null)}
      >
        <SheetContent className='w-full gap-0 sm:max-w-md'>
          {detail && (
            <TransferDetail
              t={detail}
              whName={whName}
              unit={unitOf(detail.sku)}
              action={nextAction(detail)}
              onAction={() => setDetailId(null)}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* Recibir: todo bien o con roturas */}
      <Dialog
        open={receiving !== null}
        onOpenChange={(o) => !o && setReceiveId(null)}
      >
        <DialogContent className='sm:max-w-md'>
          {receiving && (
            <>
              <DialogHeader>
                <DialogTitle>Recibir traspaso</DialogTitle>
                <DialogDescription>
                  Revisa lo que llegó a {whName(receiving.destWarehouse)}:{' '}
                  {qtyText(
                    receiving.qtySent || receiving.qtyRequested,
                    unitOf(receiving.sku)
                  )}{' '}
                  de {receiving.skuName}.
                </DialogDescription>
              </DialogHeader>
              <div className='space-y-3'>
                <ActionOption
                  icon={CheckCircle2}
                  title='Llegó todo bien'
                  description='Todo queda disponible en la bodega de destino.'
                  onClick={() => {
                    advanceTransfer(receiving.id, 'Recibido total')
                    setReceiveId(null)
                  }}
                />
                <ActionOption
                  icon={AlertTriangle}
                  danger
                  title='Llegó con roturas'
                  description='Lo roto queda como dañado en destino, listo para reclamar.'
                  onClick={() => {
                    advanceTransfer(receiving.id, 'Cerrado con diferencias')
                    setReceiveId(null)
                  }}
                />
              </div>
              <DialogFooter>
                <Button
                  variant='outline'
                  className='h-10'
                  onClick={() => setReceiveId(null)}
                >
                  Cancelar
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Detalle                                                                    */
/* -------------------------------------------------------------------------- */

function TransferDetail({
  t,
  whName,
  unit,
  action,
  onAction,
}: {
  t: WmsTransfer
  whName: (id: string) => string
  unit: string
  action: { label: string; icon: React.ElementType; run: () => void } | null
  onAction: () => void
}) {
  const pill = STATUS_PILL[t.status]
  const lost =
    t.qtyReceived !== null ? Math.max(0, t.qtySent - t.qtyReceived) : 0

  return (
    <>
      <SheetHeader className='pe-12'>
        <SheetTitle className='text-lg'>Traspaso {t.id}</SheetTitle>
        <SheetDescription asChild>
          <div className='flex flex-wrap items-center gap-2'>
            <StatusPill tone={pill.tone}>{pill.label}</StatusPill>
            <span>{shortDate(t.createdAt)}</span>
          </div>
        </SheetDescription>
      </SheetHeader>

      <div className='min-h-0 flex-1 space-y-5 overflow-y-auto px-4 pb-5'>
        <TransferProgress status={t.status} />

        {t.status === 'Cerrado con diferencias' && (
          <Callout
            tone='danger'
            icon={AlertTriangle}
            title={`Llegaron ${fmtNum(t.qtyReceived ?? 0)} de ${qtyText(t.qtySent, unit)}`}
          >
            {lost > 0
              ? `${qtyText(lost, unit)} quedaron registradas como dañadas en ${whName(t.destWarehouse)}. Revísalas en «Daños y mermas» para reclamar.`
              : 'Revisa «Daños y mermas» para ver lo que quedó registrado.'}
          </Callout>
        )}

        <dl className='divide-y'>
          <DefRow label='Sale de'>{whName(t.originWarehouse)}</DefRow>
          <DefRow label='Llega a'>{whName(t.destWarehouse)}</DefRow>
          <DefRow label='Producto'>
            {t.skuName}
            <span className='block font-mono text-xs font-normal text-muted-foreground'>
              {t.sku} · partida {t.partidaId}
            </span>
          </DefRow>
          <DefRow label='Solicitado'>{qtyText(t.qtyRequested, unit)}</DefRow>
          <DefRow label='Despachado'>
            {t.qtySent > 0 ? qtyText(t.qtySent, unit) : '—'}
          </DefRow>
          <DefRow label='Recibido'>
            {t.qtyReceived !== null ? qtyText(t.qtyReceived, unit) : '—'}
          </DefRow>
        </dl>

        <div>
          <h3 className='font-semibold'>Remisión de traslado</h3>
          <dl className='divide-y'>
            <DefRow label='N.º de guía'>
              {isPending(t.guideNumber) ? (
                <span className='font-normal text-muted-foreground'>
                  Se asigna al aprobar
                </span>
              ) : (
                <span className='font-mono'>{t.guideNumber}</span>
              )}
            </DefRow>
            <DefRow label='Transportista'>{t.carrier}</DefRow>
            <DefRow label='Solicitó'>{t.requestedBy}</DefRow>
            <DefRow label='Aprobó'>
              {isPending(t.approvedBy) ? (
                <span className='font-normal text-muted-foreground'>
                  Pendiente
                </span>
              ) : (
                t.approvedBy
              )}
            </DefRow>
          </dl>
        </div>

        {t.notes && (
          <div>
            <h3 className='font-semibold'>Notas</h3>
            <p className='mt-1 text-sm text-muted-foreground'>{t.notes}</p>
          </div>
        )}
      </div>

      {action && (
        <SheetFooter className='border-t'>
          <Button
            className='h-10 gap-2'
            onClick={() => {
              action.run()
              onAction()
            }}
          >
            <action.icon />
            {action.label}
          </Button>
        </SheetFooter>
      )}
    </>
  )
}

/* -------------------------------------------------------------------------- */
/*  Solicitar traspaso                                                         */
/* -------------------------------------------------------------------------- */

function RequestTransferDialog({ onClose }: { onClose: () => void }) {
  const { warehouses, partidas, skus, matchesScope, createTransfer } = useWms()

  const [partidaId, setPartidaId] = useState('')
  const [destWh, setDestWh] = useState('')
  const [qty, setQty] = useState('')
  const [attempted, setAttempted] = useState(false)

  const whName = (id: string) => warehouses.find((w) => w.id === id)?.name ?? id
  const skuOf = (code: string) => skus.find((s) => s.sku === code)

  const options = partidas.filter(
    (p) => matchesScope(p.warehouse) && p.qty.disponible > 0
  )
  const partida = options.find((p) => p.id === partidaId)
  const unit = partida
    ? (skuOf(partida.sku)?.unitMeasure ?? 'Unidad')
    : 'Unidad'
  const available = partida?.qty.disponible ?? 0
  const qtyN = Number(qty)

  const errors = {
    partida: partida ? '' : 'Elige el producto que vas a trasladar.',
    dest: !destWh
      ? 'Elige la bodega que lo va a recibir.'
      : partida && partida.warehouse === destWh
        ? 'La bodega de destino debe ser distinta a la de origen.'
        : '',
    qty:
      Number.isInteger(qtyN) && qtyN > 0
        ? qtyN > available && partida
          ? `Solo hay ${qtyText(available, unit)} disponibles en esa bodega.`
          : ''
        : 'Escribe una cantidad entera mayor que cero.',
  }
  const showErr = (k: keyof typeof errors) => (attempted ? errors[k] : '')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setAttempted(true)
    if (errors.partida || errors.dest || errors.qty || !partida) return
    createTransfer(partida.warehouse, destWh, partida.id, qtyN)
    onClose()
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>Solicitar traspaso</DialogTitle>
          <DialogDescription className='sr-only'>
            Elige el producto, la bodega de destino y la cantidad.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate className='space-y-4'>
          <Field label='Producto y partida' required error={showErr('partida')}>
            <select
              value={partidaId}
              onChange={(e) => setPartidaId(e.target.value)}
              className={`${SELECT_CLASS} h-10`}
            >
              <option value=''>Elige un producto…</option>
              {options.map((p) => {
                const s = skuOf(p.sku)
                return (
                  <option key={p.id} value={p.id}>
                    {s?.name ?? p.sku} · {whName(p.warehouse)} ·{' '}
                    {qtyText(p.qty.disponible, s?.unitMeasure ?? 'Unidad')}
                  </option>
                )
              })}
            </select>
          </Field>
          <Field label='Bodega de destino' required error={showErr('dest')}>
            <select
              value={destWh}
              onChange={(e) => setDestWh(e.target.value)}
              className={`${SELECT_CLASS} h-10`}
            >
              <option value=''>Elige una bodega…</option>
              {warehouses
                .filter((w) => w.id !== partida?.warehouse)
                .map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
            </select>
          </Field>
          <Field
            label={`Cantidad (${unitName(unit, 2)})`}
            required
            hint={
              partida
                ? `Disponible: ${qtyText(available, unit)}`
                : 'Elige primero el producto.'
            }
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
              Solicitar traspaso
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
