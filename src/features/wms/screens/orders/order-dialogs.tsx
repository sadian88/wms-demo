import { useState } from 'react'
import { TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useWms } from '@/context/wms-provider'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
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
import { Textarea } from '@/components/ui/textarea'
import { Callout, Field } from '@/features/wms/components/kit'
import {
  PAYMENT_METHODS,
  type PaymentMethod,
} from '@/features/wms/domain/inventory'
import {
  normalizeInvoiceNumber,
  orderTotals,
} from '@/features/wms/domain/invoicing'
import { cop } from '../ui-helpers'
import { BTN, ChipGroup } from './step-layout'

/**
 * Mantiene el último pedido mostrado mientras el diálogo se cierra,
 * para que no se vacíe antes de terminar la animación.
 */
function useShownId(orderId: string | null) {
  const [shown, setShown] = useState(orderId)
  if (orderId && orderId !== shown) setShown(orderId)
  return orderId ?? shown
}

/* -------------------------------------------------------------------------- */
/*  Facturar                                                                   */
/* -------------------------------------------------------------------------- */

export function InvoiceDialog({
  orderId,
  onClose,
  onDone,
}: {
  orderId: string | null
  onClose: () => void
  /** Se llama cuando la factura quedó registrada. */
  onDone?: (orderId: string) => void
}) {
  const shownId = useShownId(orderId)
  return (
    <Dialog open={orderId !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className='max-h-[92dvh] overflow-y-auto sm:max-w-md'>
        {shownId && (
          <InvoiceForm
            key={shownId}
            orderId={shownId}
            onClose={onClose}
            onDone={onDone}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function InvoiceForm({
  orderId,
  onClose,
  onDone,
}: {
  orderId: string
  onClose: () => void
  onDone?: (orderId: string) => void
}) {
  const { orders, skus, prefixes, suggestInvoiceNumber, invoiceOrder } =
    useWms()
  const order = orders.find((o) => o.id === orderId)
  const activePrefixes = prefixes.filter((p) => p.active)

  const [prefix, setPrefix] = useState(
    () =>
      (activePrefixes.find((p) => p.prefix === 'FV') ?? activePrefixes[0])
        ?.prefix ?? 'FV'
  )
  const [number, setNumber] = useState(() => suggestInvoiceNumber(prefix))
  const [method, setMethod] = useState<PaymentMethod | null>(null)
  const [showErrors, setShowErrors] = useState(false)

  if (!order) return null
  const total = orderTotals(
    order,
    new Map(skus.map((s) => [s.sku, s]))
  ).totalCOP

  const normalized = normalizeInvoiceNumber(number)
  const match = normalized.match(/^([A-Z]{1,6})-(\d{1,10})$/)
  const duplicate = orders.find(
    (o) =>
      o.id !== order.id &&
      o.invoice &&
      normalizeInvoiceNumber(o.invoice.number) === normalized
  )
  let numberError = ''
  if (!match) {
    numberError = 'Escríbelo con prefijo y consecutivo, por ejemplo FV-10459.'
  } else if (!activePrefixes.some((p) => p.prefix === match[1])) {
    numberError = `El prefijo ${match[1]} no está habilitado. Usa ${activePrefixes.map((p) => p.prefix).join(' o ')}.`
  } else if (duplicate) {
    numberError = `La factura ${normalized} ya está registrada en el pedido ${duplicate.id}.`
  }
  const methodError = method ? '' : 'Elige cómo pagó el cliente.'

  const submit = () => {
    if (numberError || !method) {
      setShowErrors(true)
      return
    }
    if (invoiceOrder(order.id, { number: normalized, paymentMethod: method })) {
      onDone?.(order.id)
      onClose()
    }
  }

  return (
    <>
      <DialogHeader className='text-start'>
        <DialogTitle>Facturar pedido {order.id}</DialogTitle>
        <DialogDescription>{order.customer}</DialogDescription>
      </DialogHeader>

      <div className='flex items-baseline justify-between gap-3 rounded-lg bg-muted px-4 py-3'>
        <span className='text-sm text-muted-foreground'>Total a cobrar</span>
        <span className='text-2xl font-semibold tracking-tight tabular-nums'>
          {cop(total)}
        </span>
      </div>

      <div className='space-y-4'>
        {activePrefixes.length > 1 && (
          <div className='space-y-1.5'>
            <ChipGroup
              label='Tipo de factura'
              value={prefix}
              options={activePrefixes.map((p) => p.prefix)}
              onChange={(p) => {
                setPrefix(p)
                setNumber(suggestInvoiceNumber(p))
              }}
            />
            <p className='text-sm text-muted-foreground'>
              {activePrefixes.find((p) => p.prefix === prefix)?.description}
            </p>
          </div>
        )}
        <Field
          label='Número de factura'
          required
          hint='Cópialo tal como salió en Siigo o en la caja.'
          error={showErrors ? numberError : undefined}
        >
          <Input
            className={cn(BTN, 'tabular-nums')}
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            autoComplete='off'
            aria-invalid={showErrors && !!numberError}
          />
        </Field>
        <ChipGroup
          label='Medio de pago'
          required
          value={method}
          options={PAYMENT_METHODS}
          onChange={setMethod}
          error={showErrors ? methodError : undefined}
        />
      </div>

      <DialogFooter>
        <Button variant='outline' className={BTN} onClick={onClose}>
          Cancelar
        </Button>
        <Button className={BTN} onClick={submit}>
          Registrar factura
        </Button>
      </DialogFooter>
    </>
  )
}

/* -------------------------------------------------------------------------- */
/*  Anular factura                                                             */
/* -------------------------------------------------------------------------- */

export function VoidInvoiceDialog({
  orderId,
  onClose,
}: {
  orderId: string | null
  onClose: () => void
}) {
  const shownId = useShownId(orderId)
  return (
    <Dialog open={orderId !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className='max-h-[92dvh] overflow-y-auto sm:max-w-md'>
        {shownId && (
          <VoidForm key={shownId} orderId={shownId} onClose={onClose} />
        )}
      </DialogContent>
    </Dialog>
  )
}

function VoidForm({
  orderId,
  onClose,
}: {
  orderId: string
  onClose: () => void
}) {
  const { orders, skus, voidInvoice } = useWms()
  const order = orders.find((o) => o.id === orderId)
  const [reason, setReason] = useState('')
  const [showError, setShowError] = useState(false)
  if (!order?.invoice) return null

  const totals = orderTotals(order, new Map(skus.map((s) => [s.sku, s])))
  const delivered = totals.deliveredUnits > 0
  const reasonError =
    reason.trim().length < 5
      ? 'Escribe el motivo para que quede en el historial (mínimo 5 letras).'
      : ''

  const submit = () => {
    if (reasonError) {
      setShowError(true)
      return
    }
    if (voidInvoice(order.id, reason)) onClose()
  }

  return (
    <>
      <DialogHeader className='text-start'>
        <DialogTitle>Anular factura {order.invoice.number}</DialogTitle>
        <DialogDescription>
          {order.customer} · pedido {order.id}
        </DialogDescription>
      </DialogHeader>

      {delivered ? (
        <Callout
          tone='warning'
          icon={TriangleAlert}
          title='Ya se entregó mercancía de esta factura'
        >
          Salieron {cop(totals.deliveredCOP)} de bodega. La factura queda
          anulada, pero esa mercancía ya no está: aparecerá en Conciliación para
          que alguien la revise.
        </Callout>
      ) : (
        <p className='text-sm text-muted-foreground'>
          Al anular, el pedido se cancela y el stock reservado vuelve a estar
          disponible. No se puede deshacer.
        </p>
      )}

      <Field
        label='Motivo de la anulación'
        required
        error={showError ? reasonError : undefined}
      >
        <Textarea
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder='Ej. Facturada al cliente equivocado'
          aria-invalid={showError && !!reasonError}
        />
      </Field>

      <DialogFooter>
        <Button variant='outline' className={BTN} onClick={onClose}>
          Volver
        </Button>
        <Button variant='destructive' className={BTN} onClick={submit}>
          Anular factura
        </Button>
      </DialogFooter>
    </>
  )
}

/* -------------------------------------------------------------------------- */
/*  Cancelar pedido                                                            */
/* -------------------------------------------------------------------------- */

export function CancelOrderDialog({
  orderId,
  onClose,
}: {
  orderId: string | null
  onClose: () => void
}) {
  const { orders, cancelOrder } = useWms()
  const shownId = useShownId(orderId)
  const order = orders.find((o) => o.id === shownId)
  return (
    <AlertDialog open={orderId !== null} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Cancelar el pedido {order?.id}?</AlertDialogTitle>
          <AlertDialogDescription>
            Se libera el stock reservado para {order?.customer} y el pedido deja
            de aparecer como pendiente. No se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className={BTN}>Volver</AlertDialogCancel>
          <AlertDialogAction
            className={cn(
              BTN,
              'bg-destructive text-white hover:bg-destructive/90'
            )}
            onClick={() => {
              if (order) cancelOrder(order.id)
              onClose()
            }}
          >
            Cancelar pedido
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
