import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useWms } from '@/context/wms-provider'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { DefRow, StatusPill, TONE } from '@/features/wms/components/kit'
import { findScreenBySlug } from '@/features/wms/data/catalog'
import { TODAY_STR } from '@/features/wms/domain/clock'
import {
  daysBetween,
  formatQtyWithEquivalent,
  totalPhysicalPartida,
} from '@/features/wms/domain/inventory'
import { cop, shortDate } from '@/features/wms/screens/ui-helpers'
import {
  MOVEMENT_ICON,
  movementSigned,
  movementTone,
  qtyWithUnit,
  skuUnit,
} from './movement-meta'
import { StockCompositionBar } from './stock-composition-bar'
import { STOCK_STATES, STOCK_STATE_META, partidaAlerts } from './stock-states'

interface PartidaDetailDrawerProps {
  partidaId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onNavigateToOrder?: (orderId: string) => void
  onNavigate?: (slug: string) => void
}

export function PartidaDetailDrawer({
  partidaId,
  open,
  onOpenChange,
  onNavigateToOrder,
  onNavigate,
}: PartidaDetailDrawerProps) {
  const {
    partidas,
    skus,
    movements,
    orders,
    warehouses,
    role,
    isReadOnly,
    hasAccess,
    canActOnScreen,
  } = useWms()

  const partida = partidas.find((p) => p.id === partidaId) ?? null
  if (!partida) return null

  const sku = skus.find((s) => s.sku === partida.sku)
  const unit = skuUnit(sku)
  const showCost = role !== 'ASE'
  const total = totalPhysicalPartida(partida)
  const warehouseName =
    warehouses.find((w) => w.id === partida.warehouse)?.name ??
    partida.warehouse

  const partidaMovements = movements
    .filter((m) => m.partidaId === partida.id)
    .sort((a, b) => b.ts.localeCompare(a.ts))
  const lastMovement = partidaMovements[0]

  const reservingOrders = orders
    .map((o) => ({
      order: o,
      qty: o.lines
        .flatMap((l) => l.allocations)
        .filter((a) => a.partidaId === partida.id)
        .reduce((sum, a) => sum + a.qty, 0),
    }))
    .filter((x) => x.qty > 0)

  const alerts = partidaAlerts(partida)
  const daysIdle = daysBetween(partida.lastOutAt, TODAY_STR)
  const daysReceived = daysBetween(partida.receivedAt, TODAY_STR)
  const conv = sku?.conversions?.[0]

  const canGo = (slug: string) => hasAccess(findScreenBySlug(slug).scr)
  const canAct = (slug: string) =>
    !isReadOnly && canActOnScreen(findScreenBySlug(slug).scr)

  const actions: { slug: string; label: string }[] = []
  if (canAct('5-1') && partida.qty.disponible > 0) {
    actions.push({ slug: '5-1', label: 'Reportar daño' })
  }
  if (canAct('5-2')) actions.push({ slug: '5-2', label: 'Programar conteo' })
  if (canGo('6-2') && alerts.some((a) => a.key !== 'problem')) {
    actions.push({ slug: '6-2', label: 'Ver vencimientos y rezagados' })
  }

  const go = (slug: string) => {
    onOpenChange(false)
    onNavigate?.(slug)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className='w-full gap-0 overflow-y-auto p-0 sm:max-w-md'>
        <SheetHeader className='gap-1 border-b p-5 pe-12'>
          <SheetTitle className='text-lg leading-snug'>
            {sku?.name ?? partida.sku}
          </SheetTitle>
          <SheetDescription>
            {partida.sku} · Partida {partida.id}
          </SheetDescription>
          {alerts.length > 0 && (
            <div className='flex flex-wrap gap-1.5 pt-1.5'>
              {alerts.map((a) => (
                <StatusPill key={a.key} tone={a.tone}>
                  {a.label}
                </StatusPill>
              ))}
            </div>
          )}
        </SheetHeader>

        <div className='space-y-6 p-5'>
          {/* Desglose de los 5 estados */}
          <section aria-labelledby='drawer-stock'>
            <div className='flex items-baseline justify-between gap-3'>
              <h3 id='drawer-stock' className='text-base font-semibold'>
                Stock en esta partida
              </h3>
              <span className='text-sm font-medium tabular-nums'>
                {formatQtyWithEquivalent(total, sku)}
              </span>
            </div>
            <StockCompositionBar
              qty={partida.qty}
              totalPhysical={total}
              height='md'
              className='mt-3'
            />
            <ul className='mt-3 divide-y'>
              {STOCK_STATES.map((state) => {
                const value = partida.qty[state]
                return (
                  <li
                    key={state}
                    className={cn(
                      'flex items-center gap-2.5 py-2 text-sm',
                      value === 0 && 'text-muted-foreground'
                    )}
                  >
                    <span
                      className={cn(
                        'size-2.5 shrink-0 rounded-full',
                        STOCK_STATE_META[state].dot
                      )}
                    />
                    <span className='flex-1'>
                      {STOCK_STATE_META[state].label}
                    </span>
                    <span className='font-medium tabular-nums'>
                      {value === 0 ? '—' : qtyWithUnit(value, unit)}
                    </span>
                  </li>
                )
              })}
            </ul>
            {showCost && sku && (
              <p className='mt-2 text-sm text-muted-foreground'>
                Valor a costo:{' '}
                <span className='font-medium text-foreground tabular-nums'>
                  {cop(total * sku.unitCost)}
                </span>
              </p>
            )}
          </section>

          {/* Datos de la partida */}
          <section aria-labelledby='drawer-data'>
            <h3 id='drawer-data' className='text-base font-semibold'>
              Datos de la partida
            </h3>
            <dl className='mt-1 divide-y'>
              <DefRow label='Bodega'>{warehouseName}</DefRow>
              <DefRow label='Proveedor'>{partida.supplier}</DefRow>
              <DefRow label='Ingreso'>
                {shortDate(partida.receivedAt)}
                <span className='font-normal text-muted-foreground'>
                  {' '}
                  · hace {daysReceived} d
                </span>
              </DefRow>
              <DefRow label='Vencimiento'>
                {partida.expiry ? (
                  <>
                    {shortDate(partida.expiry)}
                    <span
                      className={cn(
                        'font-normal',
                        alerts.some((a) => a.key === 'expiry')
                          ? TONE.warning.text
                          : 'text-muted-foreground'
                      )}
                    >
                      {' '}
                      · {daysBetween(TODAY_STR, partida.expiry)} d
                    </span>
                  </>
                ) : (
                  'No vence'
                )}
              </DefRow>
              <DefRow label='Última salida'>
                {shortDate(partida.lastOutAt)}
                <span className='font-normal text-muted-foreground'>
                  {' '}
                  · hace {daysIdle} d
                </span>
              </DefRow>
              {lastMovement && (
                <DefRow label='Último movimiento'>
                  {lastMovement.type}
                  <span className='font-normal text-muted-foreground'>
                    {' '}
                    · {shortDate(lastMovement.ts)} · {lastMovement.user}
                  </span>
                </DefRow>
              )}
              {conv && (
                <DefRow label='Equivalencia'>
                  1 {unit.toLowerCase()} = {conv.factor.toLocaleString('es-CO')}{' '}
                  {conv.targetUnit}
                </DefRow>
              )}
            </dl>
          </section>

          {/* Detalle bajo demanda */}
          <div className='divide-y rounded-xl border'>
            <details className='group'>
              <summary className='flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-4 text-sm font-medium'>
                <span>
                  Pedidos que reservan esta partida ({reservingOrders.length})
                </span>
                <ChevronRight className='size-4 text-muted-foreground transition-transform group-open:rotate-90' />
              </summary>
              <div className='border-t px-4 pb-1'>
                {reservingOrders.length === 0 ? (
                  <p className='py-3 text-sm text-muted-foreground'>
                    Ningún pedido tiene reservada mercancía de esta partida.
                  </p>
                ) : (
                  <ul className='divide-y'>
                    {reservingOrders.map(({ order, qty }) => (
                      <li
                        key={order.id}
                        className='flex items-center gap-3 py-2.5 text-sm'
                      >
                        <div className='min-w-0 flex-1'>
                          <div className='font-medium'>{order.id}</div>
                          <div className='truncate text-muted-foreground'>
                            {order.customer}
                          </div>
                        </div>
                        <span className='tabular-nums'>
                          {qtyWithUnit(qty, unit)}
                        </span>
                        {onNavigateToOrder && canGo('4-1') && (
                          <Button
                            type='button'
                            variant='ghost'
                            size='sm'
                            onClick={() => {
                              onOpenChange(false)
                              onNavigateToOrder(order.id)
                            }}
                          >
                            Ver
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </details>

            <details className='group'>
              <summary className='flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-4 text-sm font-medium'>
                <span>
                  Movimientos de la partida ({partidaMovements.length})
                </span>
                <ChevronRight className='size-4 text-muted-foreground transition-transform group-open:rotate-90' />
              </summary>
              <div className='border-t px-4 pb-1'>
                {partidaMovements.length === 0 ? (
                  <p className='py-3 text-sm text-muted-foreground'>
                    Esta partida aún no tiene movimientos registrados.
                  </p>
                ) : (
                  <ul className='divide-y'>
                    {partidaMovements.slice(0, 12).map((m) => {
                      const Icon = MOVEMENT_ICON[m.type]
                      const tone = movementTone(m)
                      return (
                        <li
                          key={m.id}
                          className='flex items-center gap-3 py-2.5'
                        >
                          <Icon
                            className={cn('size-4 shrink-0', TONE[tone].text)}
                            aria-hidden
                          />
                          <div className='min-w-0 flex-1 text-sm'>
                            <div className='font-medium'>{m.type}</div>
                            <div className='truncate text-muted-foreground'>
                              {m.user} · {shortDate(m.ts)} {m.ts.slice(11)}
                            </div>
                          </div>
                          <span
                            className={cn(
                              'text-sm font-medium tabular-nums',
                              TONE[tone].text
                            )}
                          >
                            {movementSigned(m)}
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            </details>
          </div>

          {actions.length > 0 && onNavigate && (
            <div className='flex flex-col gap-2 sm:flex-row sm:flex-wrap'>
              {actions.map((a) => (
                <Button
                  key={a.slug}
                  type='button'
                  variant='outline'
                  className='h-11 sm:h-9'
                  onClick={() => go(a.slug)}
                >
                  {a.label}
                </Button>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
