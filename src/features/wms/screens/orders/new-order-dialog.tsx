import { useMemo, useState } from 'react'
import { Minus, Plus, Search, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useWms } from '@/context/wms-provider'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { DefRow, Field, SELECT_CLASS } from '@/features/wms/components/kit'
import {
  formatQtyWithEquivalent,
  type PickupOrder,
  type SkuItem,
} from '@/features/wms/domain/inventory'
import { cop, nf } from '../ui-helpers'
import { CAN_INVOICE, CHANNELS, shortName, unitPlural } from './model'
import { BTN, ChipGroup, STEP_DIALOG_CLASS, StepLayout } from './step-layout'

const STEPS = ['Cliente', 'Productos', 'Resumen']

interface DraftLine {
  sku: string
  qty: number
  price: number
}

const plain = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

const pctLabel = (n: number) =>
  `${(Math.round(n * 10) / 10).toLocaleString('es-CO')}%`

export function NewOrderDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Se llama con el id del pedido creado; `andInvoice` pide abrir la factura enseguida. */
  onCreated: (orderId: string, andInvoice: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={STEP_DIALOG_CLASS}>
        <NewOrderFlow
          onClose={() => onOpenChange(false)}
          onCreated={onCreated}
        />
      </DialogContent>
    </Dialog>
  )
}

function NewOrderFlow({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: (orderId: string, andInvoice: boolean) => void
}) {
  const {
    role,
    user,
    users,
    warehouses,
    activeWarehouseIds,
    skus,
    partidas,
    createOrder,
  } = useWms()
  const canInvoice = CAN_INVOICE.includes(role)
  const canOverrideDiscount = role === 'ADM' || role === 'JB'

  const [step, setStep] = useState(0)
  const [customer, setCustomer] = useState('')
  const [nit, setNit] = useState('')
  const [wh, setWh] = useState(
    () => activeWarehouseIds[0] ?? warehouses[0]?.id ?? ''
  )
  const [channel, setChannel] = useState<PickupOrder['channel']>('Mostrador')
  const [advisor, setAdvisor] = useState(user.name)
  const [showErrors, setShowErrors] = useState(false)
  const [lines, setLines] = useState<DraftLine[]>([])
  const [query, setQuery] = useState('')

  const skuMap = useMemo(() => new Map(skus.map((s) => [s.sku, s])), [skus])
  const whName = warehouses.find((w) => w.id === wh)?.name ?? wh

  /** Disponible por SKU en la bodega elegida. */
  const available = useMemo(() => {
    const m = new Map<string, number>()
    for (const p of partidas) {
      if (p.warehouse !== wh) continue
      m.set(p.sku, (m.get(p.sku) ?? 0) + p.qty.disponible)
    }
    return m
  }, [partidas, wh])

  const advisors = useMemo(
    () => users.filter((u) => u.role === 'ASE' && u.active),
    [users]
  )

  const customerError =
    customer.trim().length < 3 ? 'Escribe el nombre del cliente.' : ''
  const nitError =
    nit.trim().length < 5
      ? 'Escribe el NIT o la cédula. Si es consumidor final usa 222222222222.'
      : ''
  const step1Valid = !customerError && !nitError && wh !== ''

  const total = lines.reduce((s, l) => s + l.qty * l.price, 0)

  /** Problemas de una línea: `error` bloquea, `warning` solo avisa. */
  const checkLine = (l: DraftLine) => {
    const s = skuMap.get(l.sku)
    const avail = available.get(l.sku) ?? 0
    let qtyError = ''
    let priceError = ''
    let warning = ''
    if (!s) return { qtyError, priceError, warning, minPrice: 0 }
    if (l.qty < 1) {
      qtyError = `Indica cuántas ${unitPlural(s.unitMeasure)} lleva.`
    } else if (avail <= 0) {
      qtyError = `No hay ${shortName(s.name)} disponible en ${whName}. Quítalo o elige otra bodega en el paso 1.`
    } else if (l.qty > avail) {
      qtyError = `Solo hay ${formatQtyWithEquivalent(avail, s)} disponibles en ${whName}. Baja la cantidad.`
    }
    const minPrice = Math.round(s.unitPrice * (1 - s.maxDiscountPct / 100))
    if (l.price <= 0) {
      priceError = 'Escribe el precio.'
    } else if (l.price < minPrice) {
      const disc = (1 - l.price / s.unitPrice) * 100
      if (canOverrideDiscount) {
        warning = `Descuento de ${pctLabel(disc)}, por encima del máximo de ${s.maxDiscountPct}%. Lo autorizas con tu perfil.`
      } else {
        priceError = `El descuento máximo es ${s.maxDiscountPct}%: el precio mínimo es ${cop(minPrice)}.`
      }
    }
    return { qtyError, priceError, warning, minPrice }
  }

  const problems = lines.filter((l) => {
    const c = checkLine(l)
    return c.qtyError || c.priceError
  }).length

  const step2Block =
    lines.length === 0
      ? 'Agrega al menos un producto para continuar.'
      : problems > 0
        ? `Corrige ${problems === 1 ? 'el producto marcado' : `los ${problems} productos marcados`} en rojo.`
        : ''

  const addSku = (s: SkuItem) => {
    setLines((prev) =>
      prev.some((l) => l.sku === s.sku)
        ? prev.map((l) => (l.sku === s.sku ? { ...l, qty: l.qty + 1 } : l))
        : [...prev, { sku: s.sku, qty: 1, price: s.unitPrice }]
    )
    setQuery('')
  }

  const patchLine = (sku: string, patch: Partial<DraftLine>) =>
    setLines((prev) =>
      prev.map((l) => (l.sku === sku ? { ...l, ...patch } : l))
    )

  const results = useMemo(() => {
    const tokens = plain(query).split(/\s+/).filter(Boolean)
    const found = skus
      .filter((s) => {
        const hay = plain(`${s.name} ${s.sku}`)
        return tokens.every((t) => hay.includes(t))
      })
      .sort(
        (a, b) =>
          Number((available.get(b.sku) ?? 0) > 0) -
            Number((available.get(a.sku) ?? 0) > 0) ||
          a.name.localeCompare(b.name)
      )
    return found
  }, [skus, query, available])

  const showResults = query.trim() !== '' || lines.length === 0
  const RESULT_LIMIT = 6

  const goNext = () => {
    if (!step1Valid) {
      setShowErrors(true)
      return
    }
    setStep(1)
  }

  const submit = (andInvoice: boolean) => {
    const id = createOrder({
      customer: customer.trim(),
      customerRut: nit.trim(),
      channel,
      warehouse: wh,
      advisor,
      lines: lines.map((l) => ({
        sku: l.sku,
        qty: l.qty,
        unitPrice: l.price,
      })),
    })
    if (!id) return
    onCreated(id, andInvoice)
    onClose()
  }

  const back = (
    <Button
      type='button'
      variant='ghost'
      className={cn(BTN, 'shrink-0 px-3')}
      onClick={() => setStep((s) => s - 1)}
    >
      Atrás
    </Button>
  )

  return (
    <StepLayout
      title='Nuevo pedido'
      description='Crea un pedido en tres pasos: cliente, productos y resumen.'
      steps={STEPS}
      current={step}
      back={step > 0 ? back : undefined}
      stackBack={step === 2 && canInvoice}
      hint={
        step === 1 ? (
          step2Block ? (
            <span className='text-warning-ink'>{step2Block}</span>
          ) : (
            <span className='text-muted-foreground'>
              Total{' '}
              <b className='text-base font-semibold text-foreground tabular-nums'>
                {cop(total)}
              </b>
            </span>
          )
        ) : undefined
      }
      actions={
        step === 0 ? (
          <Button className={BTN} onClick={goNext}>
            Continuar
          </Button>
        ) : step === 1 ? (
          <Button
            className={BTN}
            disabled={step2Block !== ''}
            onClick={() => setStep(2)}
          >
            Revisar pedido
          </Button>
        ) : (
          <>
            <Button
              variant={canInvoice ? 'outline' : 'default'}
              className={BTN}
              onClick={() => submit(false)}
            >
              Crear pedido
            </Button>
            {canInvoice && (
              <Button className={BTN} onClick={() => submit(true)}>
                Crear y facturar
              </Button>
            )}
          </>
        )
      }
    >
      {step === 0 && (
        <div className='space-y-4'>
          <Field
            label='Cliente'
            required
            error={showErrors ? customerError : undefined}
          >
            <Input
              className={BTN}
              value={customer}
              onChange={(e) => setCustomer(e.target.value)}
              placeholder='Nombre o razón social'
              autoComplete='off'
              aria-invalid={showErrors && !!customerError}
            />
          </Field>
          <Field
            label='NIT o cédula'
            required
            error={showErrors ? nitError : undefined}
          >
            <Input
              className={BTN}
              value={nit}
              onChange={(e) => setNit(e.target.value)}
              placeholder='900.123.456-7'
              autoComplete='off'
              aria-invalid={showErrors && !!nitError}
            />
          </Field>
          <Field
            label='Bodega de entrega'
            hint='De aquí se reserva el producto.'
          >
            <select
              className={cn(SELECT_CLASS, BTN)}
              value={wh}
              onChange={(e) => setWh(e.target.value)}
            >
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </Field>
          <ChipGroup
            label='Canal'
            value={channel}
            onChange={setChannel}
            options={CHANNELS}
          />
          {canOverrideDiscount && (
            <Field label='Asesor' hint='Quién atiende al cliente.'>
              <select
                className={cn(SELECT_CLASS, BTN)}
                value={advisor}
                onChange={(e) => setAdvisor(e.target.value)}
              >
                <option value={user.name}>{user.name} (tú)</option>
                {advisors
                  .filter((a) => a.name !== user.name)
                  .map((a) => (
                    <option key={a.id} value={a.name}>
                      {a.name}
                    </option>
                  ))}
              </select>
            </Field>
          )}
        </div>
      )}

      {step === 1 && (
        <div className='space-y-4'>
          <div className='space-y-2'>
            <label className='relative block'>
              <span className='sr-only'>
                Buscar producto por nombre o código
              </span>
              <Search className='pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' />
              <Input
                className={cn(BTN, 'ps-9')}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder='Buscar por nombre o código'
                autoComplete='off'
              />
            </label>
            {showResults && (
              <div className='overflow-hidden rounded-lg border'>
                {results.length === 0 ? (
                  <p className='px-3 py-4 text-sm text-muted-foreground'>
                    No encontramos «{query.trim()}». Prueba con otra palabra o
                    con el código del producto.
                  </p>
                ) : (
                  <ul className='divide-y'>
                    {results.slice(0, RESULT_LIMIT).map((s) => {
                      const avail = available.get(s.sku) ?? 0
                      return (
                        <li key={s.sku}>
                          <button
                            type='button'
                            disabled={avail <= 0}
                            onClick={() => addSku(s)}
                            className='flex min-h-14 w-full items-center gap-3 px-3 py-2 text-start transition-colors hover:bg-accent/60 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-transparent'
                          >
                            <span className='min-w-0 flex-1'>
                              <span className='block truncate text-sm font-medium'>
                                {shortName(s.name)}
                              </span>
                              <span
                                className={cn(
                                  'block truncate text-sm',
                                  avail > 0
                                    ? 'text-muted-foreground'
                                    : 'text-danger-ink'
                                )}
                              >
                                {avail > 0
                                  ? `${formatQtyWithEquivalent(avail, s)} disponibles`
                                  : 'Sin stock en esta bodega'}
                              </span>
                            </span>
                            <span className='shrink-0 text-end text-sm tabular-nums'>
                              {cop(s.unitPrice)}
                            </span>
                            <Plus className='size-4 shrink-0 text-primary' />
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
                {results.length > RESULT_LIMIT && (
                  <p className='border-t px-3 py-2 text-sm text-muted-foreground'>
                    Hay {results.length - RESULT_LIMIT} más. Escribe para acotar
                    la búsqueda.
                  </p>
                )}
              </div>
            )}
          </div>

          {lines.length > 0 && (
            <ul className='divide-y rounded-lg border'>
              {lines.map((l) => {
                const s = skuMap.get(l.sku)
                if (!s) return null
                const avail = available.get(l.sku) ?? 0
                const c = checkLine(l)
                return (
                  <li key={l.sku} className='space-y-3 p-3'>
                    <div className='flex items-start justify-between gap-2'>
                      <div className='min-w-0'>
                        <div className='text-sm font-medium'>
                          {shortName(s.name)}
                        </div>
                        <div className='text-sm text-muted-foreground'>
                          Disponible: {formatQtyWithEquivalent(avail, s)}
                        </div>
                      </div>
                      <Button
                        type='button'
                        variant='ghost'
                        size='icon'
                        className='-me-1 -mt-1 size-10 shrink-0'
                        aria-label={`Quitar ${shortName(s.name)}`}
                        onClick={() =>
                          setLines((prev) =>
                            prev.filter((x) => x.sku !== l.sku)
                          )
                        }
                      >
                        <Trash2 className='size-4' />
                      </Button>
                    </div>

                    <div className='grid grid-cols-[auto_1fr] items-start gap-3'>
                      <div
                        role='group'
                        aria-label={`Cantidad de ${shortName(s.name)}`}
                        className='space-y-1.5'
                      >
                        <span className='text-sm font-medium capitalize'>
                          {unitPlural(s.unitMeasure)}
                        </span>
                        <div className='flex items-center gap-1.5'>
                          <Button
                            type='button'
                            variant='outline'
                            size='icon'
                            className='size-11 sm:size-10'
                            aria-label='Restar uno'
                            disabled={l.qty <= 1}
                            onClick={() =>
                              patchLine(l.sku, { qty: Math.max(1, l.qty - 1) })
                            }
                          >
                            <Minus className='size-4' />
                          </Button>
                          <Input
                            inputMode='numeric'
                            className='h-11 w-16 px-1 text-center tabular-nums sm:h-10'
                            value={l.qty === 0 ? '' : String(l.qty)}
                            aria-label='Cantidad'
                            aria-invalid={!!c.qtyError}
                            onChange={(e) =>
                              patchLine(l.sku, {
                                qty:
                                  Number(e.target.value.replace(/\D/g, '')) ||
                                  0,
                              })
                            }
                          />
                          <Button
                            type='button'
                            variant='outline'
                            size='icon'
                            className='size-11 sm:size-10'
                            aria-label='Sumar uno'
                            onClick={() => patchLine(l.sku, { qty: l.qty + 1 })}
                          >
                            <Plus className='size-4' />
                          </Button>
                        </div>
                      </div>
                      <Field
                        label={`Precio por ${s.unitMeasure.toLowerCase()}`}
                      >
                        <Input
                          inputMode='numeric'
                          className='h-11 tabular-nums sm:h-10'
                          value={l.price > 0 ? nf(l.price) : ''}
                          aria-invalid={!!c.priceError}
                          onChange={(e) =>
                            patchLine(l.sku, {
                              price:
                                Number(e.target.value.replace(/\D/g, '')) || 0,
                            })
                          }
                        />
                      </Field>
                    </div>

                    {c.qtyError && (
                      <p className='text-sm text-danger-ink'>{c.qtyError}</p>
                    )}
                    {c.priceError && (
                      <p className='text-sm text-danger-ink'>{c.priceError}</p>
                    )}
                    {c.warning && (
                      <p className='text-sm text-warning-ink'>{c.warning}</p>
                    )}

                    <div className='flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-sm'>
                      <span className='text-muted-foreground'>
                        Lista {cop(s.unitPrice)} · descuento máx.{' '}
                        {s.maxDiscountPct}%
                      </span>
                      <span className='ms-auto font-semibold tabular-nums'>
                        {cop(l.qty * l.price)}
                      </span>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}

      {step === 2 && (
        <div className='space-y-4'>
          <dl className='divide-y'>
            <DefRow label='Cliente'>{customer.trim()}</DefRow>
            <DefRow label='NIT o cédula'>{nit.trim()}</DefRow>
            <DefRow label='Bodega de entrega'>{whName}</DefRow>
            <DefRow label='Canal'>{channel}</DefRow>
            <DefRow label='Asesor'>{advisor}</DefRow>
          </dl>
          <ul className='divide-y border-t'>
            {lines.map((l) => {
              const s = skuMap.get(l.sku)
              if (!s) return null
              return (
                <li
                  key={l.sku}
                  className='flex items-start justify-between gap-3 py-3 text-sm'
                >
                  <div className='min-w-0'>
                    <div className='font-medium'>{shortName(s.name)}</div>
                    <div className='text-muted-foreground'>
                      {formatQtyWithEquivalent(l.qty, s)} × {cop(l.price)}
                    </div>
                  </div>
                  <div className='shrink-0 font-medium tabular-nums'>
                    {cop(l.qty * l.price)}
                  </div>
                </li>
              )
            })}
          </ul>
          <div className='flex items-baseline justify-between border-t pt-3'>
            <span className='text-sm font-medium'>Total del pedido</span>
            <span className='text-lg font-semibold tabular-nums'>
              {cop(total)}
            </span>
          </div>
          <p className='text-sm text-muted-foreground'>
            {canInvoice
              ? 'El stock queda reservado al crear el pedido. Si ya tienes el número de factura, usa «Crear y facturar».'
              : 'El stock queda reservado al crear el pedido. Caja lo factura y recién entonces se puede entregar.'}
          </p>
        </div>
      )}
    </StepLayout>
  )
}
