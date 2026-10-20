import {
  Calendar,
  Clock,
  ExternalLink,
  History,
  MapPin,
  Ruler,
  ShoppingBag,
  Truck,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { useWms } from '@/context/wms-provider'
import {
  EXPIRY_WARN_DAYS,
  daysBetween,
  formatQtyWithEquivalent,
  totalPhysicalPartida,
  type Partida,
} from '@/features/wms/domain/inventory'
import { cop, nf } from '@/features/wms/screens/ui-helpers'
import { CategoryAvatar, CategoryBadge } from './category-icons'
import { StockCompositionBar } from './stock-composition-bar'

const TODAY_STR = '2026-10-20'

interface PartidaDetailDrawerProps {
  partida: Partida | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onNavigateToOrder?: (orderId: string) => void
}

export function PartidaDetailDrawer({
  partida,
  open,
  onOpenChange,
  onNavigateToOrder,
}: PartidaDetailDrawerProps) {
  const { skus, movements, orders } = useWms()

  if (!partida) return null

  const skuItem = skus.find((s) => s.sku === partida.sku)
  const totalPhysical = totalPhysicalPartida(partida)
  const totalValue = totalPhysical * (skuItem?.unitCost ?? 0)

  // Movements for this specific partida
  const partidaMovements = movements
    .filter((m) => m.partidaId === partida.id)
    .sort((a, b) => b.ts.localeCompare(a.ts))

  // Orders that allocate stock from this partida
  const allocatingOrders = orders.filter((o) =>
    o.lines.some((l) =>
      l.allocations.some((al) => al.partidaId === partida.id)
    )
  )

  const daysSinceReceived = daysBetween(partida.receivedAt, TODAY_STR)
  const daysSinceLastOut = daysBetween(partida.lastOutAt, TODAY_STR)
  const daysToExpiry = partida.expiry
    ? daysBetween(TODAY_STR, partida.expiry)
    : null

  const isExpiringSoon =
    daysToExpiry !== null && daysToExpiry <= EXPIRY_WARN_DAYS
  const isStale = daysSinceLastOut >= 60

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className='w-full sm:max-w-md overflow-y-auto p-0'>
        <div className='p-6 space-y-6'>
          {/* Header */}
          <SheetHeader className='p-0 space-y-2'>
            <div className='flex items-start gap-3'>
              <CategoryAvatar
                category={skuItem?.category ?? 'Otros'}
                size='lg'
              />
              <div className='flex-1 min-w-0'>
                <div className='flex items-center gap-2'>
                  <span className='font-mono text-xs font-bold text-primary'>
                    {partida.id}
                  </span>
                  <CategoryBadge
                    category={skuItem?.category ?? 'Otros'}
                    className='text-[10px] py-0'
                  />
                </div>
                <SheetTitle className='text-base font-semibold leading-snug line-clamp-2 mt-1'>
                  {skuItem?.name ?? partida.sku}
                </SheetTitle>
                <SheetDescription className='text-xs font-mono text-muted-foreground mt-0.5'>
                  SKU: {partida.sku}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          {/* Quick Location, Supplier & Reception Tag */}
          <div className='flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/40 p-3 text-xs'>
            <div className='flex items-center gap-1.5'>
              <MapPin className='size-3.5 text-muted-foreground' />
              <span>
                Bodega: <strong>{partida.warehouse}</strong>
              </span>
            </div>
            <div className='flex items-center gap-1.5'>
              <Calendar className='size-3.5 text-muted-foreground' />
              <span>
                Ingreso: <strong>hace {daysSinceReceived}d</strong>
              </span>
            </div>
            <div className='flex items-center gap-1.5'>
              <Truck className='size-3.5 text-muted-foreground' />
              <span className='truncate max-w-[130px]'>
                {partida.supplier}
              </span>
            </div>
          </div>

          {/* Visual Stock Composition Card */}
          <div className='space-y-3 rounded-lg border bg-card p-4'>
            <div className='flex items-center justify-between'>
              <span className='text-xs font-semibold'>
                Desglose Físico de Stock
              </span>
              <div className='text-end'>
                <span className='text-sm font-bold tabular-nums'>
                  {formatQtyWithEquivalent(totalPhysical, skuItem)}
                </span>
                <span className='block text-[10px] text-muted-foreground tabular-nums'>
                  {cop(totalValue)}
                </span>
              </div>
            </div>

            {skuItem?.conversions?.[0] && (
              <div className='flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 text-[11px] text-indigo-700 dark:text-indigo-300 font-mono'>
                <Ruler className='size-3.5 text-indigo-600 shrink-0' />
                <span className='truncate'>
                  1 {skuItem.unitMeasure} = {skuItem.conversions[0].factor} {skuItem.conversions[0].targetUnit}
                  {skuItem.conversions[0].description ? ` · ${skuItem.conversions[0].description}` : ''}
                </span>
              </div>
            )}

            <StockCompositionBar
              qty={partida.qty}
              totalPhysical={totalPhysical}
              height='md'
              showLabels
            />
          </div>

          {/* Lifespan & Rotation Gauge */}
          <div className='grid grid-cols-2 gap-2 text-xs'>
            <div className='rounded-lg border p-3 bg-card'>
              <div className='flex items-center gap-1.5 text-muted-foreground'>
                <Clock className='size-3.5' />
                <span>Rotación</span>
              </div>
              <div className='mt-1 text-base font-bold tabular-nums'>
                {daysSinceLastOut} días
              </div>
              <span
                className={`text-[10px] ${
                  isStale ? 'text-amber-600 font-semibold' : 'text-muted-foreground'
                }`}
              >
                {isStale ? 'Partida rezagada (≥60d)' : 'Rotación activa'}
              </span>
            </div>

            <div className='rounded-lg border p-3 bg-card'>
              <div className='flex items-center gap-1.5 text-muted-foreground'>
                <Calendar className='size-3.5' />
                <span>Vencimiento FEFO</span>
              </div>
              <div className='mt-1 text-base font-bold tabular-nums'>
                {partida.expiry ? `${daysToExpiry} días` : 'No aplica'}
              </div>
              <span
                className={`text-[10px] ${
                  isExpiringSoon
                    ? 'text-rose-600 font-semibold'
                    : 'text-muted-foreground'
                }`}
              >
                {partida.expiry
                  ? isExpiringSoon
                    ? `¡Por vencer! (${partida.expiry})`
                    : `Vence ${partida.expiry}`
                  : 'Sin fecha de caducidad'}
              </span>
            </div>
          </div>

          {/* Reserved Orders */}
          <div className='space-y-2'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-1.5 text-xs font-semibold'>
                <ShoppingBag className='size-3.5 text-primary' />
                <span>Pedidos asignados ({allocatingOrders.length})</span>
              </div>
              <span className='text-[10px] text-muted-foreground'>
                Reserva activa
              </span>
            </div>

            {allocatingOrders.length === 0 ? (
              <p className='text-xs text-muted-foreground italic rounded-md border border-dashed p-3 text-center'>
                Sin pedidos reservados en esta partida.
              </p>
            ) : (
              <div className='space-y-1.5'>
                {allocatingOrders.map((ord) => {
                  const allocQty = ord.lines
                    .flatMap((l) => l.allocations)
                    .filter((a) => a.partidaId === partida.id)
                    .reduce((sum, a) => sum + a.qty, 0)

                  return (
                    <div
                      key={ord.id}
                      className='flex items-center justify-between rounded-lg border bg-background p-2.5 text-xs'
                    >
                      <div>
                        <div className='font-semibold'>{ord.id}</div>
                        <div className='text-[11px] text-muted-foreground truncate max-w-[200px]'>
                          {ord.customer}
                        </div>
                      </div>
                      <div className='flex items-center gap-2'>
                        <Badge variant='secondary' className='text-[10px]'>
                          {allocQty} uds
                        </Badge>
                        {onNavigateToOrder && (
                          <button
                            type='button'
                            onClick={() => onNavigateToOrder(ord.id)}
                            className='text-primary hover:text-primary/80'
                            title='Ver pedido'
                          >
                            <ExternalLink className='size-3.5' />
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Kárdex timeline for this partida */}
          <div className='space-y-2.5'>
            <div className='flex items-center gap-1.5 text-xs font-semibold'>
              <History className='size-3.5 text-primary' />
              <span>Historial de movimientos ({partidaMovements.length})</span>
            </div>

            <div className='relative space-y-3 pl-4 border-l'>
              {partidaMovements.map((m) => (
                <div key={m.id} className='relative pl-3 text-xs'>
                  <div className='absolute -left-[21px] top-1 size-2 rounded-full bg-primary ring-2 ring-background' />
                  <div className='flex items-center justify-between gap-2'>
                    <span className='font-semibold'>{m.type}</span>
                    <span className='font-bold tabular-nums'>
                      {m.qty > 0 ? `+${nf(m.qty)}` : nf(m.qty)} uds
                    </span>
                  </div>
                  <div className='text-[11px] text-muted-foreground'>
                    Ref: {m.ref} · {m.user}
                  </div>
                  <div className='text-[10px] text-muted-foreground mt-0.5'>
                    {m.ts}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
