import { useState } from 'react'
import {
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  FileWarning,
  FileX,
  Hourglass,
  PackageCheck,
  ReceiptText,
  Scale,
  ShieldAlert,
  ShoppingBag,
  TrendingUp,
  Truck,
  Boxes,
  Receipt,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useWms } from '@/context/wms-provider'
import { Button } from '@/components/ui/button'
import {
  FilterTabs,
  Section,
  StatusPill,
  TONE,
  type Tone,
} from '@/features/wms/components/kit'
import { CategoryAvatar } from '@/features/wms/components/visual/category-icons'
import { CategorySalesChart } from '@/features/wms/components/visual/category-sales-chart'
import { DonutStockChart } from '@/features/wms/components/visual/donut-stock-chart'
import {
  copCompact,
  listLabel,
  plural,
} from '@/features/wms/components/visual/format'
import {
  KpiTile,
  type KpiTileProps,
} from '@/features/wms/components/visual/kpi-tile'
import { SalesTrendChart } from '@/features/wms/components/visual/sales-trend-chart'
import { findScreenBySlug } from '@/features/wms/data/catalog'
import { TODAY_STR } from '@/features/wms/domain/clock'
import {
  categorySales,
  productSales,
  salesOverview,
} from '@/features/wms/domain/dashboard'
import {
  APPROVAL_THRESHOLD_COP,
  EXPIRY_WARN_DAYS,
  PICKUP_OVERDUE_DAYS,
  daysBetween,
  type RoleCode,
  type StockState,
} from '@/features/wms/domain/inventory'
import { canDeliver, reconcile } from '@/features/wms/domain/invoicing'
import { EmptyState, PageHeader, cop, nf } from './ui-helpers'

const MAX_VISIBLE_ACTIONS = 5

const PERIODS = [
  { id: '7', label: '7 días' },
  { id: '14', label: '14 días' },
  { id: '30', label: '30 días' },
] as const
type PeriodId = (typeof PERIODS)[number]['id']

interface ActionItem {
  key: string
  tone: Tone
  icon: LucideIcon
  title: string
  detail: string
  cta: string
  slug: string
}

interface Shortcut {
  slug: string
  label: string
  icon: LucideIcon
}

/** Orden de prioridad de la lista «Requiere acción hoy» para cada perfil. */
const ACTION_ORDER: Record<RoleCode, string[]> = {
  ADM: ['void', 'unbilled', 'overdue', 'dmg', 'adj', 'expiring', 'claims'],
  JB: [
    'dmg',
    'adj',
    'transfersIn',
    'transfersApprove',
    'overdue',
    'expiring',
    'claims',
    'void',
  ],
  OPE: ['ready', 'transfersIn', 'counts'],
  ASE: ['unbilled', 'overdue'],
  CAJ: ['unbilled', 'void', 'overdue'],
  GER: ['dmg', 'adj', 'void', 'expiring', 'claims'],
}

/** Atajos de lo que más se hace en cada perfil. Gerencia es solo lectura. */
const SHORTCUTS: Record<RoleCode, Shortcut[]> = {
  ADM: [
    { slug: '4-2', label: 'Entregar mercancía', icon: PackageCheck },
    { slug: '3-1', label: 'Recibir mercancía', icon: Truck },
    { slug: '4-1', label: 'Nuevo pedido', icon: ShoppingBag },
  ],
  JB: [
    { slug: '4-2', label: 'Entregar mercancía', icon: PackageCheck },
    { slug: '3-1', label: 'Recibir mercancía', icon: Truck },
    { slug: '4-1', label: 'Nuevo pedido', icon: ShoppingBag },
  ],
  OPE: [
    { slug: '4-2', label: 'Entregar mercancía', icon: PackageCheck },
    { slug: '3-1', label: 'Recibir mercancía', icon: Truck },
  ],
  ASE: [
    { slug: '4-1', label: 'Nuevo pedido', icon: ShoppingBag },
    { slug: '2-1', label: 'Consultar existencias', icon: Boxes },
  ],
  CAJ: [
    { slug: '4-1', label: 'Facturar pedidos', icon: ReceiptText },
    { slug: '4-3', label: 'Ver conciliación', icon: Receipt },
  ],
  GER: [],
}

const ACTIVE_ORDER_STATUS = ['Reservado', 'Preparado', 'Retiro parcial']

export function PanelScreen({
  onNavigate,
}: {
  onNavigate: (slug: string) => void
}) {
  const {
    user,
    role,
    buckets,
    orders,
    damages,
    adjustments,
    claims,
    partidas,
    transfers,
    counts,
    skus,
    warehouses,
    almacenes,
    warehouse,
    matchesScope,
    hasAccess,
    isReadOnly,
    canApproveAmount,
  } = useWms()

  const [showAll, setShowAll] = useState(false)
  const [period, setPeriod] = useState<PeriodId>('7')
  const days = Number(period)

  const canGo = (slug: string) => hasAccess(findScreenBySlug(slug).scr)
  const skuName = (sku: string) => skus.find((s) => s.sku === sku)?.name ?? sku
  const whName = (id: string) => warehouses.find((w) => w.id === id)?.name ?? id

  /* ------------------------------ Encabezado ------------------------------ */

  const firstName = user.name.split(' ')[0]
  let scopeLabel = 'Todas las bodegas'
  if (warehouse.startsWith('ALM:')) {
    const alm = almacenes.find((a) => a.id === warehouse.replace('ALM:', ''))
    scopeLabel = alm ? `Todo ${alm.name}` : scopeLabel
  } else if (warehouse !== 'ALL') {
    scopeLabel = whName(warehouse)
  } else if (user.scope !== 'ALL') {
    scopeLabel =
      warehouses.length === 1
        ? whName(warehouses[0].id)
        : `Tus ${warehouses.length} bodegas`
  }
  const todayLabel = (() => {
    const [y, m, d] = TODAY_STR.split('-').map(Number)
    return new Date(y, m - 1, d).toLocaleDateString('es-CO', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })
  })()

  /* ------------------------------ Banda de cifras ------------------------------ */

  const showCost = role !== 'ASE'
  const { enExistencia, porEntregar, danada, porReclamar, rezagadaPorVencer } =
    buckets
  const problemUnits = danada.units + porReclamar.units

  const activeOrders = orders.filter(
    (o) => matchesScope(o.warehouse) && ACTIVE_ORDER_STATUS.includes(o.status)
  )
  const unbilled = activeOrders.filter((o) => !o.invoice)

  const recon = reconcile(orders, skus, {
    todayStr: TODAY_STR,
    inScope: matchesScope,
  })
  const voidedDelivered = recon.rows.filter((r) =>
    r.flags.includes('anulada_con_entregas')
  )
  const overdue = recon.rows.filter((r) =>
    r.flags.includes('pendiente_vencida')
  )

  /* ------------------------------ Ventas del período ------------------------------ */

  const canSales = canGo('4-1')
  const windowOpts = { todayStr: TODAY_STR, days, inScope: matchesScope }
  const sales = salesOverview(orders, skus, windowOpts)
  const products = productSales(orders, skus, windowOpts)
  const categories = categorySales(products)

  const tileVentas: KpiTileProps = {
    label: 'Ventas facturadas',
    value: copCompact(sales.invoicedCOP),
    hint: plural(sales.invoicedCount, 'factura', 'facturas'),
    icon: TrendingUp,
    delta:
      sales.deltaPct === null
        ? null
        : { pct: sales.deltaPct, versus: `${days} días previos` },
    trend: sales.days.map((d) => d.invoicedCOP),
    onSelect: canGo('4-3') ? () => onNavigate('4-3') : undefined,
  }
  const tileExistencia: KpiTileProps = {
    label: 'En existencia',
    value: nf(enExistencia.units),
    unit: 'unidades',
    hint: showCost
      ? `${copCompact(enExistencia.valueCOP)} a costo`
      : 'Listas para vender',
    icon: Boxes,
    tone: 'success',
    onSelect: canGo('2-1') ? () => onNavigate('2-1') : undefined,
  }
  const tilePorEntregar: KpiTileProps = {
    label: 'Por entregar',
    value: nf(porEntregar.activeOrdersCount),
    unit: porEntregar.activeOrdersCount === 1 ? 'pedido' : 'pedidos',
    hint: `${copCompact(porEntregar.saleValueCOP)} de venta`,
    icon: PackageCheck,
    onSelect: canGo('4-1') ? () => onNavigate('4-1') : undefined,
  }
  const tileProblema: KpiTileProps = {
    label: 'Con problema',
    value: nf(problemUnits),
    unit: 'unidades',
    hint:
      problemUnits > 0
        ? `Dañado ${nf(danada.units)} · Reclamo ${nf(porReclamar.units)}`
        : 'Todo en orden',
    icon: ShieldAlert,
    tone:
      danada.units > 0
        ? 'danger'
        : porReclamar.units > 0
          ? 'warning'
          : 'success',
    onSelect: canGo('5-1') ? () => onNavigate('5-1') : undefined,
  }
  const tileRiesgo: KpiTileProps = {
    label: 'En riesgo',
    value: nf(rezagadaPorVencer.units),
    unit: 'unidades',
    hint:
      rezagadaPorVencer.units > 0
        ? `${plural(rezagadaPorVencer.stalePartidasCount, 'rezagada', 'rezagadas')} · ${rezagadaPorVencer.expiringSoonCount} por vencer`
        : 'Nada rezagado ni por vencer',
    icon: Hourglass,
    tone: rezagadaPorVencer.units > 0 ? 'warning' : 'success',
    onSelect: canGo('6-2') ? () => onNavigate('6-2') : undefined,
  }
  const tileSinFacturar: KpiTileProps = {
    label: 'Sin facturar',
    value: nf(unbilled.length),
    unit: unbilled.length === 1 ? 'pedido' : 'pedidos',
    hint: unbilled.length > 0 ? 'No se pueden entregar' : 'Todo facturado',
    icon: ReceiptText,
    tone: unbilled.length > 0 ? 'warning' : 'success',
    onSelect: canGo('4-1') ? () => onNavigate('4-1') : undefined,
  }
  const tileSinRetirar: KpiTileProps = {
    label: 'Sin retirar',
    value: nf(overdue.length),
    unit: overdue.length === 1 ? 'factura' : 'facturas',
    hint: `Más de ${PICKUP_OVERDUE_DAYS} días`,
    icon: CalendarClock,
    tone: overdue.length > 0 ? 'warning' : 'success',
    onSelect: canGo('4-3') ? () => onNavigate('4-3') : undefined,
  }

  const tilesByRole: Record<RoleCode, KpiTileProps[]> = {
    ADM: [
      tileVentas,
      tilePorEntregar,
      tileExistencia,
      tileProblema,
      tileRiesgo,
    ],
    JB: [tileVentas, tilePorEntregar, tileExistencia, tileProblema, tileRiesgo],
    GER: [
      tileVentas,
      tilePorEntregar,
      tileExistencia,
      tileProblema,
      tileRiesgo,
    ],
    OPE: [
      tileVentas,
      tilePorEntregar,
      tileExistencia,
      tileProblema,
      tileRiesgo,
    ],
    ASE: [tileVentas, tilePorEntregar, tileSinFacturar, tileExistencia],
    CAJ: [tileVentas, tileSinFacturar, tilePorEntregar, tileSinRetirar],
  }
  const tiles = tilesByRole[role]

  /* ------------------------------ Requiere acción hoy ------------------------------ */

  const canActOnApprovals = (value: number) => canApproveAmount(value)
  const pendingDamages = damages
    .filter(
      (d) =>
        matchesScope(d.warehouse) &&
        d.status === 'Pendiente' &&
        canActOnApprovals(d.valueCOP)
    )
    .sort((a, b) => b.valueCOP - a.valueCOP)
  const pendingAdjustments = adjustments
    .filter(
      (a) =>
        matchesScope(a.warehouse) &&
        a.status === 'Pendiente' &&
        canActOnApprovals(a.valueCOP)
    )
    .sort((a, b) => b.valueCOP - a.valueCOP)
  const expiring = partidas
    .filter(
      (p) =>
        matchesScope(p.warehouse) &&
        p.qty.disponible > 0 &&
        p.expiry !== null &&
        daysBetween(TODAY_STR, p.expiry) <= EXPIRY_WARN_DAYS
    )
    .sort((a, b) => a.expiry!.localeCompare(b.expiry!))
  const openClaims = claims.filter(
    (c) => matchesScope(c.warehouse) && c.status !== 'Resuelto'
  )
  const readyToDeliver = orders.filter(
    (o) => matchesScope(o.warehouse) && canDeliver(o)
  )
  const transfersIn = transfers.filter(
    (t) => t.status === 'En tránsito' && matchesScope(t.destWarehouse)
  )
  const transfersToApprove = transfers.filter(
    (t) => t.status === 'Solicitado' && matchesScope(t.originWarehouse)
  )
  const pendingCounts = counts.filter(
    (c) => c.status === 'Programado' && matchesScope(c.warehouse)
  )

  const canInvoice = role === 'CAJ' || role === 'ADM' || role === 'JB'

  const builders: Record<string, () => ActionItem | null> = {
    void: () => {
      if (voidedDelivered.length === 0) return null
      const one = voidedDelivered[0]
      const n = voidedDelivered.length
      return {
        key: 'void',
        tone: 'danger',
        icon: FileX,
        title:
          n === 1
            ? `La factura ${one.invoiceNumber} se anuló con mercancía ya entregada`
            : `${n} facturas anuladas con mercancía ya entregada`,
        detail:
          n === 1
            ? `${one.customer} · ${cop(one.deliveredCOP)} entregados`
            : `${listLabel(voidedDelivered.map((r) => r.invoiceNumber ?? r.orderId))} · ${cop(voidedDelivered.reduce((s, r) => s + r.deliveredCOP, 0))} entregados`,
        cta: 'Ver conciliación',
        slug: '4-3',
      }
    },
    unbilled: () => {
      if (unbilled.length === 0) return null
      const n = unbilled.length
      return {
        key: 'unbilled',
        tone: 'warning',
        icon: ReceiptText,
        title: `${plural(n, 'pedido sin facturar', 'pedidos sin facturar')}`,
        detail:
          n === 1
            ? `${unbilled[0].id} · ${unbilled[0].customer}`
            : `${listLabel(unbilled.map((o) => o.id))} · no se pueden entregar sin factura`,
        cta: canInvoice ? 'Facturar' : 'Ver pedidos',
        slug: '4-1',
      }
    },
    overdue: () => {
      if (overdue.length === 0) return null
      const n = overdue.length
      const pending = overdue.reduce((s, r) => s + r.pendingCOP, 0)
      return {
        key: 'overdue',
        tone: 'warning',
        icon: CalendarClock,
        title: `${plural(n, 'pedido facturado sin retirar', 'pedidos facturados sin retirar')} hace más de ${PICKUP_OVERDUE_DAYS} días`,
        detail: `${listLabel(overdue.map((r) => r.invoiceNumber ?? r.orderId))} · ${cop(pending)} pendientes por entregar`,
        cta: 'Ver pedidos',
        slug: '4-1',
      }
    },
    ready: () => {
      if (readyToDeliver.length === 0) return null
      const n = readyToDeliver.length
      return {
        key: 'ready',
        tone: 'info',
        icon: PackageCheck,
        title: `${plural(n, 'pedido facturado listo para entregar', 'pedidos facturados listos para entregar')}`,
        detail: `${listLabel(readyToDeliver.map((o) => o.invoice?.number ?? o.id))} · valida con el número de factura`,
        cta: 'Entregar',
        slug: '4-2',
      }
    },
    dmg: () => {
      if (pendingDamages.length === 0) return null
      const n = pendingDamages.length
      const total = pendingDamages.reduce((s, d) => s + d.valueCOP, 0)
      const high = pendingDamages.some(
        (d) => d.valueCOP > APPROVAL_THRESHOLD_COP
      )
      return {
        key: 'dmg',
        tone: high ? 'danger' : 'warning',
        icon: ShieldAlert,
        title:
          n === 1
            ? '1 baja por daño espera tu aprobación'
            : `${n} bajas por daño esperan tu aprobación`,
        detail: `${listLabel(pendingDamages.map((d) => d.id))} · ${cop(total)} a costo`,
        cta: 'Revisar',
        slug: '5-1',
      }
    },
    adj: () => {
      if (pendingAdjustments.length === 0) return null
      const n = pendingAdjustments.length
      const total = pendingAdjustments.reduce((s, a) => s + a.valueCOP, 0)
      return {
        key: 'adj',
        tone: 'warning',
        icon: Scale,
        title:
          n === 1
            ? '1 ajuste de conteo espera tu firma'
            : `${n} ajustes de conteo esperan tu firma`,
        detail: `${listLabel(pendingAdjustments.map((a) => a.id))} · ${cop(total)} a costo`,
        cta: 'Revisar',
        slug: '5-3',
      }
    },
    expiring: () => {
      if (expiring.length === 0) return null
      const n = expiring.length
      const first = expiring[0]
      const days = daysBetween(TODAY_STR, first.expiry!)
      return {
        key: 'expiring',
        tone: days <= 14 ? 'danger' : 'warning',
        icon: CalendarClock,
        title: `${plural(n, 'partida vence', 'partidas vencen')} en menos de ${EXPIRY_WARN_DAYS} días`,
        detail: `${skuName(first.sku)} vence en ${days} d${n > 1 ? ` y ${n - 1} más` : ''}`,
        cta: 'Ver vencimientos',
        slug: '6-2',
      }
    },
    claims: () => {
      if (openClaims.length === 0) return null
      const n = openClaims.length
      const total = openClaims.reduce((s, c) => s + c.valueCOP, 0)
      const prov = openClaims.filter((c) => c.type === 'Proveedor').length
      return {
        key: 'claims',
        tone: 'info',
        icon: FileWarning,
        title: `${plural(n, 'reclamo abierto', 'reclamos abiertos')}`,
        detail: `${cop(total)} en juego · ${prov} de proveedor, ${n - prov} de cliente`,
        cta: 'Gestionar',
        slug: '6-1',
      }
    },
    transfersIn: () => {
      if (transfersIn.length === 0) return null
      const n = transfersIn.length
      return {
        key: 'transfersIn',
        tone: 'info',
        icon: Truck,
        title: `${plural(n, 'traspaso en camino por recibir', 'traspasos en camino por recibir')}`,
        detail: `${listLabel(transfersIn.map((t) => t.id))} · llegan a ${listLabel(
          [...new Set(transfersIn.map((t) => whName(t.destWarehouse)))]
        )}`,
        cta: 'Recibir',
        slug: '2-3',
      }
    },
    transfersApprove: () => {
      if (transfersToApprove.length === 0) return null
      const n = transfersToApprove.length
      return {
        key: 'transfersApprove',
        tone: 'info',
        icon: Truck,
        title: `${plural(n, 'traspaso por aprobar', 'traspasos por aprobar')}`,
        detail: `${listLabel(transfersToApprove.map((t) => t.id))} · salen de ${listLabel(
          [...new Set(transfersToApprove.map((t) => whName(t.originWarehouse)))]
        )}`,
        cta: 'Revisar',
        slug: '2-3',
      }
    },
    counts: () => {
      if (pendingCounts.length === 0) return null
      const n = pendingCounts.length
      return {
        key: 'counts',
        tone: 'info',
        icon: ClipboardCheck,
        title: `${plural(n, 'conteo programado', 'conteos programados')}`,
        detail: `${listLabel(pendingCounts.map((c) => c.id))} · cuenta a ciegas lo que hay en la partida`,
        cta: 'Contar',
        slug: '5-2',
      }
    },
  }

  const actions = ACTION_ORDER[role]
    .map((k) => builders[k]?.() ?? null)
    .filter((a): a is ActionItem => a !== null && canGo(a.slug))
  const visibleActions = showAll
    ? actions
    : actions.slice(0, MAX_VISIBLE_ACTIONS)
  const hasDanger = actions.some((a) => a.tone === 'danger')

  /* ------------------------------ Atajos y gráfico ------------------------------ */

  const shortcuts = isReadOnly
    ? []
    : SHORTCUTS[role].filter((s) => canGo(s.slug))

  const segment = (state: StockState, units: number, slug: string) => ({
    state,
    units,
    onSelect: canGo(slug) ? () => onNavigate(slug) : undefined,
  })
  const segments = [
    segment('disponible', enExistencia.units, '2-1'),
    segment('reservado', porEntregar.units, '4-1'),
    segment('transito', enExistencia.inTransitUnits, '2-3'),
    segment('reclamo', porReclamar.units, '6-1'),
    segment('danado', danada.units, '5-1'),
  ]

  const topProducts = products.slice(0, 4)

  return (
    <div className='space-y-3'>
      <PageHeader
        title={`Hola, ${firstName}`}
        subtitle={`${scopeLabel} · ${todayLabel}`}
        actions={
          <>
            {canSales && (
              <FilterTabs
                value={period}
                onChange={setPeriod}
                options={PERIODS.map((p) => ({ id: p.id, label: p.label }))}
              />
            )}
            {shortcuts.map((s, i) => {
              const Icon = s.icon
              return (
                <Button
                  key={s.label}
                  type='button'
                  variant={i === 0 ? 'default' : 'outline'}
                  className='h-10 shadow-none'
                  onClick={() => onNavigate(s.slug)}
                >
                  <Icon className='size-4' />
                  {s.label}
                </Button>
              )
            })}
          </>
        }
      />

      <div
        className={cn(
          'grid grid-cols-1 gap-3 min-[500px]:grid-cols-2',
          tiles.length === 5
            ? 'lg:grid-cols-3 xl:grid-cols-5'
            : 'xl:grid-cols-4'
        )}
      >
        {tiles.map((t) => (
          <KpiTile key={t.label} {...t} />
        ))}
      </div>

      <div className='grid grid-cols-1 items-start gap-3 xl:grid-cols-12'>
        <div className='space-y-3 xl:col-span-8'>
          {canSales && (
            <Section
              compact
              title='Ventas por día'
              hint={`Facturado ${copCompact(sales.invoicedCOP)} · Entregado ${copCompact(sales.deliveredCOP)} en ${days} días`}
            >
              <SalesTrendChart days={sales.days} />
            </Section>
          )}

          <Section
            flush
            compact
            title='Requiere acción hoy'
            action={
              actions.length > 0 ? (
                <StatusPill tone={hasDanger ? 'danger' : 'warning'}>
                  {plural(actions.length, 'pendiente', 'pendientes')}
                </StatusPill>
              ) : undefined
            }
          >
            {actions.length === 0 ? (
              <div className='flex flex-col items-center gap-2 px-4 py-8 text-center'>
                <div
                  className={cn(
                    'flex size-10 items-center justify-center rounded-full',
                    TONE.success.soft
                  )}
                >
                  <CheckCircle2 className='size-5' />
                </div>
                <div className='text-sm font-medium'>Todo al día</div>
                <p className='max-w-sm text-sm text-muted-foreground'>
                  No tienes nada pendiente por ahora. Cuando haya algo que
                  resolver, aparecerá aquí.
                </p>
              </div>
            ) : (
              <>
                <ul className='divide-y'>
                  {visibleActions.map((a) => (
                    <ActionRow
                      key={a.key}
                      item={a}
                      onGo={() => onNavigate(a.slug)}
                    />
                  ))}
                </ul>
                {actions.length > MAX_VISIBLE_ACTIONS && (
                  <button
                    type='button'
                    onClick={() => setShowAll((v) => !v)}
                    className='flex h-10 w-full items-center justify-center border-t text-sm font-medium text-primary transition-colors hover:bg-accent/60'
                  >
                    {showAll ? 'Ver menos' : `Ver todo (${actions.length})`}
                  </button>
                )}
              </>
            )}
          </Section>
        </div>

        <div className='space-y-3 xl:col-span-4'>
          {canGo('2-1') && (
            <Section compact title='Estado del inventario'>
              <DonutStockChart
                segments={segments}
                centerValue={nf(enExistencia.totalPhysicalUnits)}
                centerLabel='unidades'
              />
            </Section>
          )}

          {canSales && (
            <Section
              compact
              title='Ventas por categoría'
              hint={`Últimos ${days} días`}
            >
              {categories.length === 0 ? (
                <EmptyState text='No hay facturas emitidas en este período.' />
              ) : (
                <CategorySalesChart rows={categories} />
              )}
            </Section>
          )}

          {canSales && topProducts.length > 0 && (
            <Section compact flush title='Más vendidos'>
              <ul className='divide-y'>
                {topProducts.map((p) => (
                  <TopProductRow
                    key={p.sku}
                    name={p.name}
                    category={p.category}
                    units={`${nf(p.units)} ${p.units === 1 ? p.unitMeasure.toLowerCase() : 'uds.'}`}
                    revenue={copCompact(p.revenueCOP)}
                    onSelect={
                      canGo('2-4') ? () => onNavigate('2-4') : undefined
                    }
                  />
                ))}
              </ul>
            </Section>
          )}
        </div>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Piezas locales                                                             */
/* -------------------------------------------------------------------------- */

/** Una fila accionable: ícono, qué pasa, detalle de una línea y verbo. */
function ActionRow({ item, onGo }: { item: ActionItem; onGo: () => void }) {
  const Icon = item.icon
  return (
    <li>
      <button
        type='button'
        onClick={onGo}
        className='flex w-full items-start gap-3 px-3.5 py-2.5 text-start transition-colors hover:bg-accent/60 sm:items-center sm:px-4'
      >
        <span
          className={cn(
            'flex size-8 shrink-0 items-center justify-center rounded-lg',
            TONE[item.tone].soft
          )}
        >
          <Icon className='size-4' aria-hidden />
        </span>
        <span className='min-w-0 flex-1'>
          <span className='block text-sm font-medium'>{item.title}</span>
          <span className='line-clamp-1 text-sm text-muted-foreground'>
            {item.detail}
          </span>
          <span className='mt-1.5 inline-flex items-center gap-0.5 text-sm font-medium text-primary sm:hidden'>
            {item.cta}
            <ChevronRight className='size-4' aria-hidden />
          </span>
        </span>
        <span className='hidden shrink-0 items-center gap-0.5 text-sm font-medium text-primary sm:inline-flex'>
          {item.cta}
          <ChevronRight className='size-4' aria-hidden />
        </span>
      </button>
    </li>
  )
}

/** Fila de «Más vendidos»: miniatura de la categoría, nombre, unidades y valor facturado. */
function TopProductRow({
  name,
  category,
  units,
  revenue,
  onSelect,
}: {
  name: string
  category: string
  units: string
  revenue: string
  onSelect?: () => void
}) {
  const content = (
    <>
      <CategoryAvatar category={category} size='sm' />
      <span className='min-w-0 flex-1'>
        <span className='block truncate text-sm font-medium' title={name}>
          {name}
        </span>
        <span className='block text-sm text-muted-foreground'>{units}</span>
      </span>
      <span className='shrink-0 text-sm font-semibold tabular-nums'>
        {revenue}
      </span>
    </>
  )
  const cls = 'flex w-full items-center gap-3 px-3.5 py-2.5 text-start sm:px-4'
  return (
    <li>
      {onSelect ? (
        <button
          type='button'
          onClick={onSelect}
          className={cn(cls, 'transition-colors hover:bg-accent/60')}
        >
          {content}
        </button>
      ) : (
        <div className={cls}>{content}</div>
      )}
    </li>
  )
}
