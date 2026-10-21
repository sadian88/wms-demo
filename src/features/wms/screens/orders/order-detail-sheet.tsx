import { useState } from 'react'
import { CircleAlert, TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useWms } from '@/context/wms-provider'
import { Button } from '@/components/ui/button'
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
  PhotoStrip,
  ProgressBar,
  StatusPill,
} from '@/features/wms/components/kit'
import {
  formatQtyWithEquivalent,
  type PickupOrder,
} from '@/features/wms/domain/inventory'
import {
  DELIVERY_BLOCK_MESSAGE,
  canDeliver,
  linePrice,
} from '@/features/wms/domain/invoicing'
import { cop, shortDate } from '../ui-helpers'
import {
  CAN_CANCEL_ORDER,
  CAN_GO_DELIVER,
  CAN_INVOICE,
  buildView,
  isActiveOrder,
  pillFor,
  shortName,
  stamp,
} from './model'

const DANGER_OUTLINE =
  'border-danger/40 text-danger-ink hover:bg-danger-soft hover:text-danger-ink'

export function OrderDetailSheet({
  orderId,
  onClose,
  onInvoice,
  onVoid,
  onCancel,
  onGoToPickup,
}: {
  orderId: string | null
  onClose: () => void
  onInvoice: (orderId: string) => void
  onVoid: (orderId: string) => void
  onCancel: (orderId: string) => void
  onGoToPickup: () => void
}) {
  const { orders, skus, warehouses, role, isReadOnly } = useWms()
  // Conserva el último pedido mientras el panel se cierra.
  const [shownId, setShownId] = useState(orderId)
  if (orderId && orderId !== shownId) setShownId(orderId)
  const order = orders.find((o) => o.id === (orderId ?? shownId))

  return (
    <Sheet open={orderId !== null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className='w-full gap-0 sm:max-w-lg'>
        {order ? (
          <Detail
            order={order}
            skus={skus}
            warehouseName={
              warehouses.find((w) => w.id === order.warehouse)?.name ??
              order.warehouse
            }
            canInvoice={!isReadOnly && CAN_INVOICE.includes(role)}
            canGoDeliver={!isReadOnly && CAN_GO_DELIVER.includes(role)}
            canCancel={!isReadOnly && CAN_CANCEL_ORDER.includes(role)}
            onInvoice={onInvoice}
            onVoid={onVoid}
            onCancel={onCancel}
            onGoToPickup={onGoToPickup}
          />
        ) : (
          <SheetHeader>
            <SheetTitle>Pedido</SheetTitle>
            <SheetDescription>No se encontró el pedido.</SheetDescription>
          </SheetHeader>
        )}
      </SheetContent>
    </Sheet>
  )
}

function Detail({
  order,
  skus,
  warehouseName,
  canInvoice,
  canGoDeliver,
  canCancel,
  onInvoice,
  onVoid,
  onCancel,
  onGoToPickup,
}: {
  order: PickupOrder
  skus: ReturnType<typeof useWms>['skus']
  warehouseName: string
  canInvoice: boolean
  canGoDeliver: boolean
  canCancel: boolean
  onInvoice: (orderId: string) => void
  onVoid: (orderId: string) => void
  onCancel: (orderId: string) => void
  onGoToPickup: () => void
}) {
  const skuMap = new Map(skus.map((s) => [s.sku, s]))
  const view = buildView(order, skuMap)
  const pill = pillFor(view)
  const inv = order.invoice
  const active = isActiveOrder(order)
  const voided = view.state === 'anulado'

  const showInvoice = canInvoice && !inv && active
  const showDeliver = canGoDeliver && canDeliver(order)
  const showVoid = canInvoice && inv?.status === 'Emitida'
  const showCancel = canCancel && !inv && active
  const hasActions = showInvoice || showDeliver || showVoid || showCancel

  return (
    <>
      <SheetHeader className='gap-2 border-b p-4 pe-12 sm:p-5 sm:pe-12'>
        <SheetTitle className='text-lg leading-snug'>
          {order.customer}
        </SheetTitle>
        <SheetDescription>Pedido {order.id}</SheetDescription>
        <div>
          <StatusPill tone={pill.tone}>{pill.label}</StatusPill>
        </div>
      </SheetHeader>

      <div className='min-h-0 flex-1 space-y-6 overflow-y-auto p-4 sm:p-5'>
        {voided && inv && (
          <Callout
            tone='danger'
            icon={CircleAlert}
            title={`Factura anulada${inv.voidedAt ? ` el ${shortDate(inv.voidedAt)}` : ''}`}
          >
            <span className='block'>{inv.voidReason}</span>
            {view.hasDeliveries && (
              <span className='mt-1 block font-medium'>
                Ya se habían entregado {cop(view.deliveredCOP)}: revísalo en
                Conciliación.
              </span>
            )}
          </Callout>
        )}
        {view.state === 'sin_facturar' && (
          <Callout
            tone='warning'
            icon={TriangleAlert}
            title='No se puede entregar'
          >
            {DELIVERY_BLOCK_MESSAGE.sin_factura}
          </Callout>
        )}

        <dl className='divide-y'>
          <DefRow label='Factura'>
            {inv ? (
              inv.number
            ) : (
              <span className='text-warning-ink'>Sin factura</span>
            )}
          </DefRow>
          <DefRow label='NIT o cédula'>{order.customerRut}</DefRow>
          <DefRow label='Asesor'>{order.advisor ?? 'Sin asesor'}</DefRow>
          <DefRow label='Medio de pago'>
            {inv ? (
              inv.paymentMethod
            ) : (
              <span className='text-muted-foreground'>
                Se define al facturar
              </span>
            )}
          </DefRow>
          <DefRow label='Bodega'>{warehouseName}</DefRow>
          <DefRow label={inv ? 'Fecha de factura' : 'Fecha del pedido'}>
            {shortDate(inv?.issuedAt ?? order.createdAt)}
          </DefRow>
          {inv && (
            <DefRow label='Registrada por'>
              {inv.issuedBy} · {inv.source}
            </DefRow>
          )}
        </dl>

        <section className='space-y-3'>
          <h3 className='text-base font-semibold'>Productos</h3>
          <ul className='divide-y border-y'>
            {order.lines.map((l) => {
              const s = skuMap.get(l.sku)
              const price = linePrice(l, skuMap)
              const pending = l.qtyOrdered - l.qtyPickedUp
              return (
                <li key={l.sku} className='space-y-1 py-3 text-sm'>
                  <div className='flex items-start justify-between gap-3'>
                    <div className='min-w-0'>
                      <div className='font-medium'>
                        {s ? shortName(s.name) : l.sku}
                      </div>
                      <div className='text-muted-foreground'>
                        {l.sku} · {cop(price)} por{' '}
                        {s ? s.unitMeasure.toLowerCase() : 'unidad'}
                      </div>
                    </div>
                    <div className='shrink-0 font-medium tabular-nums'>
                      {cop(l.qtyOrdered * price)}
                    </div>
                  </div>
                  <div className='flex flex-wrap gap-x-4 gap-y-0.5'>
                    <span>
                      <span className='text-muted-foreground'>Pedido </span>
                      {formatQtyWithEquivalent(l.qtyOrdered, s)}
                    </span>
                    {(l.qtyPickedUp > 0 || view.state === 'entregado') && (
                      <span>
                        <span className='text-muted-foreground'>
                          Entregado{' '}
                        </span>
                        {formatQtyWithEquivalent(l.qtyPickedUp, s)}
                      </span>
                    )}
                    {l.qtyPickedUp > 0 && pending > 0 && active && (
                      <span
                        className={cn(
                          'font-medium',
                          view.state === 'atrasado'
                            ? 'text-danger-ink'
                            : 'text-warning-ink'
                        )}
                      >
                        <span className='font-normal text-muted-foreground'>
                          Saldo{' '}
                        </span>
                        {formatQtyWithEquivalent(pending, s)}
                      </span>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
          <div className='flex items-baseline justify-between'>
            <span className='text-sm font-medium'>Total</span>
            <span className='text-lg font-semibold tabular-nums'>
              {cop(view.totalCOP)}
            </span>
          </div>
          {view.hasDeliveries && (
            <div className='space-y-1.5'>
              <ProgressBar
                value={view.deliveredPct}
                size='sm'
                tone={
                  voided || view.state === 'atrasado'
                    ? 'danger'
                    : view.state === 'entregado'
                      ? 'success'
                      : 'warning'
                }
              />
              <div className='flex justify-between text-sm text-muted-foreground'>
                <span>Entregado {cop(view.deliveredCOP)}</span>
                {view.pendingCOP > 0 && active && (
                  <span>Pendiente {cop(view.pendingCOP)}</span>
                )}
              </div>
            </div>
          )}
        </section>

        <section className='space-y-3'>
          <h3 className='text-base font-semibold'>Entregas</h3>
          {order.pickups.length === 0 ? (
            <p className='text-sm text-muted-foreground'>
              {voided || view.state === 'cancelado'
                ? 'No se entregó nada de este pedido.'
                : 'Todavía no se ha entregado nada.'}
            </p>
          ) : (
            <ol>
              {[...order.pickups].reverse().map((p, i, arr) => (
                <li
                  key={`${p.docRef}-${p.ts}`}
                  className={cn(
                    'relative space-y-1 ps-6 text-sm',
                    i < arr.length - 1 && 'pb-5'
                  )}
                >
                  <span className='absolute start-0 top-1.5 size-2.5 rounded-full bg-primary' />
                  {i < arr.length - 1 && (
                    <span className='absolute start-[4.5px] top-4 -bottom-1.5 w-px bg-border' />
                  )}
                  <div className='flex flex-wrap items-baseline justify-between gap-x-3'>
                    <span className='font-medium'>Remisión {p.docRef}</span>
                    <span className='text-muted-foreground'>{stamp(p.ts)}</span>
                  </div>
                  <div className='text-muted-foreground'>
                    Recibió {p.receivedByName} · doc. {p.receivedByRut}
                  </div>
                  <div className='text-muted-foreground'>
                    Entregó {p.deliveredBy ?? 'sin registrar'}
                  </div>
                  <ul>
                    {p.items.map((it) => {
                      const s = skuMap.get(it.sku)
                      return (
                        <li key={it.sku}>
                          {formatQtyWithEquivalent(it.qty, s)} ·{' '}
                          {s ? shortName(s.name) : it.sku}
                        </li>
                      )
                    })}
                  </ul>
                  <PhotoStrip photos={p.photos} size='sm' />
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      {hasActions && (
        <SheetFooter className='flex-col-reverse gap-2 border-t p-4 sm:flex-row sm:justify-end sm:p-5'>
          {showCancel && (
            <Button
              variant='outline'
              className={cn('h-11 sm:h-10', DANGER_OUTLINE)}
              onClick={() => onCancel(order.id)}
            >
              Cancelar pedido
            </Button>
          )}
          {showVoid && (
            <Button
              variant='outline'
              className={cn('h-11 sm:h-10', DANGER_OUTLINE)}
              onClick={() => onVoid(order.id)}
            >
              Anular factura
            </Button>
          )}
          {showDeliver && (
            <Button className='h-11 sm:h-10' onClick={onGoToPickup}>
              Ir a entregar
            </Button>
          )}
          {showInvoice && (
            <Button
              className='h-11 sm:h-10'
              onClick={() => onInvoice(order.id)}
            >
              Facturar
            </Button>
          )}
        </SheetFooter>
      )}
    </>
  )
}
