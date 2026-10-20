import { useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  Clock,
  ExternalLink,
  FileWarning,
  MoveRight,
  PackageCheck,
  ShieldAlert,
  ShoppingBag,
  Truck,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useWms } from '@/context/wms-provider'
import {
  DonutStockChart,
  type DonutSegment,
} from '@/features/wms/components/visual/donut-stock-chart'
import {
  APPROVAL_THRESHOLD_COP,
  EXPIRY_WARN_DAYS,
  PICKUP_OVERDUE_DAYS,
  daysBetween,
} from '@/features/wms/domain/inventory'
import { EmptyState, PageHeader, cop, nf } from './ui-helpers'

const TODAY_STR = '2026-10-20'

export function PanelScreen({
  onNavigate,
}: {
  onNavigate: (slug: string) => void
}) {
  const {
    buckets,
    orders,
    damages,
    adjustments,
    claims,
    partidas,
    matchesScope,
  } = useWms()

  const [selectedDonutSegment, setSelectedDonutSegment] = useState<string | null>(null)

  const totalPhys = Math.max(1, buckets.enExistencia.totalPhysicalUnits)

  const cards = [
    {
      id: 'disponible',
      title: '1. En existencia (Disponible)',
      slug: '2-1',
      icon: Boxes,
      units: buckets.enExistencia.units,
      valueCOP: buckets.enExistencia.valueCOP ?? buckets.enExistencia.valueUSD,
      meta: `Stock físico total: ${nf(buckets.enExistencia.totalPhysicalUnits)} uds`,
      color: '#10b981', // emerald-500
      pctOfTotal: (buckets.enExistencia.units / totalPhys) * 100,
      critical: false,
    },
    {
      id: 'porEntregar',
      title: '2. Por entregar (Retiro mostrador)',
      slug: '4-1',
      icon: ShoppingBag,
      units: buckets.porEntregar.units,
      valueCOP: buckets.porEntregar.valueCOP ?? buckets.porEntregar.valueUSD,
      meta: `${buckets.porEntregar.activeOrdersCount} pedidos activos · ${buckets.porEntregar.overdueOrdersCount} >${PICKUP_OVERDUE_DAYS}d`,
      color: '#2563eb', // blue-600
      pctOfTotal: (buckets.porEntregar.units / totalPhys) * 100,
      critical: buckets.porEntregar.overdueOrdersCount > 0,
    },
    {
      id: 'danada',
      title: '3. Dañada (Roturas / averías)',
      slug: '5-1',
      icon: ShieldAlert,
      units: buckets.danada.units,
      valueCOP: buckets.danada.valueCOP ?? buckets.danada.valueUSD,
      meta: `${buckets.danada.pendingReportsCount} reportes pendientes de decisión`,
      color: '#ef4444', // red-500
      pctOfTotal: (buckets.danada.units / totalPhys) * 100,
      critical: buckets.danada.units > 0,
    },
    {
      id: 'porReclamar',
      title: '4. Por reclamar (Prov. / Cliente)',
      slug: '6-1',
      icon: FileWarning,
      units: buckets.porReclamar.units,
      valueCOP: buckets.porReclamar.openClaimsCOP ?? buckets.porReclamar.openClaimsUSD,
      meta: `${buckets.porReclamar.openClaimsCount} casos de reclamo abiertos`,
      color: '#f59e0b', // amber-500
      pctOfTotal: (buckets.porReclamar.units / totalPhys) * 100,
      critical: buckets.porReclamar.openClaimsCount > 0,
    },
    {
      id: 'rezagada',
      title: '5. Rezagada o por vencer',
      slug: '6-2',
      icon: Clock,
      units: buckets.rezagadaPorVencer.units,
      valueCOP: buckets.rezagadaPorVencer.valueCOP ?? buckets.rezagadaPorVencer.valueUSD,
      meta: `${buckets.rezagadaPorVencer.stalePartidasCount} rezagadas (≥60d) · ${buckets.rezagadaPorVencer.expiringSoonCount} por vencer`,
      color: '#d97706', // amber-600
      pctOfTotal: (buckets.rezagadaPorVencer.units / totalPhys) * 100,
      critical: buckets.rezagadaPorVencer.expiringSoonCount > 0,
    },
    {
      id: 'perdida',
      title: '6. Pérdida confirmada (Mes)',
      slug: '5-3',
      icon: AlertTriangle,
      units: buckets.perdidaMes.units,
      valueCOP: buckets.perdidaMes.valueCOP ?? buckets.perdidaMes.valueUSD,
      meta: `${buckets.perdidaMes.pendingAdjustmentsCount} ajustes de conteo esperan firma`,
      color: '#e11d48', // rose-600
      pctOfTotal: Math.min(100, (buckets.perdidaMes.units / Math.max(1, buckets.enExistencia.units)) * 100),
      critical: buckets.perdidaMes.pendingAdjustmentsCount > 0,
    },
  ]

  const donutSegments: DonutSegment[] = [
    {
      id: 'disponible',
      label: 'Disponible',
      units: buckets.enExistencia.units,
      valueCOP: buckets.enExistencia.valueCOP ?? buckets.enExistencia.valueUSD,
      color: '#10b981',
    },
    {
      id: 'reservado',
      label: 'Reservado (Pedidos)',
      units: buckets.porEntregar.units,
      valueCOP: buckets.porEntregar.valueCOP ?? buckets.porEntregar.valueUSD,
      color: '#2563eb',
    },
    {
      id: 'transito',
      label: 'En tránsito',
      units: buckets.enExistencia.inTransitUnits,
      valueCOP: buckets.enExistencia.inTransitUnits * 75000,
      color: '#64748b',
    },
    {
      id: 'reclamo',
      label: 'En reclamo',
      units: buckets.porReclamar.units,
      valueCOP: buckets.porReclamar.openClaimsCOP ?? buckets.porReclamar.openClaimsUSD,
      color: '#f59e0b',
    },
    {
      id: 'danado',
      label: 'Dañado',
      units: buckets.danada.units,
      valueCOP: buckets.danada.valueCOP ?? buckets.danada.valueUSD,
      color: '#ef4444',
    },
  ]

  const handleDonutClick = (id: string) => {
    setSelectedDonutSegment(id)
    if (id === 'disponible') onNavigate('2-1')
    if (id === 'reservado') onNavigate('4-1')
    if (id === 'transito') onNavigate('2-3')
    if (id === 'reclamo') onNavigate('6-1')
    if (id === 'danado') onNavigate('5-1')
  }

  // Acciones prioritarias de hoy
  const pendingApprovals = [
    ...damages
      .filter((d) => matchesScope(d.warehouse) && d.status === 'Pendiente')
      .map((d) => ({
        id: d.id,
        kind: 'Daño por aprobar',
        title: `${d.sku} (${d.qty} uds) · ${d.reason}`,
        warehouse: d.warehouse,
        valueUSD: d.valueUSD,
        slug: '5-1',
      })),
    ...adjustments
      .filter((a) => matchesScope(a.warehouse) && a.status === 'Pendiente')
      .map((a) => ({
        id: a.id,
        kind: 'Ajuste de conteo',
        title: `${a.sku} (${a.qtyDelta} uds) · ${a.reason}`,
        warehouse: a.warehouse,
        valueUSD: a.valueUSD,
        slug: '5-3',
      })),
  ]

  const overdueOrders = orders
    .filter(
      (o) =>
        matchesScope(o.warehouse) &&
        (o.status === 'Reservado' ||
          o.status === 'Preparado' ||
          o.status === 'Retiro parcial') &&
        daysBetween(o.readyAt ?? o.createdAt, TODAY_STR) > PICKUP_OVERDUE_DAYS
    )

  const expiringPartidas = partidas.filter(
    (p) =>
      matchesScope(p.warehouse) &&
      p.qty.disponible > 0 &&
      p.expiry !== null &&
      daysBetween(TODAY_STR, p.expiry) <= EXPIRY_WARN_DAYS
  )

  const openClaims = claims.filter(
    (c) => matchesScope(c.warehouse) && c.status !== 'Resuelto'
  )

  return (
    <div className='space-y-6'>
      <PageHeader
        title='Mapa de mercancía'
        subtitle='Visibilidad completa de existencias, pedidos por retirar, daños, reclamos, rezagos y pérdidas sin doble conteo.'
      />

      {/* Viaje de la Mercancía en Tiempo Real: Pipeline Visual Clicable */}
      <div className='rounded-xl border bg-gradient-to-r from-card via-card to-muted/20 p-4 shadow-xs'>
        <div className='flex items-center justify-between border-b pb-2 mb-3'>
          <div className='flex items-center gap-2'>
            <span className='size-2 rounded-full bg-emerald-500 animate-pulse' />
            <h3 className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
              Viaje Operativo de la Mercancía
            </h3>
          </div>
          <span className='text-[11px] text-muted-foreground'>
            Haz clic en cualquier fase para entrar al módulo
          </span>
        </div>

        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3'>
          {/* Fase 1: Recepción */}
          <button
            type='button'
            onClick={() => onNavigate('3-1')}
            className='group flex flex-col justify-between rounded-lg border bg-background p-3 text-start transition-all hover:border-primary/50 hover:shadow-sm cursor-pointer'
          >
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                <div className='flex size-7 items-center justify-center rounded-md bg-sky-500/10 text-sky-600 dark:text-sky-400'>
                  <Truck className='size-3.5' />
                </div>
                <span className='text-xs font-semibold'>1. Entradas</span>
              </div>
              <MoveRight className='size-3.5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all' />
            </div>
            <div className='mt-2.5'>
              <div className='text-sm font-bold text-foreground'>Recepción de Guías</div>
              <div className='text-[11px] text-muted-foreground mt-0.5'>
                Control ciego & segregación inmediata
              </div>
            </div>
          </button>

          {/* Fase 2: Almacén y Existencias */}
          <button
            type='button'
            onClick={() => onNavigate('2-1')}
            className='group flex flex-col justify-between rounded-lg border bg-background p-3 text-start transition-all hover:border-primary/50 hover:shadow-sm cursor-pointer'
          >
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                <div className='flex size-7 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'>
                  <PackageCheck className='size-3.5' />
                </div>
                <span className='text-xs font-semibold'>2. Existencias</span>
              </div>
              <MoveRight className='size-3.5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all' />
            </div>
            <div className='mt-2.5'>
              <div className='text-sm font-bold text-foreground'>Stock Disponible</div>
              <div className='text-[11px] text-muted-foreground mt-0.5'>
                {nf(buckets.enExistencia.units)} uds aptas para venta
              </div>
            </div>
          </button>

          {/* Fase 3: Salidas y Mostrador */}
          <button
            type='button'
            onClick={() => onNavigate('4-2')}
            className='group flex flex-col justify-between rounded-lg border bg-background p-3 text-start transition-all hover:border-primary/50 hover:shadow-sm cursor-pointer'
          >
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                <div className='flex size-7 items-center justify-center rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400'>
                  <ShoppingBag className='size-3.5' />
                </div>
                <span className='text-xs font-semibold'>3. Salidas</span>
              </div>
              <MoveRight className='size-3.5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all' />
            </div>
            <div className='mt-2.5'>
              <div className='text-sm font-bold text-foreground'>Retiro Mostrador</div>
              <div className='text-[11px] text-muted-foreground mt-0.5'>
                {buckets.porEntregar.activeOrdersCount} pedidos esperando cliente
              </div>
            </div>
          </button>

          {/* Fase 4: Control de Pérdidas */}
          <button
            type='button'
            onClick={() => onNavigate('5-1')}
            className='group flex flex-col justify-between rounded-lg border bg-background p-3 text-start transition-all hover:border-primary/50 hover:shadow-sm cursor-pointer'
          >
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                <div className='flex size-7 items-center justify-center rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400'>
                  <ShieldAlert className='size-3.5' />
                </div>
                <span className='text-xs font-semibold'>4. Control</span>
              </div>
              <ExternalLink className='size-3.5 text-muted-foreground group-hover:text-primary transition-all' />
            </div>
            <div className='mt-2.5'>
              <div className='text-sm font-bold text-foreground'>Pérdidas & Reclamos</div>
              <div className='text-[11px] text-muted-foreground mt-0.5'>
                Umbral COP 1.2M & resolución dual
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Gráfico Donut de Distribución Física + Resumen Numérico */}
      <div className='rounded-xl border bg-card p-5 shadow-xs'>
        <div className='flex flex-wrap items-center justify-between gap-2 border-b pb-3 mb-4'>
          <div>
            <h2 className='text-sm font-semibold'>
              Distribución Física del Inventario
            </h2>
            <p className='text-xs text-muted-foreground'>
              Principio fundamental: 1 unidad física existe en exactamente 1 estado a la vez
            </p>
          </div>
          <div className='flex items-center gap-2'>
            <Badge variant='outline' className='font-mono text-xs'>
              Total: {nf(buckets.enExistencia.totalPhysicalUnits)} uds
            </Badge>
            <Badge variant='secondary' className='font-mono text-xs'>
              {cop(buckets.enExistencia.totalPhysicalCOP ?? buckets.enExistencia.totalPhysicalUSD)}
            </Badge>
          </div>
        </div>

        <DonutStockChart
          segments={donutSegments}
          totalUnits={buckets.enExistencia.totalPhysicalUnits}
          totalCOP={buckets.enExistencia.totalPhysicalCOP ?? buckets.enExistencia.totalPhysicalUSD}
          size={210}
          strokeWidth={28}
          selectedSegmentId={selectedDonutSegment}
          onSegmentClick={handleDonutClick}
        />
      </div>

      {/* 6 Tarjetas con Micro-Métricas e Indicadores Gráficos */}
      <div className='grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3'>
        {cards.map((c) => {
          const Icon = c.icon
          return (
            <button
              key={c.title}
              type='button'
              onClick={() => onNavigate(c.slug)}
              className='group relative flex flex-col justify-between overflow-hidden rounded-xl border bg-card p-4 text-start transition-all hover:border-primary/40 hover:shadow-md cursor-pointer'
            >
              {/* Colored top accent bar */}
              <div
                className='absolute inset-x-0 top-0 h-1'
                style={{ backgroundColor: c.color }}
              />

              <div className='flex w-full items-start justify-between'>
                <span className='text-xs font-semibold text-muted-foreground line-clamp-1'>
                  {c.title}
                </span>
                <div
                  className='flex size-7 shrink-0 items-center justify-center rounded-md border'
                  style={{
                    backgroundColor: `${c.color}15`,
                    borderColor: `${c.color}30`,
                    color: c.color,
                  }}
                >
                  <Icon className='size-4' />
                </div>
              </div>

              <div className='my-3 flex items-baseline justify-between gap-2'>
                <div className='text-2xl font-bold tabular-nums text-foreground'>
                  {nf(c.units)} <span className='text-xs font-normal text-muted-foreground'>uds</span>
                </div>
                <div className='text-sm font-semibold tabular-nums text-muted-foreground'>
                  {cop(c.valueCOP)}
                </div>
              </div>

              {/* Sparkline mini progress */}
              <div className='mb-2 w-full'>
                <div className='h-1.5 w-full overflow-hidden rounded-full bg-muted'>
                  <div
                    className='h-full rounded-full transition-all'
                    style={{
                      width: `${Math.min(100, Math.max(3, c.pctOfTotal))}%`,
                      backgroundColor: c.color,
                    }}
                  />
                </div>
              </div>

              <div className='flex w-full items-center justify-between border-t pt-2.5 text-xs text-muted-foreground'>
                <span className='truncate text-[11px]'>{c.meta}</span>
                <ArrowRight className='size-3.5 shrink-0 transition-transform group-hover:translate-x-1 group-hover:text-foreground' />
              </div>
            </button>
          )
        })}
      </div>

      {/* Requiere acción hoy: Aprobaciones y Alertas */}
      <div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
        {/* Aprobaciones pendientes */}
        <div className='rounded-xl border bg-card p-4 space-y-3 shadow-xs'>
          <div className='flex items-center justify-between border-b pb-2'>
            <div className='flex items-center gap-2'>
              <ShieldAlert className='size-4 text-primary' />
              <h2 className='text-sm font-semibold'>
                Aprobaciones pendientes ({pendingApprovals.length})
              </h2>
            </div>
            <span className='text-[11px] text-muted-foreground'>
              JB ≤ {cop(APPROVAL_THRESHOLD_COP)} · GER &gt; {cop(APPROVAL_THRESHOLD_COP)}
            </span>
          </div>

          <div className='divide-y'>
            {pendingApprovals.length === 0 && (
              <EmptyState text='No hay bajas ni ajustes pendientes de firma.' />
            )}
            {pendingApprovals.map((item) => (
              <div
                key={item.id}
                className='flex items-center justify-between gap-3 py-2.5 text-xs hover:bg-muted/20 px-1 rounded-md transition-colors'
              >
                <div>
                  <div className='flex items-center gap-1.5'>
                    <span className='font-semibold'>{item.id}</span>
                    <Badge variant='outline' className='text-[10px] py-0'>
                      {item.kind}
                    </Badge>
                    <span className='text-primary font-medium text-[11px]'>
                      {item.warehouse}
                    </span>
                  </div>
                  <div className='mt-0.5 text-muted-foreground line-clamp-1'>
                    {item.title}
                  </div>
                </div>
                <div className='flex items-center gap-2 shrink-0'>
                  <Badge
                    variant={
                      item.valueUSD > APPROVAL_THRESHOLD_COP
                        ? 'destructive'
                        : 'secondary'
                    }
                    className='text-[10px] tabular-nums'
                  >
                    {cop(item.valueUSD)}
                  </Badge>
                  <Button
                    size='sm'
                    variant='outline'
                    className='h-7 text-xs px-2.5'
                    onClick={() => onNavigate(item.slug)}
                  >
                    Revisar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Alertas operativas */}
        <div className='rounded-xl border bg-card p-4 space-y-3 shadow-xs'>
          <div className='flex items-center justify-between border-b pb-2'>
            <div className='flex items-center gap-2'>
              <AlertTriangle className='size-4 text-amber-500' />
              <h2 className='text-sm font-semibold'>
                Alertas de retiro, vencimiento y reclamos
              </h2>
            </div>
            <span className='text-[11px] text-muted-foreground'>
              Requiere gestión prioritaria
            </span>
          </div>

          <div className='divide-y text-xs'>
            {overdueOrders.map((o) => {
              const days = daysBetween(o.readyAt ?? o.createdAt, TODAY_STR)
              return (
                <div
                  key={o.id}
                  className='flex items-center justify-between gap-2 py-2.5 hover:bg-muted/20 px-1 rounded-md transition-colors'
                >
                  <div>
                    <div className='font-semibold flex items-center gap-1.5'>
                      <span>{o.id}</span>
                      <span className='text-muted-foreground'>· {o.customer}</span>
                    </div>
                    <div className='text-destructive font-medium text-[11px]'>
                      {o.warehouse} · Listo hace {days} días sin retirar (&gt;{PICKUP_OVERDUE_DAYS}d)
                    </div>
                  </div>
                  <Button
                    size='sm'
                    variant='outline'
                    className='h-7 text-xs px-2.5 shrink-0'
                    onClick={() => onNavigate('4-1')}
                  >
                    Ver pedido
                  </Button>
                </div>
              )
            })}
            {expiringPartidas.map((p) => {
              const daysLeft = daysBetween(TODAY_STR, p.expiry!)
              return (
                <div
                  key={p.id}
                  className='flex items-center justify-between gap-2 py-2.5 hover:bg-muted/20 px-1 rounded-md transition-colors'
                >
                  <div>
                    <div className='font-semibold'>
                      {p.id} · {p.sku} ({p.qty.disponible} uds)
                    </div>
                    <div className='text-rose-600 dark:text-rose-400 font-medium text-[11px]'>
                      {p.warehouse} · Vence en {daysLeft} días ({p.expiry})
                    </div>
                  </div>
                  <Button
                    size='sm'
                    variant='outline'
                    className='h-7 text-xs px-2.5 shrink-0'
                    onClick={() => onNavigate('6-2')}
                  >
                    Ver FEFO
                  </Button>
                </div>
              )
            })}
            {openClaims.slice(0, 2).map((c) => (
              <div
                key={c.id}
                className='flex items-center justify-between gap-2 py-2.5 hover:bg-muted/20 px-1 rounded-md transition-colors'
              >
                <div>
                  <div className='font-semibold'>
                    {c.id} ({c.type}) · {c.counterparty}
                  </div>
                  <div className='text-muted-foreground text-[11px]'>
                    {c.qty} uds ({cop(c.valueCOP ?? c.valueUSD)}) · {c.status}
                  </div>
                </div>
                <Button
                  size='sm'
                  variant='outline'
                  className='h-7 text-xs px-2.5 shrink-0'
                  onClick={() => onNavigate('6-1')}
                >
                  Gestionar
                </Button>
              </div>
            ))}
            {overdueOrders.length === 0 &&
              expiringPartidas.length === 0 &&
              openClaims.length === 0 && (
                <EmptyState text='Sin alertas operativas activas.' />
              )}
          </div>
        </div>
      </div>
    </div>
  )
}
