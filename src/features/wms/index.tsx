import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  Building2,
  Factory,
  Lock,
  Palette,
  Plus,
  Printer,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
  Users,
  Warehouse,
} from 'lucide-react'
import { toast } from 'sonner'
import { fonts } from '@/config/fonts'
import { useFont } from '@/context/font-provider'
import { useTheme } from '@/context/theme-provider'
import { useWms } from '@/context/wms-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import {
  TOPOLOGY_SCENARIOS,
  WMS_PUTAWAY_RULES,
  WMS_ROLES,
  WMS_STOCK_ITEMS,
  computeSkuMetrics,
  findScreenBySlug,
  type RoleCode,
  type TopologyScenario,
  type WmsLocation,
  type WmsTransfer,
  type WmsWarehouse,
} from './data/wms-data'

// Helper SVG: Donut / Anillo limpio
function SvgDonut({
  pct,
  color,
  size = 72,
  stroke = 8,
}: {
  pct: number
  color: string
  size?: number
  stroke?: number
}) {
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const clamped = Math.max(0, Math.min(100, pct))
  const offset = circumference - (clamped / 100) * circumference
  const center = size / 2

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className='shrink-0'>
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill='none'
        stroke='currentColor'
        className='text-muted/60'
        strokeWidth={stroke}
      />
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill='none'
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap='round'
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${center} ${center})`}
      />
      <text
        x='50%'
        y='52%'
        dominantBaseline='middle'
        textAnchor='middle'
        className='fill-foreground text-xs font-semibold tabular-nums'
      >
        {clamped}%
      </text>
    </svg>
  )
}

// Helper SVG: Sparkline limpia
function SvgSparkline({ points, color = '#2952cc' }: { points: number[]; color?: string }) {
  const width = 108
  const height = 32
  const min = Math.min(...points)
  const max = Math.max(...points)
  const range = max - min || 1
  const coords = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * (width - 8) + 4
      const y = height - 6 - ((p - min) / range) * (height - 12)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
  const lastPair = coords.split(' ').pop()?.split(',') ?? ['0', '0']

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className='shrink-0'>
      <polyline
        fill='none'
        stroke={color}
        strokeWidth='2'
        strokeLinecap='round'
        strokeLinejoin='round'
        points={coords}
      />
      <circle cx={lastPair[0]} cy={lastPair[1]} r='3' fill={color} />
    </svg>
  )
}

export function WmsWorkspace({ screenSlug = '1-1' }: { screenSlug?: string }) {
  const navigate = useNavigate()
  const { font, setFont } = useFont()
  const { theme, setTheme } = useTheme()
  const {
    role,
    setRole,
    scenario,
    setScenario,
    topology,
    almacenes,
    warehouses,
    warehouse,
    setWarehouse,
    activeWarehouseIds,
    matchesScope,
    showRestricted,
    setShowRestricted,
    isReadOnly,
    hasAccess,
    alerts,
    locations,
    replenishments,
    transfers,
    cycleAlertStatus,
    updateOperationalParams,
    addLocation,
    triggerReplenishmentWave,
    advanceTransfer,
    createTransfer,
  } = useWms()

  const { mod, scr } = findScreenBySlug(screenSlug)
  const allowed = hasAccess(scr)

  // Filtros locales de vistas
  const [alertSeverity, setAlertSeverity] = useState<string>('ALL')
  const [alertStatus, setAlertStatus] = useState<string>('ALL')
  const [agingFilter, setAgingFilter] = useState<string>('ALL')
  const [zoneFilter, setZoneFilter] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState<string>('')

  // Modales
  const [whModalOpen, setWhModalOpen] = useState(false)
  const [editingWh, setEditingWh] = useState<WmsWarehouse | null>(null)
  const [locModalOpen, setLocModalOpen] = useState(false)
  const [binLabelLoc, setBinLabelLoc] = useState<WmsLocation | null>(null)
  const [putawaySimOpen, setPutawaySimOpen] = useState(false)
  const [newTransferOpen, setNewTransferOpen] = useState(false)
  const [guideTransfer, setGuideTransfer] = useState<WmsTransfer | null>(null)

  const goToSlug = (slug: string) => {
    navigate({ to: '/wms/$code', params: { code: slug } })
  }

  return (
    <>
      {/* ===== Barra Superior Limpia (Estilo Nativo Shadcn-Admin) ===== */}
      <Header fixed className='border-b bg-background'>
        <Search />

        <div className='ms-auto flex items-center gap-2'>
          <div className='flex items-center gap-1.5 rounded-md border bg-background px-2.5 py-1 text-xs'>
            <Building2 className='size-3.5 text-muted-foreground' />
            <select
              value={warehouse}
              onChange={(e) => setWarehouse(e.target.value)}
              className='bg-transparent font-medium text-foreground focus:outline-none'
              aria-label='Seleccionar almacén o bodega'
            >
              <option value='ALL'>Todas las bodegas</option>
              {almacenes.map((alm) => (
                <optgroup key={alm.id} label={`Almacén: ${alm.name}`}>
                  {almacenes.length > 1 && (
                    <option value={`ALM:${alm.id}`}>
                      Todo {alm.name}
                    </option>
                  )}
                  {warehouses
                    .filter((w) => w.almacenId === alm.id)
                    .map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.isDefaultTied ? 'Por defecto' : 'Adicional'})
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          </div>
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      {/* ===== Contenido Principal ===== */}
      <Main className='space-y-5'>
        {!allowed && mod.id !== 11 ? (
          <div className='rounded-lg border bg-card p-8 text-center space-y-3'>
            <div className='mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 text-destructive'>
              <Lock className='h-5 w-5' />
            </div>
            <h2 className='text-base font-semibold'>
              Acceso restringido a «{scr.name}» para el perfil [{role}]
            </h2>
            <p className='text-xs text-muted-foreground max-w-md mx-auto'>
              Esta funcionalidad está habilitada para los perfiles:{' '}
              <strong className='text-foreground'>{scr.roles.join(', ')}</strong>.
            </p>
            <div className='flex justify-center gap-2 pt-2'>
              <Button size='sm' variant='outline' onClick={() => goToSlug('11-2')}>
                Ir a Configuración de Rol y Bodega
              </Button>
              <Button size='sm' onClick={() => setRole(scr.roles[0])}>
                Cambiar a perfil [{scr.roles[0]}]
              </Button>
            </div>
          </div>
        ) : (
          <>
            {scr.slug === '1-1' && renderView1_1()}
            {scr.slug === '1-2' && renderView1_2()}
            {scr.slug === '1-3' && renderView1_3()}
            {scr.slug === '2-1' && renderView2_1()}
            {scr.slug === '2-2' && renderView2_2()}
            {scr.slug === '2-3' && renderView2_3()}
            {scr.slug === '2-4' && renderView2_4()}
            {scr.slug === '2-5' && renderView2_5()}
            {mod.id === 11 && renderSettingsWithSideNav()}
            {!scr.implemented && mod.id !== 11 && renderUpcomingView()}
          </>
        )}
      </Main>

      {/* ===== Modales Interactivos ===== */}
      {renderModals()}
    </>
  )

  // --------------------------------------------------------------------------
  // 1.1 VISIÓN GENERAL DE OPERACIONES
  // --------------------------------------------------------------------------
  function renderView1_1() {
    const whList = warehouses.filter((w) => matchesScope(w.id))
    const flow = { pendientes: 0, picking: 0, packing: 0, listos: 0, despachados: 0 }
    let totalBins = 0,
      occupiedBins = 0,
      wOtif = 0,
      wCycle = 0,
      wVol = 0

    whList.forEach((w) => {
      flow.pendientes += w.ordersToday.pendientes
      flow.picking += w.ordersToday.picking
      flow.packing += w.ordersToday.packing
      flow.listos += w.ordersToday.listos
      flow.despachados += w.ordersToday.despachados
      totalBins += w.totalBins
      occupiedBins += w.occupiedBins
      wOtif += w.otif
      wCycle += w.cycleHours
      wVol += w.volumePct
    })

    const count = whList.length || 1
    const totalOrders =
      flow.pendientes + flow.picking + flow.packing + flow.listos + flow.despachados || 1
    const binPct = Math.round((occupiedBins / (totalBins || 1)) * 100)
    const avgOtif = Number((wOtif / count).toFixed(1))
    const avgCycle = (wCycle / count).toFixed(1)
    const avgVol = Math.round(wVol / count)

    let cFisico = 0,
      cDisp = 0,
      cComp = 0,
      cBrecha = 0,
      cRezagado = 0,
      cMerma = 0
    WMS_STOCK_ITEMS.forEach((it) => {
      const m = computeSkuMetrics(it, activeWarehouseIds)
      cFisico += m.stockFisicoTotal
      cDisp += m.disponibleOnHand
      cComp += m.reservado
      cBrecha += m.necesidadCompra
      cMerma += m.merma + m.bloqueado + m.cuarentena
      if (it.agingTag !== 'Normal') cRezagado += m.disponibleOnHand + m.reservado
    })

    const dispPct = Math.round((cDisp / (cFisico || 1)) * 100)
    const compPct = Math.round((cComp / (cFisico || 1)) * 100)
    const otrosPct = Math.max(0, 100 - dispPct - compPct)

    const stages = [
      { label: 'Pendientes', val: flow.pendientes, color: '#64748b' },
      { label: 'En Picking (Grúa/Cajas)', val: flow.picking, color: '#2952cc' },
      { label: 'En Zunchado / Packing', val: flow.packing, color: '#4d73e0' },
      { label: 'Listos en Andén', val: flow.listos, color: '#d97706' },
      { label: 'Despachados Hoy', val: flow.despachados, color: '#0d9488' },
    ]

    return (
      <div className='space-y-5'>
        <div className='flex flex-wrap items-center justify-between gap-2'>
          <div className='flex items-center gap-2.5'>
            <h1 className='text-xl font-semibold tracking-tight'>
              Visión general de operaciones
            </h1>
            <span className='inline-flex items-center gap-1.5 rounded-full bg-teal-500/10 px-2.5 py-0.5 text-xs font-medium text-teal-600'>
              <span className='h-1.5 w-1.5 rounded-full bg-teal-500' />
              En vivo
            </span>
          </div>
          <div className='flex items-center gap-2'>
            <Button
              variant='outline'
              size='sm'
              onClick={() => toast.success('Sincronizado con bus de eventos WMS')}
            >
              <RefreshCw className='mr-1.5 h-3.5 w-3.5' />
              Refrescar
            </Button>
            <Button size='sm' onClick={() => goToSlug('1-3')}>
              {alerts.filter((a) => matchesScope(a.warehouse) && a.status !== 'Cerrada').length}{' '}
              alertas activas →
            </Button>
          </div>
        </div>

        {/* Embudo Horizontal de Pedidos del Día */}
        <div className='rounded-lg border bg-card p-5'>
          <div className='mb-3 flex items-center justify-between'>
            <span className='text-sm font-semibold'>
              Flujo de pedidos del día
            </span>
            <span className='text-sm font-semibold tabular-nums'>
              {totalOrders.toLocaleString()}{' '}
              <span className='font-normal text-muted-foreground'>pedidos</span>
            </span>
          </div>

          <div className='flex h-3 w-full gap-0.5 overflow-hidden rounded-full bg-muted'>
            {stages.map((s) => {
              const wPct = Math.max(3, Math.round((s.val / totalOrders) * 100))
              return (
                <div
                  key={s.label}
                  style={{ width: `${wPct}%`, backgroundColor: s.color }}
                  title={`${s.label}: ${s.val}`}
                />
              )
            })}
          </div>

          <div className='mt-4 grid grid-cols-2 gap-4 border-t pt-4 sm:grid-cols-5'>
            {stages.map((s) => {
              const pct = Math.round((s.val / totalOrders) * 100)
              return (
                <div key={s.label}>
                  <div className='flex items-center gap-1.5 text-xs text-muted-foreground'>
                    <span
                      className='h-2 w-2 rounded-full'
                      style={{ backgroundColor: s.color }}
                    />
                    <span className='truncate'>{s.label}</span>
                  </div>
                  <div className='mt-1 flex items-baseline gap-2 tabular-nums'>
                    <span className='text-xl font-semibold'>{s.val}</span>
                    <span className='text-xs text-muted-foreground'>{pct}%</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Dos bloques gráficos: Cumplimiento + 4 Cubos de Stock */}
        <div className='grid grid-cols-1 gap-5 lg:grid-cols-12'>
          <div className='flex flex-col justify-between rounded-lg border bg-card p-5 lg:col-span-5'>
            <span className='text-sm font-semibold'>Cumplimiento y capacidad de racks</span>
            <div className='my-4 grid grid-cols-2 gap-4'>
              <div className='flex items-center gap-3'>
                <SvgDonut pct={avgOtif} color={avgOtif >= 96 ? '#0d9488' : '#d97706'} />
                <div>
                  <div className='text-xs font-medium text-muted-foreground'>
                    OTIF Entregas
                  </div>
                  <div className='text-xs text-muted-foreground'>Meta ≥ 96.0%</div>
                  <div className='mt-1 text-xs font-semibold'>
                    Ciclo: {avgCycle} h
                  </div>
                </div>
              </div>
              <div className='flex items-center gap-3'>
                <SvgDonut pct={binPct} color={binPct >= 88 ? '#e11d48' : '#2952cc'} />
                <div>
                  <div className='text-xs font-medium text-muted-foreground'>
                    Racks / Bins
                  </div>
                  <div className='text-xs text-muted-foreground'>
                    {occupiedBins}/{totalBins}
                  </div>
                  <div className='mt-1 text-xs font-semibold'>
                    Volumen: {avgVol}%
                  </div>
                </div>
              </div>
            </div>
            <div className='flex items-center justify-between border-t pt-3 text-xs'>
              <span className='text-muted-foreground'>Productividad y roturas</span>
              <button
                onClick={() => goToSlug('1-2')}
                className='font-medium text-primary hover:underline'
              >
                Ver KPIs (1.2) →
              </button>
            </div>
          </div>

          <div className='flex flex-col justify-between rounded-lg border bg-card p-5 lg:col-span-7'>
            <div className='flex items-center justify-between'>
              <span className='text-sm font-semibold'>
                Los 4 Cubos de Inventario (Cajas y Sacos)
              </span>
              <button
                onClick={() => goToSlug('2-1')}
                className='text-xs font-medium text-primary hover:underline'
              >
                Consolidado SKU (2.1) →
              </button>
            </div>

            <div className='my-4 grid grid-cols-1 gap-x-6 gap-y-3.5 sm:grid-cols-2'>
              <div>
                <div className='mb-1 flex justify-between text-xs'>
                  <span className='text-muted-foreground'>1. Existencias Físicas</span>
                  <span className='font-semibold'>
                    {cFisico.toLocaleString()} uds
                  </span>
                </div>
                <div className='flex h-2 overflow-hidden rounded-full bg-muted'>
                  <div style={{ width: `${dispPct}%`, backgroundColor: '#0d9488' }} />
                  <div style={{ width: `${compPct}%`, backgroundColor: '#2952cc' }} />
                  <div style={{ width: `${otrosPct}%`, backgroundColor: '#d97706' }} />
                </div>
              </div>

              <div>
                <div className='mb-1 flex justify-between text-xs'>
                  <span className='text-muted-foreground'>2. Comprometido Obra/Web</span>
                  <span className='font-semibold text-primary'>
                    {cComp.toLocaleString()} uds ({compPct}%)
                  </span>
                </div>
                <div className='h-2 overflow-hidden rounded-full bg-muted'>
                  <div
                    className='h-full rounded-full bg-primary'
                    style={{ width: `${compPct}%` }}
                  />
                </div>
              </div>

              <div>
                <div className='mb-1 flex justify-between text-xs'>
                  <span className='text-muted-foreground'>3. Brecha Abastecimiento</span>
                  <span className='font-semibold text-amber-600'>
                    {cBrecha.toLocaleString()} uds faltantes
                  </span>
                </div>
                <div className='h-2 overflow-hidden rounded-full bg-muted'>
                  <div
                    className='h-full rounded-full bg-amber-500'
                    style={{ width: `${Math.min(100, Math.round((cBrecha / 300) * 100))}%` }}
                  />
                </div>
              </div>

              <div>
                <div className='mb-1 flex justify-between text-xs'>
                  <span className='text-muted-foreground'>4. Saldos de Tono (AIP)</span>
                  <span className='font-semibold'>
                    {cRezagado.toLocaleString()} uds{' '}
                    <span className='text-rose-600'>({cMerma} bloq/rotura)</span>
                  </span>
                </div>
                <div className='h-2 overflow-hidden rounded-full bg-muted'>
                  <div
                    className='h-full rounded-full bg-slate-500'
                    style={{
                      width: `${Math.round((cRezagado / (cFisico || 1)) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            <details className='border-t pt-2.5 text-xs'>
              <summary className='cursor-pointer font-medium text-muted-foreground hover:text-foreground'>
                ▸ Ver fórmulas oficiales sin doble conteo (Sección 1.3 y 1.4)
              </summary>
              <div className='mt-2 grid grid-cols-1 gap-2 text-[11px] text-muted-foreground sm:grid-cols-2'>
                <div>
                  • <strong>Stock Físico Total:</strong> Disp. + Reservado + Cuarentena +
                  Bloqueado + Merma + Tránsito Inter-bodega.
                </div>
                <div>
                  • <strong>Rezagado (AIP):</strong> Etiqueta de antigüedad (30/60/90+d)
                  independiente del estado físico.
                </div>
              </div>
            </details>
          </div>
        </div>

        {/* Barras comparativas por Bodega */}
        <div className='rounded-lg border bg-card p-5'>
          <div className='mb-4 flex items-center justify-between'>
            <span className='text-sm font-semibold'>
              Ocupación de racks y nivel de servicio por bodega
            </span>
            <button
              onClick={() => goToSlug('2-3')}
              className='text-xs font-medium text-primary hover:underline'
            >
              Explorar ubicaciones →
            </button>
          </div>

          <div className='divide-y'>
            {whList.map((w) => {
              const bPct = Math.round((w.occupiedBins / w.totalBins) * 100)
              const barColor =
                bPct >= 88 ? '#e11d48' : bPct >= 75 ? '#d97706' : '#2952cc'
              return (
                <div
                  key={w.id}
                  className='grid grid-cols-1 items-center gap-4 py-3 first:pt-0 last:pb-0 md:grid-cols-12'
                >
                  <div className='flex items-center gap-2 md:col-span-4'>
                    <span className='rounded bg-muted px-2 py-0.5 text-xs font-medium'>
                      {w.id}
                    </span>
                    <div className='min-w-0'>
                      <span className='block truncate text-sm font-medium'>{w.name}</span>
                      <span className='block truncate text-[11px] text-muted-foreground'>
                        {w.almacenName} · {w.isDefaultTied ? 'Bodega por defecto' : 'Bodega adicional'}
                      </span>
                    </div>
                  </div>
                  <div className='md:col-span-4'>
                    <div className='mb-1 flex justify-between text-xs'>
                      <span className='text-muted-foreground'>
                        Ubicaciones ({w.occupiedBins}/{w.totalBins})
                      </span>
                      <span className='font-semibold'>{bPct}%</span>
                    </div>
                    <div className='h-2 overflow-hidden rounded-full bg-muted'>
                      <div
                        className='h-full rounded-full'
                        style={{ width: `${bPct}%`, backgroundColor: barColor }}
                      />
                    </div>
                  </div>
                  <div className='md:col-span-2'>
                    <div className='mb-1 flex justify-between text-xs'>
                      <span className='text-muted-foreground'>Volumen</span>
                      <span className='font-medium'>{w.volumePct}%</span>
                    </div>
                    <div className='h-2 overflow-hidden rounded-full bg-muted'>
                      <div
                        className='h-full rounded-full bg-slate-500'
                        style={{ width: `${w.volumePct}%` }}
                      />
                    </div>
                  </div>
                  <div className='flex items-center gap-2 md:col-span-2 md:justify-end'>
                    <span
                      className={`h-2 w-2 rounded-full ${w.otif >= 96 ? 'bg-teal-600' : 'bg-amber-500'}`}
                    />
                    <span className='text-xs font-semibold'>
                      OTIF {w.otif}%
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // --------------------------------------------------------------------------
  // 1.2 KPIs OPERATIVOS
  // --------------------------------------------------------------------------
  function renderView1_2() {
    const whList = warehouses.filter((w) => matchesScope(w.id))
    const count = whList.length || 1
    const avgAccuracy = (whList.reduce((s, w) => s + w.accuracyPct, 0) / count).toFixed(1)
    const avgDockToStock = (
      whList.reduce((s, w) => s + w.dockToStockHours, 0) / count
    ).toFixed(1)
    const avgOtif = (whList.reduce((s, w) => s + w.otif, 0) / count).toFixed(1)
    const avgShrink = (
      whList.reduce((s, w) => s + w.shrinkageStockPct, 0) / count
    ).toFixed(2)
    const avgReturn = (whList.reduce((s, w) => s + w.returnRatePct, 0) / count).toFixed(1)
    const avgDays = Math.round(whList.reduce((s, w) => s + w.turnoverDays, 0) / count)

    const kpis = [
      {
        label: 'Exactitud Inventario (Tono/Lote)',
        value: `${avgAccuracy}%`,
        target: 'Meta ≥ 99.0%',
        color: '#0d9488',
        trend: [98.7, 98.9, 99.1, 99.2, 99.3, Number(avgAccuracy)],
      },
      {
        label: 'Tiempo Dock-to-Stock (Descarga)',
        value: `${avgDockToStock} h`,
        target: 'Meta ≤ 2.5 h',
        color: '#2952cc',
        trend: [2.7, 2.5, 2.3, 2.1, 2.0, Number(avgDockToStock)],
      },
      {
        label: 'Cumplimiento de Entregas (OTIF)',
        value: `${avgOtif}%`,
        target: 'Meta ≥ 96.0%',
        color: '#0d9488',
        trend: [95.2, 95.8, 96.1, 96.5, 96.8, Number(avgOtif)],
      },
      {
        label: 'Merma por Rotura s/Stock',
        value: `${avgShrink}%`,
        target: 'Umbral < 0.50%',
        color: Number(avgShrink) > 0.5 ? '#e11d48' : '#0d9488',
        trend: [0.46, 0.42, 0.39, 0.37, 0.35, Number(avgShrink)],
      },
      {
        label: 'Tasa Devoluciones Sobrantes',
        value: `${avgReturn}%`,
        target: 'RMA s/despachos',
        color: '#d97706',
        trend: [2.8, 2.6, 2.4, 2.2, 2.1, Number(avgReturn)],
      },
      {
        label: 'Cobertura de Inventario',
        value: `${avgDays} días`,
        target: `${(365 / (avgDays || 1)).toFixed(1)}x rotación anual`,
        color: '#2952cc',
        trend: [27, 25, 24, 23, 22, avgDays],
      },
    ]

    return (
      <div className='space-y-5'>
        <div className='flex items-center justify-between'>
          <h1 className='text-xl font-semibold tracking-tight'>KPIs operativos</h1>
          <Button
            variant='outline'
            size='sm'
            onClick={() => toast.success('KPIs exportados a Excel')}
          >
            Exportar KPIs
          </Button>
        </div>

        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
          {kpis.map((k) => (
            <div
              key={k.label}
              className='flex items-center justify-between rounded-lg border bg-card p-4'
            >
              <div>
                <div className='text-xs text-muted-foreground'>{k.label}</div>
                <div className='mt-1 text-2xl font-semibold tabular-nums'>
                  {k.value}
                </div>
                <div className='mt-0.5 text-xs text-muted-foreground'>{k.target}</div>
              </div>
              <SvgSparkline points={k.trend} color={k.color} />
            </div>
          ))}
        </div>

        <div className='rounded-lg border bg-card p-5'>
          <div className='mb-4 flex items-center justify-between'>
            <span className='text-sm font-semibold'>
              Comparativa Dock-to-Stock y Exactitud por Bodega
            </span>
            <span className='text-xs text-muted-foreground'>Tiempo de ingreso a rack</span>
          </div>
          <div className='divide-y'>
            {whList.map((w) => {
              const dtsPct = Math.min(100, Math.round((w.dockToStockHours / 3.5) * 100))
              return (
                <div key={w.id} className='space-y-2 py-3 first:pt-0 last:pb-0'>
                  <div className='flex items-center justify-between text-xs'>
                    <span className='font-medium'>
                      <span className='mr-1.5 text-muted-foreground'>
                        {w.id}
                      </span>
                      {w.name}
                      <span className='ml-2 text-muted-foreground'>
                        ({w.almacenName})
                      </span>
                    </span>
                    <span className='font-semibold text-teal-600'>
                      {w.accuracyPct}% exactitud
                    </span>
                  </div>
                  <div className='flex items-center gap-3'>
                    <span className='w-32 shrink-0 text-xs text-muted-foreground'>
                      Dock-to-Stock: <strong>{w.dockToStockHours}h</strong>
                    </span>
                    <div className='h-2 flex-1 overflow-hidden rounded-full bg-muted'>
                      <div
                        className={`h-full rounded-full ${w.dockToStockHours <= 2.2 ? 'bg-teal-600' : 'bg-amber-500'}`}
                        style={{ width: `${dtsPct}%` }}
                      />
                    </div>
                    <span className='w-20 text-right text-xs text-muted-foreground'>
                      Merma {w.shrinkageStockPct}%
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // --------------------------------------------------------------------------
  // 1.3 ALERTAS Y EXCEPCIONES
  // --------------------------------------------------------------------------
  function renderView1_3() {
    const scopedAlerts = alerts.filter((a) => matchesScope(a.warehouse))
    const filtered = scopedAlerts.filter((a) => {
      if (alertSeverity !== 'ALL' && a.severity !== alertSeverity) return false
      if (alertStatus !== 'ALL' && a.status !== alertStatus) return false
      return true
    })

    const critCount = scopedAlerts.filter((a) => a.severity === 'Crítica').length
    const highCount = scopedAlerts.filter((a) => a.severity === 'Alta').length
    const medCount = scopedAlerts.filter((a) => a.severity === 'Media').length
    const total = scopedAlerts.length || 1

    return (
      <div className='space-y-5'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <h1 className='text-xl font-semibold tracking-tight'>Alertas y excepciones</h1>
          <div className='flex items-center gap-2'>
            <select
              value={alertSeverity}
              onChange={(e) => setAlertSeverity(e.target.value)}
              className='rounded-md border bg-card px-2.5 py-1.5 text-xs font-medium'
            >
              <option value='ALL'>Todas las severidades</option>
              <option value='Crítica'>Crítica ({critCount})</option>
              <option value='Alta'>Alta ({highCount})</option>
              <option value='Media'>Media ({medCount})</option>
            </select>
            <select
              value={alertStatus}
              onChange={(e) => setAlertStatus(e.target.value)}
              className='rounded-md border bg-card px-2.5 py-1.5 text-xs font-medium'
            >
              <option value='ALL'>Todos los estados</option>
              <option value='Abierta'>Abierta</option>
              <option value='En gestión'>En gestión</option>
              <option value='Cerrada'>Cerrada</option>
            </select>
          </div>
        </div>

        <div className='flex flex-col justify-between gap-4 rounded-lg border bg-card p-4 sm:flex-row sm:items-center'>
          <div className='flex items-center gap-6 text-xs'>
            <span className='flex items-center gap-2'>
              <i className='h-2.5 w-2.5 rounded-full bg-rose-600' />
              Críticas: <strong className='font-medium'>{critCount}</strong>
            </span>
            <span className='flex items-center gap-2'>
              <i className='h-2.5 w-2.5 rounded-full bg-amber-500' />
              Altas: <strong className='font-medium'>{highCount}</strong>
            </span>
            <span className='flex items-center gap-2'>
              <i className='h-2.5 w-2.5 rounded-full bg-primary' />
              Medias: <strong className='font-medium'>{medCount}</strong>
            </span>
          </div>
          <div className='flex h-2 gap-0.5 overflow-hidden rounded-full bg-muted sm:w-64'>
            <div
              style={{ width: `${(critCount / total) * 100}%` }}
              className='bg-rose-600'
            />
            <div
              style={{ width: `${(highCount / total) * 100}%` }}
              className='bg-amber-500'
            />
            <div
              style={{ width: `${(medCount / total) * 100}%` }}
              className='bg-primary'
            />
          </div>
        </div>

        <div className='divide-y rounded-lg border bg-card'>
          {filtered.map((a) => {
            const dot =
              a.severity === 'Crítica'
                ? 'bg-rose-600'
                : a.severity === 'Alta'
                  ? 'bg-amber-500'
                  : 'bg-primary'
            return (
              <div
                key={a.id}
                className='flex flex-col justify-between gap-3 p-4 transition hover:bg-muted/30 md:flex-row md:items-center'
              >
                <div className='min-w-0'>
                  <div className='flex items-center gap-2 text-xs text-muted-foreground'>
                    <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} />
                    <span className='font-medium'>{a.warehouse}</span>
                    <span>· {a.category}</span>
                    <span>· {a.timestamp}</span>
                  </div>
                  <div className='mt-1 text-sm font-medium'>{a.title}</div>
                  <details className='mt-1 text-xs'>
                    <summary className='cursor-pointer text-muted-foreground hover:text-foreground'>
                      ▸ Ver detalle y responsable ({a.owner})
                    </summary>
                    <p className='mt-1 text-muted-foreground'>{a.detail}</p>
                  </details>
                </div>

                <div className='flex shrink-0 items-center gap-2'>
                  <Badge variant='secondary'>{a.status}</Badge>
                  {!isReadOnly && (
                    <Button
                      size='sm'
                      variant='outline'
                      onClick={() => cycleAlertStatus(a.id)}
                    >
                      Estado
                    </Button>
                  )}
                  <Button size='sm' onClick={() => goToSlug(a.targetScreenSlug)}>
                    {a.targetScreenLabel} →
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // --------------------------------------------------------------------------
  // 2.1 CONSOLIDADO DE INVENTARIO
  // --------------------------------------------------------------------------
  function renderView2_1() {
    const items = WMS_STOCK_ITEMS.filter((item) => {
      if (agingFilter !== 'ALL' && item.agingTag !== agingFilter) return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        if (
          !item.sku.toLowerCase().includes(q) &&
          !item.name.toLowerCase().includes(q)
        )
          return false
      }
      return true
    })

    let totFisico = 0,
      totNormal = 0,
      totRezagado = 0
    WMS_STOCK_ITEMS.forEach((it) => {
      const m = computeSkuMetrics(it, activeWarehouseIds)
      totFisico += m.stockFisicoTotal
      if (it.agingTag === 'Normal') totNormal += m.stockFisicoTotal
      else totRezagado += m.stockFisicoTotal
    })
    const rezPct = Math.round((totRezagado / (totFisico || 1)) * 100)

    const rootTitle = topology.hasHeadquarters
      ? `Consolidado Casa Matriz · ${topology.headquartersName}`
      : `Consolidado ${almacenes[0]?.name ?? 'Almacén Principal'}`

    return (
      <div className='space-y-5'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <div>
            <h1 className='text-xl font-semibold tracking-tight'>
              {rootTitle}
            </h1>
            <p className='text-xs text-muted-foreground'>
              {topology.badge} · {almacenes.length} {almacenes.length === 1 ? 'Almacén' : 'Almacenes'} · {warehouses.length} {warehouses.length === 1 ? 'Bodega' : 'Bodegas'}
            </p>
          </div>
          <div className='flex items-center gap-2'>
            <Button
              variant='outline'
              size='sm'
              onClick={() => toast.success('Archivo CSV exportado')}
            >
              Exportar CSV
            </Button>
            <Button
              size='sm'
              onClick={() => toast.success('Reporte diario programado a las 07:30 hrs')}
            >
              Programar correo
            </Button>
          </div>
        </div>

        <div className='grid grid-cols-1 gap-5 lg:grid-cols-12'>
          <div className='rounded-lg border bg-card p-5 lg:col-span-8'>
            <div className='mb-4 flex flex-wrap items-center justify-between gap-2'>
              <span className='text-sm font-semibold'>
                Distribución de stock por Almacén y Bodega
              </span>
              <div className='flex items-center gap-3 text-xs text-muted-foreground'>
                <span className='flex items-center gap-1'>
                  <i className='h-2 w-2 rounded-full bg-teal-600' />
                  Disponible
                </span>
                <span className='flex items-center gap-1'>
                  <i className='h-2 w-2 rounded-full bg-primary' />
                  Reservado
                </span>
                <span className='flex items-center gap-1'>
                  <i className='h-2 w-2 rounded-full bg-amber-500' />
                  Cuarentena/Bloq/Tránsito
                </span>
              </div>
            </div>

            <div className='space-y-4'>
              {almacenes.map((alm) => {
                const almBodegas = warehouses.filter(
                  (w) => w.almacenId === alm.id && matchesScope(w.id)
                )
                if (almBodegas.length === 0) return null
                return (
                  <div key={alm.id} className='space-y-2.5 rounded-md border bg-muted/15 p-3'>
                    <div className='flex items-center justify-between border-b pb-1.5 text-xs'>
                      <span className='font-semibold text-foreground'>
                        {alm.name}{' '}
                        <span className='font-normal text-muted-foreground'>
                          ({alm.id} · {alm.city})
                        </span>
                      </span>
                      <span className='text-[11px] text-muted-foreground'>
                        {almBodegas.length} {almBodegas.length === 1 ? 'bodega activa' : 'bodegas activas'}
                      </span>
                    </div>
                    <div className='space-y-2.5'>
                      {almBodegas.map((w) => {
                        let wDisp = 0,
                          wRes = 0,
                          wOtr = 0,
                          wTot = 0
                        WMS_STOCK_ITEMS.forEach((it) => {
                          const m = computeSkuMetrics(it, w.id)
                          wDisp += m.disponibleOnHand
                          wRes += m.reservado
                          wOtr +=
                            m.cuarentena + m.bloqueado + m.merma + m.transito_interbodega
                          wTot += m.stockFisicoTotal
                        })
                        const dP = Math.round((wDisp / (wTot || 1)) * 100)
                        const rP = Math.round((wRes / (wTot || 1)) * 100)
                        const oP = Math.max(0, 100 - dP - rP)
                        return (
                          <div key={w.id}>
                            <div className='mb-1 flex justify-between text-xs'>
                              <span className='font-medium'>
                                <span className='mr-1.5 text-muted-foreground'>
                                  {w.id}
                                </span>
                                {w.name}
                                <span className='ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px] font-normal text-muted-foreground'>
                                  {w.isDefaultTied ? 'Atada por defecto' : 'Adicional'}
                                </span>
                              </span>
                              <span className='font-semibold'>
                                {wTot.toLocaleString()} uds{' '}
                                <span className='font-normal text-muted-foreground'>
                                  ({w.turnoverDays}d cobertura)
                                </span>
                              </span>
                            </div>
                            <div className='flex h-2.5 overflow-hidden rounded-full bg-muted'>
                              <div
                                style={{ width: `${dP}%`, backgroundColor: '#0d9488' }}
                              />
                              <div
                                style={{ width: `${rP}%`, backgroundColor: '#2952cc' }}
                              />
                              <div
                                style={{ width: `${oP}%`, backgroundColor: '#d97706' }}
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className='flex flex-col justify-between rounded-lg border bg-card p-5 lg:col-span-4'>
            <span className='text-sm font-semibold'>
              Colección activa vs Saldos de Tono (AIP)
            </span>
            <div className='my-4 flex items-center gap-4'>
              <SvgDonut pct={100 - rezPct} color='#0d9488' size={78} stroke={9} />
              <div className='space-y-1 text-xs'>
                <div className='text-muted-foreground'>
                  Rotación normal:{' '}
                  <strong className='text-foreground'>
                    {totNormal.toLocaleString()}
                  </strong>
                </div>
                <div className='text-muted-foreground'>
                  Saldos rezagados:{' '}
                  <strong className='text-amber-600'>
                    {totRezagado.toLocaleString()}
                  </strong>
                </div>
                <div className='pt-1 text-[11px] text-muted-foreground'>
                  Sin doble conteo en estados físicos
                </div>
              </div>
            </div>
            <div className='flex items-center justify-between border-t pt-3 text-xs'>
              <span className='text-muted-foreground'>Filtrar rotación:</span>
              <select
                value={agingFilter}
                onChange={(e) => setAgingFilter(e.target.value)}
                className='rounded border bg-background px-2 py-1 text-xs font-medium'
              >
                <option value='ALL'>Todos</option>
                <option value='Normal'>Normal</option>
                <option value='Rezagado 30d'>Rezagado 30d</option>
                <option value='Rezagado 60d'>Rezagado 60d</option>
                <option value='Rezagado 90+d'>Rezagado 90+d</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tabla Limpia de 5 Columnas con Desglose Progresivo */}
        <div className='overflow-hidden rounded-lg border bg-card'>
          <div className='flex flex-wrap items-center justify-between gap-3 border-b p-4'>
            <Input
              placeholder='Buscar SKU, porcelanato, cerámica o adhesivo...'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className='h-8 max-w-xs text-xs'
            />
            <span className='text-xs text-muted-foreground'>
              Haz clic en <strong>▸ Desglose 8 estados</strong> en cualquier producto
              para ver cuarentena, bloqueo y tránsito
            </span>
          </div>

          <div className='overflow-x-auto'>
            <table className='w-full border-collapse text-left text-sm'>
              <thead>
                <tr className='border-b bg-muted/40 text-xs text-muted-foreground'>
                  <th className='px-4 py-2.5 font-medium'>SKU / Producto</th>
                  <th className='w-64 px-4 py-2.5 font-medium'>
                    Composición (Disponible / Físico)
                  </th>
                  <th className='px-4 py-2.5 text-right font-medium'>
                    ATP (Prometible)
                  </th>
                  <th className='px-4 py-2.5 text-right font-medium'>
                    Brecha Compra
                  </th>
                  <th className='px-4 py-2.5 text-right font-medium'>Rotación</th>
                </tr>
              </thead>
              <tbody className='divide-y'>
                {items.map((item) => {
                  const m = computeSkuMetrics(item, activeWarehouseIds)
                  const dispRatio = Math.round(
                    (m.disponibleOnHand / (m.stockFisicoTotal || 1)) * 100
                  )
                  const resRatio = Math.round(
                    (m.reservado / (m.stockFisicoTotal || 1)) * 100
                  )
                  return (
                    <tr key={item.sku} className='hover:bg-muted/20'>
                      <td className='px-4 py-3'>
                        <div className='flex items-center gap-2'>
                          <span className='text-xs font-semibold'>
                            {item.sku}
                          </span>
                          <span className='text-xs text-muted-foreground'>
                            {item.category}
                          </span>
                        </div>
                        <div className='text-sm font-medium'>{item.name}</div>
                        <details className='mt-1'>
                          <summary className='cursor-pointer text-xs font-medium text-primary'>
                            ▸ Desglose 8 estados y OC
                          </summary>
                          <div className='mt-1.5 grid grid-cols-3 gap-2 border-t pt-1.5 text-[11px] text-muted-foreground sm:grid-cols-6'>
                            <div>
                              Disp: <strong>{m.disponibleOnHand}</strong>
                            </div>
                            <div>
                              Res: <strong>{m.reservado}</strong>
                            </div>
                            <div>
                              Cuar: <strong>{m.cuarentena}</strong>
                            </div>
                            <div>
                              Bloq: <strong>{m.bloqueado}</strong>
                            </div>
                            <div>
                              Merma: <strong>{m.merma}</strong>
                            </div>
                            <div>
                              Tráns: <strong>{m.transito_interbodega}</strong>
                            </div>
                          </div>
                        </details>
                      </td>
                      <td className='px-4 py-3'>
                        <div className='mb-1 flex justify-between text-xs'>
                          <span className='font-semibold text-teal-600'>
                            {m.disponibleOnHand.toLocaleString()} disp.
                          </span>
                          <span className='text-muted-foreground'>
                            / {m.stockFisicoTotal.toLocaleString()} fís.
                          </span>
                        </div>
                        <div className='flex h-2 overflow-hidden rounded-full bg-muted'>
                          <div
                            style={{ width: `${dispRatio}%`, backgroundColor: '#0d9488' }}
                          />
                          <div
                            style={{ width: `${resRatio}%`, backgroundColor: '#2952cc' }}
                          />
                        </div>
                      </td>
                      <td className='px-4 py-3 text-right'>
                        <span className='font-semibold'>{m.atp.toLocaleString()}</span>
                        <span className='block text-[11px] text-muted-foreground'>
                          +{m.oc_transito} en OC
                        </span>
                      </td>
                      <td className='px-4 py-3 text-right text-xs'>
                        {m.necesidadCompra > 0 ? (
                          <span className='font-semibold text-amber-600'>
                            {m.necesidadCompra} uds
                          </span>
                        ) : (
                          <span className='text-teal-600'>Cubierto</span>
                        )}
                      </td>
                      <td className='px-4 py-3 text-right text-xs'>
                        <Badge
                          variant={item.agingTag === 'Normal' ? 'secondary' : 'outline'}
                        >
                          {item.agingTag}
                        </Badge>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  // --------------------------------------------------------------------------
  // 2.2 ALMACENES Y BODEGAS (ESTRUCTURA CONTRATADA)
  // --------------------------------------------------------------------------
  function renderView2_2() {
    return (
      <div className='space-y-5'>
        <div className='flex flex-wrap items-start justify-between gap-3'>
          <div>
            <h1 className='text-xl font-semibold tracking-tight'>
              Almacenes y bodegas
            </h1>
            <p className='text-xs text-muted-foreground'>
              Estructura física provisionada según el plan contratado. Todo Almacén incluye una bodega atada por defecto.
            </p>
          </div>
          <div className='flex items-center gap-2'>
            <Badge variant='outline' className='gap-1.5 py-1 text-xs'>
              <Lock className='size-3 text-muted-foreground' />
              Provisionado por Plan Comercial ({topology.badge})
            </Badge>
          </div>
        </div>

        {/* Casa Matriz (Opcional según topología contratada) */}
        {topology.hasHeadquarters ? (
          <div className='flex flex-col justify-between gap-4 rounded-lg border bg-primary/5 p-4 sm:flex-row sm:items-center'>
            <div className='flex items-center gap-3'>
              <div className='flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground'>
                <Building2 className='size-5' />
              </div>
              <div>
                <div className='flex items-center gap-2'>
                  <span className='text-xs font-semibold uppercase tracking-wider text-primary'>
                    Casa Matriz Contratada
                  </span>
                  <Badge variant='secondary' className='text-[10px]'>
                    {topology.headquartersRuc}
                  </Badge>
                </div>
                <div className='text-base font-semibold'>
                  {topology.headquartersName}
                </div>
                <div className='text-xs text-muted-foreground'>
                  Agrupa {almacenes.length} almacenes físicos y {warehouses.length} bodegas operativas
                </div>
              </div>
            </div>
            <Button
              variant='outline'
              size='sm'
              onClick={() => goToSlug('11-3')}
            >
              Ver estructura en Configuración →
            </Button>
          </div>
        ) : (
          <div className='flex flex-col justify-between gap-3 rounded-lg border bg-muted/30 p-4 sm:flex-row sm:items-center'>
            <div className='flex items-center gap-3'>
              <div className='flex size-9 items-center justify-center rounded-lg border bg-background text-muted-foreground'>
                <Factory className='size-4' />
              </div>
              <div>
                <div className='text-sm font-semibold'>
                  Operación de Almacén Directo (Sin Casa Matriz)
                </div>
                <div className='text-xs text-muted-foreground'>
                  El plan actual opera directamente sobre {almacenes[0]?.name} ({warehouses.length}{' '}
                  {warehouses.length === 1 ? 'bodega atada por defecto' : 'bodegas habilitadas'}).
                </div>
              </div>
            </div>
            <Button
              variant='outline'
              size='sm'
              onClick={() => goToSlug('11-3')}
            >
              Cambiar caso de uso →
            </Button>
          </div>
        )}

        {/* Listado de Almacenes y sus Bodegas */}
        <div className='space-y-6'>
          {almacenes.map((alm) => {
            const almBodegas = warehouses.filter((w) => w.almacenId === alm.id)
            return (
              <div key={alm.id} className='rounded-lg border bg-card'>
                <div className='flex flex-wrap items-center justify-between gap-3 border-b bg-muted/20 px-5 py-3.5'>
                  <div className='flex items-center gap-2.5'>
                    <Factory className='size-4 text-primary' />
                    <div>
                      <div className='flex items-center gap-2'>
                        <span className='text-xs font-semibold text-primary'>
                          {alm.id}
                        </span>
                        <span className='text-sm font-semibold'>{alm.name}</span>
                        <Badge variant='secondary' className='text-[11px]'>
                          {almBodegas.length}{' '}
                          {almBodegas.length === 1 ? 'Bodega' : 'Bodegas'}
                        </Badge>
                      </div>
                      <p className='text-xs text-muted-foreground'>
                        {alm.city}, {alm.country} · {alm.address}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant={warehouse === `ALM:${alm.id}` ? 'default' : 'outline'}
                    size='sm'
                    onClick={() => {
                      setWarehouse(`ALM:${alm.id}`)
                      toast.success(`Filtro activo: ${alm.name}`)
                    }}
                  >
                    {warehouse === `ALM:${alm.id}`
                      ? 'Almacén activo'
                      : 'Filtrar este Almacén'}
                  </Button>
                </div>

                <div className='grid grid-cols-1 gap-5 p-5 md:grid-cols-2'>
                  {almBodegas.map((w) => {
                    const occPct = Math.round((w.occupiedBins / w.totalBins) * 100)
                    const ringColor =
                      occPct >= 88
                        ? '#e11d48'
                        : occPct >= 75
                          ? '#d97706'
                          : '#2952cc'
                    return (
                      <div
                        key={w.id}
                        className='flex flex-col justify-between rounded-lg border bg-background p-4'
                      >
                        <div className='flex items-start justify-between gap-4'>
                          <div>
                            <div className='flex flex-wrap items-center gap-1.5'>
                              <span className='text-xs font-semibold text-primary'>
                                {w.id}
                              </span>
                              <Badge variant='secondary'>{w.type}</Badge>
                              <Badge
                                variant={w.isDefaultTied ? 'default' : 'outline'}
                                className='text-[10px]'
                              >
                                {w.isDefaultTied
                                  ? 'Bodega por defecto (Atada)'
                                  : 'Bodega adicional'}
                              </Badge>
                              <span className='inline-flex items-center gap-1 text-xs font-medium text-teal-600'>
                                <span className='h-1.5 w-1.5 rounded-full bg-teal-600' />
                                {w.status}
                              </span>
                            </div>
                            <h2 className='mt-1.5 text-base font-semibold'>
                              {w.name}
                            </h2>
                            <p className='text-xs text-muted-foreground'>
                              {w.city}, {w.country} · {w.address}
                            </p>
                          </div>
                          <SvgDonut
                            pct={occPct}
                            color={ringColor}
                            size={60}
                            stroke={7}
                          />
                        </div>

                        <div className='mt-4 grid grid-cols-3 gap-4 border-t pt-3 text-xs'>
                          <div>
                            <span className='block text-muted-foreground'>
                              Horario
                            </span>
                            <span className='font-medium'>{w.schedule}</span>
                          </div>
                          <div>
                            <span className='block text-muted-foreground'>
                              Corte Camiones
                            </span>
                            <span className='font-medium'>{w.cutoff}</span>
                          </div>
                          <div>
                            <span className='block text-muted-foreground'>
                              Jefe Bodega
                            </span>
                            <span className='font-medium'>{w.manager}</span>
                          </div>
                        </div>

                        <div className='mt-3 flex items-center justify-between border-t pt-3 text-xs'>
                          <span className='text-muted-foreground'>
                            {w.occupiedBins} / {w.totalBins} ubicaciones ocupadas
                          </span>
                          <div className='flex items-center gap-3'>
                            {!isReadOnly && (
                              <button
                                onClick={() => {
                                  setEditingWh(w)
                                  setWhModalOpen(true)
                                }}
                                className='font-medium text-muted-foreground hover:text-foreground'
                              >
                                Parámetros operativos
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setWarehouse(w.id)
                                goToSlug('2-3')
                              }}
                              className='font-medium text-primary hover:underline'
                            >
                              Ubicaciones →
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // --------------------------------------------------------------------------
  // 2.3 UBICACIONES Y ZONAS
  // --------------------------------------------------------------------------
  function renderView2_3() {
    const zones = [
      'Recepción',
      'Cuarentena',
      'Almacenamiento (Reserva)',
      'Picking',
      'Packing',
      'Muelle',
      'Mermas',
      'Devoluciones',
    ]
    const scopedLocations = locations.filter((l) => matchesScope(l.warehouse))
    const locs = scopedLocations.filter((l) => {
      if (zoneFilter !== 'ALL' && l.zone !== zoneFilter) return false
      return true
    })

    return (
      <div className='space-y-5'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            <h1 className='text-xl font-semibold tracking-tight'>
              Ubicaciones y zonas (Pasillo-Rack-Nivel-Bin)
            </h1>
            {zoneFilter !== 'ALL' && (
              <Button
                size='sm'
                variant='secondary'
                onClick={() => setZoneFilter('ALL')}
              >
                Zona: {zoneFilter} ×
              </Button>
            )}
          </div>
          {!isReadOnly && (
            <Button size='sm' onClick={() => setLocModalOpen(true)}>
              <Plus className='mr-1.5 h-4 w-4' />
              Nueva ubicación
            </Button>
          )}
        </div>

        {/* Mapa Visual de las 8 Zonas Funcionales */}
        <div className='rounded-lg border bg-card p-5'>
          <div className='mb-3 flex items-center justify-between'>
            <span className='text-sm font-semibold'>
              Ocupación por zona funcional (clic para filtrar)
            </span>
            <button
              onClick={() => setZoneFilter('ALL')}
              className='text-xs text-primary hover:underline'
            >
              Ver todas ({scopedLocations.length})
            </button>
          </div>
          <div className='grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8'>
            {zones.map((z) => {
              const zLocs = scopedLocations.filter((l) => l.zone === z)
              const maxU = zLocs.reduce((s, l) => s + l.maxUnits, 0) || 1
              const curU = zLocs.reduce((s, l) => s + l.currentUnits, 0)
              const pct = zLocs.length ? Math.round((curU / maxU) * 100) : 0
              const isSelected = zoneFilter === z
              return (
                <button
                  key={z}
                  onClick={() => setZoneFilter(isSelected ? 'ALL' : z)}
                  className={`rounded-md border p-3 text-left transition ${
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : 'hover:bg-muted/40'
                  }`}
                >
                  <div className='truncate text-xs font-medium'>
                    {z.replace(' (Reserva)', '')}
                  </div>
                  <div className='mt-1 text-base font-semibold'>
                    {pct}%
                  </div>
                  <div className='mt-2 h-1.5 overflow-hidden rounded-full bg-muted'>
                    <div
                      className='h-full rounded-full bg-primary'
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Tabla de 5 Columnas */}
        <div className='overflow-hidden rounded-lg border bg-card'>
          <div className='overflow-x-auto'>
            <table className='w-full border-collapse text-left text-sm'>
              <thead>
                <tr className='border-b bg-muted/40 text-xs text-muted-foreground'>
                  <th className='px-4 py-2.5 font-medium'>Ubicación (P-R-N-Bin)</th>
                  <th className='px-4 py-2.5 font-medium'>Zona y Bodega</th>
                  <th className='px-4 py-2.5 font-medium'>Soporte y Restricción</th>
                  <th className='w-60 px-4 py-2.5 font-medium'>
                    Ocupación (Cajas/Sacos)
                  </th>
                  <th className='px-4 py-2.5 text-right font-medium'>
                    Estado / Etiqueta
                  </th>
                </tr>
              </thead>
              <tbody className='divide-y'>
                {locs.map((l) => {
                  const occPct = Math.round((l.currentUnits / l.maxUnits) * 100)
                  const dotCol =
                    l.status === 'Activa'
                      ? 'bg-teal-600'
                      : l.status === 'En conteo'
                        ? 'bg-amber-500'
                        : 'bg-rose-600'
                  return (
                    <tr key={l.code} className='hover:bg-muted/20'>
                      <td className='px-4 py-3'>
                        <span className='text-xs font-semibold'>
                          {l.code}
                        </span>
                        <span className='block text-xs text-muted-foreground'>
                          {l.skuAssigned}
                        </span>
                      </td>
                      <td className='px-4 py-3 text-xs'>
                        <span className='font-medium text-foreground'>{l.zone}</span>
                        <span className='block text-muted-foreground'>
                          {l.warehouse}
                        </span>
                      </td>
                      <td className='px-4 py-3 text-xs text-muted-foreground'>
                        {l.storageType} · {l.restriction}
                        <span className='block'>
                          Máx {l.maxWeightKg}kg / {l.maxVolM3}m³
                        </span>
                      </td>
                      <td className='px-4 py-3'>
                        <div className='mb-1 flex justify-between text-xs'>
                          <span className='font-medium'>
                            {l.currentUnits} / {l.maxUnits}
                          </span>
                          <span className='text-muted-foreground'>{occPct}%</span>
                        </div>
                        <div className='h-2 overflow-hidden rounded-full bg-muted'>
                          <div
                            className={`h-full rounded-full ${occPct > 85 ? 'bg-amber-500' : 'bg-primary'}`}
                            style={{ width: `${occPct}%` }}
                          />
                        </div>
                      </td>
                      <td className='px-4 py-3 text-right'>
                        <div className='inline-flex items-center gap-2'>
                          <span className='inline-flex items-center gap-1 text-xs text-muted-foreground'>
                            <span className={`h-2 w-2 rounded-full ${dotCol}`} />
                            {l.status}
                          </span>
                          <Button
                            size='sm'
                            variant='outline'
                            onClick={() => setBinLabelLoc(l)}
                          >
                            <Printer className='mr-1 h-3.5 w-3.5' />
                            Etiqueta
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  // --------------------------------------------------------------------------
  // 2.4 REGLAS DE PUTAWAY Y REPOSICIÓN
  // --------------------------------------------------------------------------
  function renderView2_4() {
    return (
      <div className='space-y-5'>
        <div className='flex flex-wrap items-center justify-between gap-2'>
          <h1 className='text-xl font-semibold tracking-tight'>
            Reglas de putaway y reposición de picking
          </h1>
          <div className='flex items-center gap-2'>
            <Button
              variant='outline'
              size='sm'
              onClick={() => setPutawaySimOpen(true)}
            >
              <SlidersHorizontal className='mr-1.5 h-3.5 w-3.5' />
              Simular Putaway de Pallet
            </Button>
            {!isReadOnly && (
              <Button size='sm' onClick={triggerReplenishmentWave}>
                Reponer bins bajo mínimo
              </Button>
            )}
          </div>
        </div>

        <div className='rounded-lg border bg-card p-5'>
          <span className='mb-3 block text-sm font-semibold'>
            Secuencia de prioridad para Putaway dirigido (Pallets de Cerámica y
            Morteros)
          </span>
          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'>
            {WMS_PUTAWAY_RULES.map((r) => (
              <div
                key={r.id}
                className='flex flex-col justify-between rounded-md border p-3.5'
              >
                <div>
                  <div className='flex items-center justify-between text-xs font-semibold text-primary'>
                    <span>PASO {r.priority}</span>
                    <span>{r.id}</span>
                  </div>
                  <div className='mt-1 text-sm font-semibold'>{r.name}</div>
                  <div className='mt-1 text-xs text-muted-foreground'>
                    {r.conditionCategory} · {r.conditionStorage}
                  </div>
                </div>
                <div className='mt-3 border-t pt-2.5 text-xs text-muted-foreground'>
                  → {r.aisleRange}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bullet Charts Mín/Máx */}
        <div className='rounded-lg border bg-card p-5'>
          <div className='mb-4 flex flex-wrap items-center justify-between gap-2'>
            <span className='text-sm font-semibold'>
              Niveles Mínimo / Máximo en Racks de Picking (Nivel Piso)
            </span>
            <div className='flex items-center gap-4 text-xs text-muted-foreground'>
              <span className='flex items-center gap-1'>
                <i className='h-2 w-2 rounded-full bg-rose-600' />
                Bajo mínimo (requiere bajar pallet de Reserva)
              </span>
              <span className='flex items-center gap-1'>
                <i className='h-2 w-2 rounded-full bg-teal-600' />
                Nivel óptimo
              </span>
            </div>
          </div>

          <div className='divide-y'>
            {replenishments.map((rep) => {
              const isLow = rep.currentPickQty < rep.minQty
              const fillPct = Math.round((rep.currentPickQty / rep.maxQty) * 100)
              const minMarkerPct = Math.round((rep.minQty / rep.maxQty) * 100)
              const needed = isLow ? rep.maxQty - rep.currentPickQty : 0
              return (
                <div
                  key={rep.id}
                  className='grid grid-cols-1 items-center gap-4 py-3.5 first:pt-0 last:pb-0 lg:grid-cols-12'
                >
                  <div className='lg:col-span-4'>
                    <div className='flex items-center gap-2'>
                      <span className='text-xs font-semibold'>
                        {rep.sku}
                      </span>
                      <Badge variant='secondary' className='font-medium'>
                        {rep.pickingBin}
                      </Badge>
                    </div>
                    <div className='truncate text-xs text-muted-foreground'>
                      {rep.skuName}
                    </div>
                  </div>

                  <div className='lg:col-span-5'>
                    <div className='mb-1 flex justify-between text-xs'>
                      <span
                        className={
                          isLow
                            ? 'font-semibold text-rose-600'
                            : 'font-semibold text-teal-600'
                        }
                      >
                        Actual: {rep.currentPickQty} ({rep.unitMeasure})
                      </span>
                      <span className='text-muted-foreground'>
                        Mín: {rep.minQty} · Máx: {rep.maxQty}
                      </span>
                    </div>
                    <div className='relative h-2.5 overflow-hidden rounded-full bg-muted'>
                      <div
                        className={`h-full rounded-full ${isLow ? 'bg-rose-600' : 'bg-teal-600'}`}
                        style={{ width: `${fillPct}%` }}
                      />
                      <div
                        className='absolute top-0 bottom-0 w-0.5 bg-foreground'
                        style={{ left: `${minMarkerPct}%` }}
                        title={`Mínimo: ${rep.minQty}`}
                      />
                    </div>
                  </div>

                  <div className='flex items-center gap-2 text-xs lg:col-span-3 lg:justify-end'>
                    {isLow ? (
                      <span className='font-semibold text-amber-600'>
                        Bajar +{needed} de Reserva
                      </span>
                    ) : (
                      <span className='font-medium text-teal-600'>Óptimo</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // --------------------------------------------------------------------------
  // 2.5 TRASPASOS INTER-BODEGAS
  // --------------------------------------------------------------------------
  function renderView2_5() {
    const stepMap: Record<WmsTransfer['status'], number> = {
      Solicitado: 1,
      Aprobado: 2,
      'En tránsito': 3,
      'Recibido total': 4,
      'Cerrado con diferencias': 4,
    }

    return (
      <div className='space-y-5'>
        <div className='flex items-center justify-between'>
          <h1 className='text-xl font-semibold tracking-tight'>
            Traspasos inter-bodegas (Mismo Tono/Calibre)
          </h1>
          {!isReadOnly && (
            <Button size='sm' onClick={() => setNewTransferOpen(true)}>
              <Plus className='mr-1.5 h-4 w-4' />
              Solicitar traspaso
            </Button>
          )}
        </div>

        <div className='divide-y rounded-lg border bg-card'>
          {transfers.map((t) => {
            const step = stepMap[t.status] || 1
            const pct = (step / 4) * 100
            const barColor =
              t.status === 'Cerrado con diferencias'
                ? '#d97706'
                : t.status === 'Recibido total'
                  ? '#0d9488'
                  : '#2952cc'
            return (
              <div
                key={t.id}
                className='grid grid-cols-1 items-center gap-4 p-4 hover:bg-muted/20 lg:grid-cols-12'
              >
                <div className='lg:col-span-4'>
                  <div className='flex items-center gap-2'>
                    <span className='text-xs font-semibold'>{t.id}</span>
                    <span className='text-xs font-medium text-primary'>
                      {t.originWarehouse} → {t.destWarehouse}
                    </span>
                  </div>
                  <div className='mt-0.5 text-sm font-medium'>
                    <strong className='font-medium'>{t.qtyRequested} uds</strong> ·{' '}
                    {t.skuName}
                  </div>
                  <div className='text-xs text-muted-foreground'>
                    {t.carrier} · Guía: {t.guideNumber}
                  </div>
                </div>

                <div className='lg:col-span-5'>
                  <div className='mb-1 flex justify-between text-xs'>
                    <span>
                      Etapa {step} de 4: <strong>{t.status}</strong>
                    </span>
                    <span className='text-muted-foreground'>
                      Env: {t.qtySent} / Rec:{' '}
                      {t.qtyReceived !== null ? t.qtyReceived : '-'}
                    </span>
                  </div>
                  <div className='h-2 overflow-hidden rounded-full bg-muted'>
                    <div
                      className='h-full rounded-full transition-all'
                      style={{ width: `${pct}%`, backgroundColor: barColor }}
                    />
                  </div>
                </div>

                <div className='flex flex-wrap items-center gap-2 lg:col-span-3 lg:justify-end'>
                  {!isReadOnly && t.status === 'Solicitado' && (
                    <Button
                      size='sm'
                      onClick={() => advanceTransfer(t.id, 'Aprobado')}
                    >
                      Aprobar
                    </Button>
                  )}
                  {!isReadOnly && t.status === 'Aprobado' && (
                    <Button
                      size='sm'
                      onClick={() => advanceTransfer(t.id, 'En tránsito')}
                    >
                      Despachar
                    </Button>
                  )}
                  {!isReadOnly && t.status === 'En tránsito' && (
                    <>
                      <Button
                        size='sm'
                        onClick={() => advanceTransfer(t.id, 'Recibido total')}
                      >
                        Recibir OK
                      </Button>
                      <Button
                        size='sm'
                        variant='outline'
                        onClick={() =>
                          advanceTransfer(t.id, 'Cerrado con diferencias')
                        }
                      >
                        Con rotura
                      </Button>
                    </>
                  )}
                  <Button
                    size='sm'
                    variant='outline'
                    onClick={() => setGuideTransfer(t)}
                  >
                    Guía
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // --------------------------------------------------------------------------
  // CONFIGURACIÓN Y CONTEXTO CON SIDENAV LATERAL (ESTILO SHADCN-ADMIN SETTINGS)
  // --------------------------------------------------------------------------
  function renderSettingsWithSideNav() {
    const sideNavItems = [
      {
        title: 'Perfil y Rol (RBAC)',
        slug: '11-2',
        icon: ShieldCheck,
      },
      {
        title: 'Almacenes y Bodegas',
        slug: '11-3',
        icon: Warehouse,
      },
      {
        title: 'Gestión de Usuarios',
        slug: '11-1',
        icon: Users,
      },
      {
        title: 'Apariencia y Fuente',
        slug: '11-9',
        icon: Palette,
      },
    ]

    const activeTab = sideNavItems.some((item) => item.slug === scr.slug)
      ? scr.slug
      : '11-2'

    return (
      <div className='space-y-6'>
        <div className='space-y-0.5'>
          <h1 className='text-2xl font-bold tracking-tight md:text-3xl'>
            Configuración y Contexto Operativo
          </h1>
          <p className='text-sm text-muted-foreground'>
            Administra el perfil de acceso (RBAC), la estructura contratada de Almacenes y Bodegas, y las preferencias visuales de la plataforma.
          </p>
        </div>

        <Separator className='my-4' />

        <div className='flex flex-1 flex-col space-y-6 lg:flex-row lg:space-y-0 lg:space-x-12'>
          {/* SideNav izquierdo estilo Settings de Shadcn-Admin */}
          <aside className='top-0 lg:sticky lg:w-1/5'>
            <nav className='flex space-x-2 overflow-x-auto lg:flex-col lg:space-y-1 lg:space-x-0'>
              {sideNavItems.map((item) => {
                const Icon = item.icon
                const isActive = activeTab === item.slug
                return (
                  <button
                    key={item.slug}
                    type='button'
                    onClick={() => goToSlug(item.slug)}
                    className={`inline-flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors text-start ${
                      isActive
                        ? 'bg-muted text-foreground'
                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                    }`}
                  >
                    <Icon className='size-4 shrink-0' />
                    <span className='truncate'>{item.title}</span>
                  </button>
                )
              })}
            </nav>
          </aside>

          {/* Contenido derecho según la opción del SideNav */}
          <div className='flex-1 lg:max-w-3xl'>
            {activeTab === '11-2' && (
              <div className='space-y-6'>
                <div>
                  <h3 className='text-lg font-medium'>Perfil y Rol Activo (RBAC)</h3>
                  <p className='text-sm text-muted-foreground'>
                    Selecciona el rol operativo con el que deseas navegar el sistema. El menú lateral filtrará automáticamente las pantallas autorizadas.
                  </p>
                </div>
                <Separator />

                <div className='flex items-center justify-between rounded-lg border bg-card p-4'>
                  <div className='space-y-0.5'>
                    <div className='text-sm font-medium'>
                      Mostrar pantallas restringidas en el menú (🔒)
                    </div>
                    <div className='text-xs text-muted-foreground'>
                      Permite visualizar con candado las opciones no habilitadas para el perfil actual.
                    </div>
                  </div>
                  <Switch
                    checked={showRestricted}
                    onCheckedChange={setShowRestricted}
                  />
                </div>

                <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                  {Object.values(WMS_ROLES).map((r) => {
                    const selected = role === r.code
                    return (
                      <button
                        key={r.code}
                        type='button'
                        onClick={() => {
                          setRole(r.code)
                          toast.success(`Perfil cambiado a: ${r.name}`)
                        }}
                        className={`flex flex-col items-start gap-1.5 rounded-lg border p-4 text-start transition-colors ${
                          selected
                            ? 'border-primary bg-primary/5 ring-1 ring-primary'
                            : 'bg-card hover:bg-muted/40'
                        }`}
                      >
                        <div className='flex w-full items-center justify-between'>
                          <span className='text-sm font-semibold'>{r.name}</span>
                          <Badge variant={selected ? 'default' : 'secondary'}>
                            {r.code}
                          </Badge>
                        </div>
                        <p className='text-xs text-muted-foreground'>
                          {r.description}
                        </p>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {activeTab === '11-3' && (
              <div className='space-y-6'>
                <div>
                  <h3 className='text-lg font-medium'>
                    Estructura Contratada y Alcance Operativo
                  </h3>
                  <p className='text-sm text-muted-foreground'>
                    Todo Almacén incluye por defecto una Bodega atada. La contratación de Casa Matriz, Almacenes adicionales o Bodegas adicionales se realiza en el sistema comercial externo.
                  </p>
                </div>
                <Separator />

                {/* Selector de los 3 Casos de Uso de Estructura Contratada */}
                <div className='space-y-3'>
                  <div className='flex items-center justify-between'>
                    <span className='text-sm font-semibold'>
                      1. Plan / Topología Contratada (Casos de Uso)
                    </span>
                    <Badge variant='outline' className='text-xs'>
                      Provisionado por Suscripción
                    </Badge>
                  </div>
                  <div className='grid grid-cols-1 gap-3'>
                    {Object.values(TOPOLOGY_SCENARIOS).map((sc) => {
                      const isCurrent = scenario === sc.code
                      return (
                        <button
                          key={sc.code}
                          type='button'
                          onClick={() => {
                            setScenario(sc.code as TopologyScenario)
                            toast.success(`Estructura aplicada: ${sc.title}`)
                          }}
                          className={`flex flex-col items-start justify-between gap-2 rounded-lg border p-4 text-start transition-colors sm:flex-row sm:items-center ${
                            isCurrent
                              ? 'border-primary bg-primary/5 ring-1 ring-primary'
                              : 'bg-card hover:bg-muted/40'
                          }`}
                        >
                          <div className='space-y-1'>
                            <div className='flex flex-wrap items-center gap-2'>
                              <span className='text-sm font-semibold'>
                                {sc.title}
                              </span>
                              <Badge variant={isCurrent ? 'default' : 'secondary'}>
                                {sc.badge}
                              </Badge>
                            </div>
                            <p className='text-xs text-muted-foreground'>
                              {sc.subtitle}
                            </p>
                          </div>
                          <Badge variant={isCurrent ? 'default' : 'outline'} className='shrink-0'>
                            {isCurrent ? 'Plan Activo' : 'Simular caso'}
                          </Badge>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <Separator />

                {/* Selector Jerárquico Casa Matriz -> Almacén -> Bodega */}
                <div className='space-y-3'>
                  <span className='block text-sm font-semibold'>
                    2. Selección de Alcance Activo (Casa Matriz / Almacén / Bodega)
                  </span>

                  {/* Nivel Global: Casa Matriz o Almacén Consolidado */}
                  <button
                    type='button'
                    onClick={() => {
                      setWarehouse('ALL')
                      toast.success('Vista consolidada activada')
                    }}
                    className={`flex w-full items-center justify-between rounded-lg border p-4 text-start transition-colors ${
                      warehouse === 'ALL'
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'bg-card hover:bg-muted/40'
                    }`}
                  >
                    <div className='flex items-center gap-3'>
                      <div className='flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary'>
                        <Building2 className='size-5' />
                      </div>
                      <div>
                        <div className='text-sm font-semibold'>
                          {topology.hasHeadquarters
                            ? `Todas las Bodegas (${topology.headquartersName})`
                            : `Consolidado ${almacenes[0]?.name} (${warehouses.length} ${warehouses.length === 1 ? 'bodega' : 'bodegas'})`}
                        </div>
                        <div className='text-xs text-muted-foreground'>
                          {topology.hasHeadquarters
                            ? `Casa Matriz · ${almacenes.length} almacenes y ${warehouses.length} bodegas habilitadas`
                            : `Sin Casa Matriz · Operación directa sobre ${almacenes[0]?.name}`}
                        </div>
                      </div>
                    </div>
                    <Badge variant={warehouse === 'ALL' ? 'default' : 'outline'}>
                      {warehouse === 'ALL' ? 'Activo' : 'Seleccionar'}
                    </Badge>
                  </button>

                  {/* Agrupación por Almacén y sus Bodegas */}
                  <div className='space-y-4 pt-1'>
                    {almacenes.map((alm) => {
                      const almBodegas = warehouses.filter(
                        (w) => w.almacenId === alm.id
                      )
                      const isAlmSelected = warehouse === `ALM:${alm.id}`
                      return (
                        <div
                          key={alm.id}
                          className='overflow-hidden rounded-lg border bg-card'
                        >
                          <div className='flex flex-wrap items-center justify-between gap-2 border-b bg-muted/30 px-4 py-3'>
                            <div className='flex items-center gap-2.5'>
                              <Factory className='size-4 text-primary' />
                              <div>
                                <div className='text-sm font-semibold'>
                                  {alm.name}{' '}
                                  <span className='font-normal text-muted-foreground'>
                                    ({alm.id})
                                  </span>
                                </div>
                                <div className='text-xs text-muted-foreground'>
                                  {alm.city} · {alm.address}
                                </div>
                              </div>
                            </div>
                            {almacenes.length > 1 && (
                              <Button
                                size='sm'
                                variant={isAlmSelected ? 'default' : 'outline'}
                                onClick={() => {
                                  setWarehouse(`ALM:${alm.id}`)
                                  toast.success(`Almacén activo: ${alm.name}`)
                                }}
                              >
                                {isAlmSelected
                                  ? 'Almacén Activo'
                                  : 'Ver todo el Almacén'}
                              </Button>
                            )}
                          </div>

                          <div className='divide-y p-2'>
                            {almBodegas.map((w) => {
                              const selected = warehouse === w.id
                              return (
                                <button
                                  key={w.id}
                                  type='button'
                                  onClick={() => {
                                    setWarehouse(w.id)
                                    toast.success(`Bodega activa: ${w.name}`)
                                  }}
                                  className={`flex w-full items-center justify-between rounded-md p-3 text-start transition-colors ${
                                    selected
                                      ? 'bg-primary/10 text-foreground'
                                      : 'hover:bg-muted/40'
                                  }`}
                                >
                                  <div className='flex items-center gap-3'>
                                    <div className='flex size-8 items-center justify-center rounded-md bg-muted text-foreground'>
                                      <Warehouse className='size-4' />
                                    </div>
                                    <div>
                                      <div className='flex flex-wrap items-center gap-2 text-sm font-semibold'>
                                        <span>{w.name}</span>
                                        <span className='text-xs font-normal text-muted-foreground'>
                                          ({w.id})
                                        </span>
                                        <Badge
                                          variant={
                                            w.isDefaultTied ? 'secondary' : 'outline'
                                          }
                                          className='text-[10px]'
                                        >
                                          {w.isDefaultTied
                                            ? 'Bodega por defecto (Atada)'
                                            : 'Bodega adicional'}
                                        </Badge>
                                      </div>
                                      <div className='text-xs text-muted-foreground'>
                                        Tipo: {w.type} · Ocupación: {w.occupiedBins}/
                                        {w.totalBins} ubicaciones · Corte: {w.cutoff}
                                      </div>
                                    </div>
                                  </div>
                                  <Badge
                                    variant={selected ? 'default' : 'outline'}
                                  >
                                    {selected ? 'Activa' : 'Seleccionar'}
                                  </Badge>
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {activeTab === '11-1' && (
              <div className='space-y-6'>
                <div>
                  <h3 className='text-lg font-medium'>Usuarios de la Plataforma</h3>
                  <p className='text-sm text-muted-foreground'>
                    Personal asignado por bodega y perfil operativo.
                  </p>
                </div>
                <Separator />

                <div className='rounded-lg border bg-card'>
                  <table className='w-full text-sm'>
                    <thead>
                      <tr className='border-b bg-muted/40 text-start text-xs text-muted-foreground'>
                        <th className='px-4 py-2.5 text-start font-medium'>Usuario</th>
                        <th className='px-4 py-2.5 text-start font-medium'>Rol RBAC</th>
                        <th className='px-4 py-2.5 text-start font-medium'>Bodega Asignada</th>
                        <th className='px-4 py-2.5 text-end font-medium'>Acción</th>
                      </tr>
                    </thead>
                    <tbody className='divide-y'>
                      {[
                        { name: 'Andrés Morales', email: 'a.morales@ceramix.cl', r: 'ADM' as RoleCode, wh: 'ALL' },
                        { name: 'Roberto Soto', email: 'r.soto@ceramix.cl', r: 'JB' as RoleCode, wh: 'BOD-CEN-01' },
                        { name: 'Carlos Muñoz', email: 'c.munoz@ceramix.cl', r: 'REC' as RoleCode, wh: 'BOD-CEN-01' },
                        { name: 'Pedro Vargas', email: 'p.vargas@ceramix.cl', r: 'PCK' as RoleCode, wh: 'BOD-OBR-02' },
                        { name: 'Lucía Fernández', email: 'l.fernandez@ceramix.cl', r: 'CAL' as RoleCode, wh: 'BOD-MOR-04' },
                        { name: 'Gonzalo Rojas', email: 'g.rojas@ceramix.cl', r: 'GER' as RoleCode, wh: 'ALL' },
                      ].map((u) => (
                        <tr key={u.email} className='hover:bg-muted/30'>
                          <td className='px-4 py-3'>
                            <div className='font-medium'>{u.name}</div>
                            <div className='text-xs text-muted-foreground'>{u.email}</div>
                          </td>
                          <td className='px-4 py-3'>
                            <Badge variant='secondary'>
                              {u.r} · {WMS_ROLES[u.r]?.name}
                            </Badge>
                          </td>
                          <td className='px-4 py-3 text-xs text-muted-foreground'>
                            {u.wh === 'ALL' ? 'Todas las Bodegas' : u.wh}
                          </td>
                          <td className='px-4 py-3 text-end'>
                            <Button
                              size='sm'
                              variant='outline'
                              onClick={() => {
                                setRole(u.r)
                                setWarehouse(u.wh)
                                toast.success(`Simulando sesión de ${u.name} (${u.r})`)
                              }}
                            >
                              Usar este perfil
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === '11-9' && (
              <div className='space-y-6'>
                <div>
                  <h3 className='text-lg font-medium'>Apariencia y Tipografía</h3>
                  <p className='text-sm text-muted-foreground'>
                    Personaliza la fuente nativa del template y el modo de color de la interfaz.
                  </p>
                </div>
                <Separator />

                <div className='space-y-4'>
                  <div>
                    <label className='text-sm font-medium'>Fuente del sistema</label>
                    <p className='mb-2 text-xs text-muted-foreground'>
                      Selecciona la fuente suave predeterminada del template para toda la interfaz.
                    </p>
                    <div className='flex flex-wrap gap-2'>
                      {fonts.map((f) => (
                        <Button
                          key={f}
                          type='button'
                          variant={font === f ? 'default' : 'outline'}
                          size='sm'
                          className='capitalize'
                          onClick={() => setFont(f)}
                        >
                          {f}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <label className='text-sm font-medium'>Tema de color</label>
                    <p className='mb-2 text-xs text-muted-foreground'>
                      Alterna entre modo claro, oscuro o automático del sistema.
                    </p>
                    <div className='flex flex-wrap gap-2'>
                      {(['light', 'dark', 'system'] as const).map((t) => (
                        <Button
                          key={t}
                          type='button'
                          variant={theme === t ? 'default' : 'outline'}
                          size='sm'
                          className='capitalize'
                          onClick={() => setTheme(t)}
                        >
                          {t === 'light' ? 'Claro' : t === 'dark' ? 'Oscuro' : 'Sistema'}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // --------------------------------------------------------------------------
  // VISTA INFORMATIVA PARA MÓDULOS 3 AL 10
  // --------------------------------------------------------------------------
  function renderUpcomingView() {
    return (
      <div className='mx-auto max-w-3xl rounded-lg border bg-card p-6 space-y-4'>
        <div className='flex items-center justify-between border-b pb-4'>
          <div>
            <div className='flex items-center gap-2'>
              <span className='text-xs text-muted-foreground'>{mod.name}</span>
              {scr.mobile && <Badge>Terminal Móvil RF</Badge>}
            </div>
            <h1 className='mt-1.5 text-xl font-semibold'>{scr.name}</h1>
          </div>
          <Badge variant='secondary'>Módulo Operativo</Badge>
        </div>

        <p className='text-sm text-muted-foreground'>{scr.desc}</p>

        <div className='grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2'>
          <div className='rounded-md border bg-muted/30 p-4'>
            <div className='mb-2 text-xs font-semibold'>
              Perfiles con acceso autorizado
            </div>
            <div className='flex flex-wrap gap-1.5'>
              {scr.roles.map((rCode) => (
                <Badge key={rCode} variant='secondary'>
                  {rCode} · {WMS_ROLES[rCode]?.name}
                </Badge>
              ))}
            </div>
          </div>
          <div className='rounded-md border bg-muted/30 p-4'>
            <div className='mb-1 text-xs font-semibold'>
              Trazabilidad y Reglas Operativas
            </div>
            <p className='text-xs text-muted-foreground'>
              Control activo por lote, tono/calibre cerámico, vencimiento FEFO en
              morteros y registro automático en auditoría multi-bodega.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // --------------------------------------------------------------------------
  // MODALES DE ACCIÓN
  // --------------------------------------------------------------------------
  function renderModals() {
    return (
      <>
        {/* Modal Parámetros Operativos de Bodega (Sin alta de bodegas ni almacenes) */}
        <Dialog open={whModalOpen} onOpenChange={setWhModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Parámetros operativos · {editingWh?.id}
              </DialogTitle>
            </DialogHeader>
            {editingWh && (
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  const fd = new FormData(e.currentTarget)
                  updateOperationalParams(editingWh.id, {
                    schedule: String(fd.get('schedule')),
                    cutoff: String(fd.get('cutoff')),
                    manager: String(fd.get('manager')),
                  })
                  setWhModalOpen(false)
                }}
                className='space-y-3 text-xs'
              >
                <div className='rounded-md border bg-muted/30 p-3 text-xs'>
                  <div className='font-semibold text-foreground'>
                    {editingWh.name}
                  </div>
                  <div className='mt-0.5 text-muted-foreground'>
                    {editingWh.almacenName} ({editingWh.almacenId}) ·{' '}
                    {editingWh.isDefaultTied
                      ? 'Bodega por defecto atada al Almacén'
                      : 'Bodega adicional contratada'}
                  </div>
                </div>
                <div className='grid grid-cols-2 gap-3'>
                  <div>
                    <label className='mb-1 block font-medium'>
                      Horario operativo
                    </label>
                    <Input
                      name='schedule'
                      defaultValue={editingWh.schedule}
                      required
                    />
                  </div>
                  <div>
                    <label className='mb-1 block font-medium'>
                      Corte horario camiones
                    </label>
                    <Input
                      name='cutoff'
                      defaultValue={editingWh.cutoff}
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className='mb-1 block font-medium'>
                    Jefe de Bodega responsable
                  </label>
                  <Input
                    name='manager'
                    defaultValue={editingWh.manager}
                    required
                  />
                </div>
                <div className='flex justify-end gap-2 pt-2'>
                  <Button
                    type='button'
                    variant='outline'
                    onClick={() => setWhModalOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type='submit'>Guardar parámetros</Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* Modal Nueva Ubicación */}
        <Dialog open={locModalOpen} onOpenChange={setLocModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Alta de ubicación</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                const fd = new FormData(e.currentTarget)
                const aisle = String(fd.get('aisle')).toUpperCase()
                const rack = String(fd.get('rack'))
                const level = String(fd.get('level'))
                const bin = String(fd.get('bin')).toUpperCase()
                addLocation({
                  code: `${aisle}-${rack}-${level}-${bin}`,
                  warehouse: String(fd.get('warehouse')),
                  zone: String(fd.get('zone')),
                  aisle,
                  rack,
                  level,
                  bin,
                  storageType: 'Rack Pesado',
                  restriction: 'Frágil · Tono/Calibre',
                })
                setLocModalOpen(false)
              }}
              className='space-y-3 text-xs'
            >
              <div className='grid grid-cols-2 gap-3'>
                <div>
                  <label className='mb-1 block font-medium'>Bodega</label>
                  <select
                    name='warehouse'
                    className='h-9 w-full rounded-md border bg-background px-3 text-xs'
                  >
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.id}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className='mb-1 block font-medium'>Zona Funcional</label>
                  <select
                    name='zone'
                    className='h-9 w-full rounded-md border bg-background px-3 text-xs'
                  >
                    <option>Picking</option>
                    <option>Almacenamiento (Reserva)</option>
                    <option>Recepción</option>
                    <option>Cuarentena</option>
                  </select>
                </div>
              </div>
              <div className='grid grid-cols-4 gap-2'>
                <Input name='aisle' defaultValue='P' placeholder='Pasillo' required />
                <Input name='rack' defaultValue='04' placeholder='Rack' required />
                <Input name='level' defaultValue='01' placeholder='Nivel' required />
                <Input name='bin' defaultValue='B02' placeholder='Bin' required />
              </div>
              <div className='flex justify-end gap-2 pt-2'>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => setLocModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type='submit'>Crear ubicación</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Modal Etiqueta Bin */}
        <Dialog open={!!binLabelLoc} onOpenChange={() => setBinLabelLoc(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Etiqueta de Ubicación · {binLabelLoc?.code}</DialogTitle>
            </DialogHeader>
            {binLabelLoc && (
              <div className='space-y-4 text-xs'>
                <div className='rounded-md border-2 border-dashed p-5 text-center space-y-2'>
                  <div className='text-muted-foreground'>
                    {binLabelLoc.warehouse} · {binLabelLoc.zone.toUpperCase()}
                  </div>
                  <div className='text-2xl font-bold tracking-wider'>
                    {binLabelLoc.code}
                  </div>
                  <div className='py-2 text-base tracking-[0.25em]'>
                    ||| |||| || ||| |||| |||
                  </div>
                  <div className='text-muted-foreground'>
                    {binLabelLoc.storageType} · Máx {binLabelLoc.maxWeightKg}kg
                  </div>
                </div>
                <div className='flex justify-end gap-2'>
                  <Button variant='outline' onClick={() => setBinLabelLoc(null)}>
                    Cerrar
                  </Button>
                  <Button
                    onClick={() => {
                      toast.success(`Etiqueta ${binLabelLoc.code} enviada a Zebra ZPL`)
                      setBinLabelLoc(null)
                    }}
                  >
                    Imprimir ZPL
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Modal Simulador Putaway */}
        <Dialog open={putawaySimOpen} onOpenChange={setPutawaySimOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Simulador Putaway Dirigido</DialogTitle>
            </DialogHeader>
            <div className='space-y-3 text-xs'>
              <div className='rounded-md border bg-muted/30 p-4 space-y-2'>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>Pallet (LPN):</span>
                  <strong className='font-medium'>
                    LPN-99812 (36 cajas · POR-60120-CAL)
                  </strong>
                </div>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>Partida:</span>
                  <strong>Tono T42 · Calibre C2 · Peso: 1,150 kg</strong>
                </div>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>Regla aplicada:</span>
                  <strong>#1 Gran Formato + Mismo Tono/Calibre</strong>
                </div>
                <div className='flex justify-between border-t pt-2'>
                  <span className='font-medium'>Ubicación sugerida:</span>
                  <strong className='text-sm text-primary'>
                    P-01-01-B01 (Nivel Piso)
                  </strong>
                </div>
              </div>
              <div className='flex justify-end'>
                <Button onClick={() => setPutawaySimOpen(false)}>Cerrar</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal Nuevo Traspaso */}
        <Dialog open={newTransferOpen} onOpenChange={setNewTransferOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Solicitar traspaso inter-bodegas</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                const fd = new FormData(e.currentTarget)
                createTransfer(
                  String(fd.get('origin')),
                  String(fd.get('dest')),
                  String(fd.get('sku')),
                  Number(fd.get('qty')) || 24
                )
                setNewTransferOpen(false)
              }}
              className='space-y-3 text-xs'
            >
              <div className='grid grid-cols-2 gap-3'>
                <div>
                  <label className='mb-1 block font-medium'>Bodega Origen</label>
                  <select
                    name='origin'
                    className='h-9 w-full rounded-md border bg-background px-3 text-xs'
                  >
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.id}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className='mb-1 block font-medium'>Bodega Destino</label>
                  <select
                    name='dest'
                    defaultValue='BOD-SHW-03'
                    className='h-9 w-full rounded-md border bg-background px-3 text-xs'
                  >
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.id}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className='grid grid-cols-3 gap-3'>
                <div className='col-span-2'>
                  <label className='mb-1 block font-medium'>SKU</label>
                  <select
                    name='sku'
                    className='h-9 w-full rounded-md border bg-background px-3 text-xs'
                  >
                    {WMS_STOCK_ITEMS.map((it) => (
                      <option key={it.sku} value={it.sku}>
                        {it.sku} · {it.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className='mb-1 block font-medium'>Cajas / Sacos</label>
                  <Input name='qty' type='number' defaultValue='36' min='1' required />
                </div>
              </div>
              <div className='flex justify-end gap-2 pt-2'>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => setNewTransferOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type='submit'>Crear solicitud</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Modal Guía de Traslado */}
        <Dialog open={!!guideTransfer} onOpenChange={() => setGuideTransfer(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Guía de Despacho Electrónica · {guideTransfer?.id}
              </DialogTitle>
            </DialogHeader>
            {guideTransfer && (
              <div className='space-y-3 text-xs'>
                <div className='rounded-md border bg-muted/30 p-4 space-y-2'>
                  <div className='flex justify-between'>
                    <span className='text-muted-foreground'>Folio Fiscal:</span>
                    <strong className='font-medium'>{guideTransfer.guideNumber}</strong>
                  </div>
                  <div className='flex justify-between'>
                    <span className='text-muted-foreground'>Ruta:</span>
                    <strong className='font-medium'>
                      {guideTransfer.originWarehouse} → {guideTransfer.destWarehouse}
                    </strong>
                  </div>
                  <div className='flex justify-between'>
                    <span className='text-muted-foreground'>Producto:</span>
                    <strong>
                      {guideTransfer.qtyRequested} uds · {guideTransfer.sku}
                    </strong>
                  </div>
                  <div className='flex justify-between'>
                    <span className='text-muted-foreground'>Notas / Tono:</span>
                    <span>{guideTransfer.notes}</span>
                  </div>
                </div>
                <div className='flex justify-end gap-2'>
                  <Button variant='outline' onClick={() => setGuideTransfer(null)}>
                    Cerrar
                  </Button>
                  <Button
                    onClick={() => {
                      toast.success(`PDF ${guideTransfer.guideNumber} descargado`)
                      setGuideTransfer(null)
                    }}
                  >
                    Descargar PDF
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </>
    )
  }
}
