import { useState } from 'react'
import { CheckCircle2, ChevronRight, Download } from 'lucide-react'
import { downloadCsv } from '@/lib/csv'
import { useWms } from '@/context/wms-provider'
import { Button } from '@/components/ui/button'
import {
  FilterTabs,
  ProgressBar,
  Section,
  StatStrip,
  StatusPill,
  type Tone,
} from '@/features/wms/components/kit'
import { INITIAL_WAREHOUSES } from '@/features/wms/data/topology-data'
import { TODAY_STR } from '@/features/wms/domain/clock'
import {
  PICKUP_OVERDUE_DAYS,
  type PickupOrder,
  type SkuItem,
} from '@/features/wms/domain/inventory'
import {
  RECON_FLAG_LABEL,
  orderTotals,
  reconcile,
  type ReconDay,
  type ReconFlag,
  type ReconRow,
  type ReconStatus,
} from '@/features/wms/domain/invoicing'
import { PageHeader, cop, shortDate } from './ui-helpers'

type Period = 'hoy' | '7d' | 'mes' | 'todo'

const PERIODS: { id: Period; label: string }[] = [
  { id: 'hoy', label: 'Hoy' },
  { id: '7d', label: 'Últimos 7 días' },
  { id: 'mes', label: 'Este mes' },
  { id: 'todo', label: 'Todo' },
]

const STATUSES: ReconStatus[] = [
  'Entregada',
  'Entrega parcial',
  'Pendiente',
  'Anulada',
  'Sin facturar',
]

function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

function fromDateOf(period: Period): string | undefined {
  if (period === 'hoy') return TODAY_STR
  if (period === '7d') return addDays(TODAY_STR, -6)
  if (period === 'mes') return `${TODAY_STR.slice(0, 8)}01`
  return undefined
}

function ageText(days: number): string {
  if (days <= 0) return 'hoy'
  return `hace ${days} ${days === 1 ? 'día' : 'días'}`
}

/** Cifra corta para la banda de resumen: $ 73,7 M. El valor exacto está en el detalle y el CSV. */
function copShort(n: number): string {
  const fmt = (x: number) =>
    x.toLocaleString('es-CO', { maximumFractionDigits: 1 })
  if (Math.abs(n) >= 1_000_000_000)
    return `$ ${fmt(n / 1_000_000_000)} mil millones`
  if (Math.abs(n) >= 1_000_000) return `$ ${fmt(n / 1_000_000)} M`
  return cop(n)
}

const isCritical = (r: ReconRow) => r.flags.includes('anulada_con_entregas')

function statusTone(r: ReconRow): Tone {
  if (r.status === 'Entregada') return 'success'
  if (r.status === 'Entrega parcial') return 'info'
  if (r.status === 'Anulada') return isCritical(r) ? 'danger' : 'neutral'
  return r.flags.length > 0 ? 'warning' : 'neutral'
}

const FLAG_PILL: Record<ReconFlag, { tone: Tone; label: string }> = {
  anulada_con_entregas: { tone: 'danger', label: 'Crítico' },
  pendiente_vencida: { tone: 'warning', label: 'Sin retirar' },
  sin_facturar_vencida: { tone: 'warning', label: 'Sin facturar' },
}

export function ReconciliationScreen() {
  const { orders, skus, warehouses, matchesScope } = useWms()
  const [period, setPeriod] = useState<Period>('mes')

  const summary = reconcile(orders, skus, {
    todayStr: TODAY_STR,
    inScope: matchesScope,
    fromDate: fromDateOf(period),
  })

  const whName = (id: string) =>
    [...warehouses, ...INITIAL_WAREHOUSES].find((w) => w.id === id)?.name ?? id

  const pendingCount = summary.rows.filter((r) => r.pendingCOP > 0).length
  const pct = Math.round(summary.deliveredPct)

  const download = () => {
    downloadCsv(`conciliacion-${TODAY_STR}.csv`, [
      [
        'Factura',
        'Pedido',
        'Cliente',
        'Bodega',
        'Fecha',
        'Estado',
        'Unidades facturadas',
        'Unidades entregadas',
        'Unidades pendientes',
        'Facturado (COP)',
        'Entregado (COP)',
        'Pendiente (COP)',
        'Días de antigüedad',
        'Alertas',
        'Última entrega por',
      ],
      ...summary.rows.map((r) => [
        r.invoiceNumber ?? '',
        r.orderId,
        r.customer,
        whName(r.warehouse),
        r.date,
        r.status,
        r.invoicedUnits,
        r.deliveredUnits,
        r.pendingUnits,
        r.invoicedCOP,
        r.deliveredCOP,
        r.pendingCOP,
        r.ageDays,
        r.flags.map((f) => RECON_FLAG_LABEL[f]).join(' | '),
        r.lastDeliveryBy ?? '',
      ]),
    ])
  }

  return (
    <div className='mx-auto w-full max-w-5xl space-y-5'>
      <PageHeader
        title='Conciliación de entregas'
        actions={
          <Button variant='outline' className='h-10' onClick={download}>
            <Download className='size-4' />
            Descargar CSV
          </Button>
        }
      />

      <FilterTabs value={period} onChange={setPeriod} options={PERIODS} />

      <div className='space-y-3'>
        <StatStrip
          items={[
            {
              label: 'Facturado',
              value: copShort(summary.invoicedCOP),
              hint: `${summary.invoicedCount} ${summary.invoicedCount === 1 ? 'factura' : 'facturas'}`,
            },
            {
              label: 'Entregado',
              value: copShort(summary.deliveredCOP),
            },
            {
              label: 'Por entregar',
              value: copShort(summary.pendingCOP),
              hint:
                pendingCount > 0
                  ? `${pendingCount} ${pendingCount === 1 ? 'factura' : 'facturas'}`
                  : undefined,
              tone: summary.pendingCOP > 0 ? 'warning' : 'neutral',
            },
            {
              label: '% entregado',
              value: `${pct}%`,
              tone:
                summary.invoicedCOP > 0 && pct >= 100 ? 'success' : 'neutral',
            },
          ]}
        />
        <ProgressBar
          value={summary.deliveredPct}
          tone={pct >= 100 ? 'success' : 'info'}
        />
      </div>

      <ExceptionsSection
        exceptions={summary.exceptions}
        orders={orders}
        skus={skus}
      />

      <DailySection days={summary.byDay} />

      <InvoicesDetail rows={summary.rows} />
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Para revisar                                                               */
/* -------------------------------------------------------------------------- */

function ExceptionsSection({
  exceptions,
  orders,
  skus,
}: {
  exceptions: ReconRow[]
  orders: PickupOrder[]
  skus: SkuItem[]
}) {
  const skuMap = new Map(skus.map((s) => [s.sku, s]))
  const orderMap = new Map(orders.map((o) => [o.id, o]))

  // Lo crítico (mercancía entregada con factura anulada) siempre va primero.
  const sorted = [...exceptions].sort(
    (a, b) =>
      Number(isCritical(b)) - Number(isCritical(a)) || b.ageDays - a.ageDays
  )

  const valueOf = (r: ReconRow): { amount: number; label: string } => {
    const o = orderMap.get(r.orderId)
    const t = o ? orderTotals(o, skuMap) : null
    if (r.flags.includes('anulada_con_entregas')) {
      return { amount: r.deliveredCOP, label: 'entregado' }
    }
    if (r.flags.includes('pendiente_vencida')) {
      return { amount: r.pendingCOP, label: 'sin entregar' }
    }
    return { amount: t?.totalCOP ?? 0, label: 'por facturar' }
  }

  return (
    <Section
      flush
      title='Para revisar'
      action={
        sorted.length > 0 ? (
          <StatusPill tone={sorted.some(isCritical) ? 'danger' : 'warning'}>
            {sorted.length} {sorted.length === 1 ? 'caso' : 'casos'}
          </StatusPill>
        ) : undefined
      }
    >
      {sorted.length === 0 ? (
        <div className='flex flex-col items-center gap-2 px-4 py-10 text-center'>
          <div className='flex size-10 items-center justify-center rounded-full bg-success-soft text-success-ink'>
            <CheckCircle2 className='size-5' />
          </div>
          <p className='max-w-sm text-sm font-medium'>
            Todo cuadra: lo facturado coincide con lo entregado.
          </p>
          <p className='max-w-sm text-sm text-muted-foreground'>
            No hay facturas anuladas con mercancía entregada ni facturas sin
            retirar hace más de {PICKUP_OVERDUE_DAYS} días.
          </p>
        </div>
      ) : (
        <ul className='divide-y'>
          {sorted.map((r) => {
            const critical = isCritical(r)
            const main = FLAG_PILL[r.flags[0]]
            const { amount, label } = valueOf(r)
            return (
              <li
                key={r.orderId}
                className={
                  critical
                    ? 'flex items-start gap-3 bg-danger-soft/50 px-4 py-3.5 sm:px-5'
                    : 'flex items-start gap-3 px-4 py-3.5 sm:px-5'
                }
              >
                <div className='min-w-0 flex-1 space-y-1'>
                  <div className='flex flex-wrap items-center gap-x-2 gap-y-1'>
                    <StatusPill tone={main.tone}>{main.label}</StatusPill>
                    <span className='font-semibold tabular-nums'>
                      {r.invoiceNumber ?? r.orderId}
                    </span>
                    <span className='text-sm text-muted-foreground'>
                      {ageText(r.ageDays)}
                    </span>
                  </div>
                  <div className='text-sm'>{r.customer}</div>
                  <div className='text-sm'>
                    {r.flags.map((f) => RECON_FLAG_LABEL[f]).join('. ')}
                  </div>
                </div>
                <div className='shrink-0 text-end'>
                  <div className='font-semibold tabular-nums'>
                    {cop(amount)}
                  </div>
                  <div className='text-sm text-muted-foreground'>{label}</div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </Section>
  )
}

/* -------------------------------------------------------------------------- */
/*  Por día                                                                    */
/* -------------------------------------------------------------------------- */

function DayBar({
  tone,
  value,
  max,
}: {
  tone: Tone
  value: number
  max: number
}) {
  return (
    <div className='flex items-center gap-3'>
      <ProgressBar
        value={max > 0 ? (value / max) * 100 : 0}
        tone={tone}
        className='h-2.5 flex-1'
      />
      <span className='w-28 shrink-0 text-end text-sm tabular-nums'>
        {value > 0 ? cop(value) : '—'}
      </span>
    </div>
  )
}

function DailySection({ days }: { days: ReconDay[] }) {
  const limit = addDays(TODAY_STR, -6)
  const shown = days.filter((d) => d.date >= limit)
  const max = Math.max(
    0,
    ...shown.map((d) => Math.max(d.invoicedCOP, d.deliveredCOP))
  )

  if (shown.length === 0) return null

  return (
    <Section
      title='Por día'
      action={
        <div className='flex items-center gap-4 text-sm text-muted-foreground'>
          <span className='flex items-center gap-1.5'>
            <span className='size-2 rounded-full bg-info' />
            Facturado
          </span>
          <span className='flex items-center gap-1.5'>
            <span className='size-2 rounded-full bg-success' />
            Entregado
          </span>
        </div>
      }
    >
      <ul className='divide-y'>
        {shown.map((d) => (
          <li
            key={d.date}
            className='flex flex-col gap-1.5 py-3 first:pt-0 last:pb-0 sm:grid sm:grid-cols-[5.5rem_1fr] sm:items-center sm:gap-x-3'
          >
            <span className='text-sm font-medium'>
              {d.date === TODAY_STR ? 'Hoy' : shortDate(d.date)}
            </span>
            <div className='space-y-1.5'>
              <DayBar tone='info' value={d.invoicedCOP} max={max} />
              <DayBar tone='success' value={d.deliveredCOP} max={max} />
            </div>
          </li>
        ))}
      </ul>
    </Section>
  )
}

/* -------------------------------------------------------------------------- */
/*  Detalle de facturas                                                        */
/* -------------------------------------------------------------------------- */

const MAX_ROWS = 100

function InvoicesDetail({ rows }: { rows: ReconRow[] }) {
  const [status, setStatus] = useState<ReconStatus | 'todas'>('todas')

  const counts = (s: ReconStatus) => rows.filter((r) => r.status === s).length
  const visible = (
    status === 'todas' ? rows : rows.filter((r) => r.status === status)
  ).slice(0, MAX_ROWS)

  const options = [
    { id: 'todas' as const, label: 'Todas', count: rows.length },
    ...STATUSES.filter((s) => counts(s) > 0).map((s) => ({
      id: s,
      label: s,
      count: counts(s),
    })),
  ]

  const money = (r: ReconRow, v: number) =>
    v === 0 && (r.status === 'Anulada' || r.status === 'Sin facturar')
      ? '—'
      : cop(v)

  return (
    <details className='group rounded-xl border bg-card'>
      <summary className='flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-base font-semibold sm:px-5 [&::-webkit-details-marker]:hidden'>
        <span>Ver todas las facturas ({rows.length})</span>
        <ChevronRight className='size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90' />
      </summary>
      <div className='space-y-3 border-t py-3'>
        <div className='px-4 sm:px-5'>
          <FilterTabs value={status} onChange={setStatus} options={options} />
        </div>

        {visible.length === 0 ? (
          <p className='px-4 py-6 text-center text-sm text-muted-foreground sm:px-5'>
            No hay facturas en este periodo.
          </p>
        ) : (
          <>
            <table className='hidden w-full text-sm sm:table'>
              <thead>
                <tr className='border-y text-start text-muted-foreground'>
                  <th className='px-5 py-2 text-start font-medium'>Factura</th>
                  <th className='py-2 text-start font-medium'>Cliente</th>
                  <th className='py-2 text-end font-medium'>Facturado</th>
                  <th className='py-2 text-end font-medium'>Entregado</th>
                  <th className='px-5 py-2 text-start font-medium'>Estado</th>
                </tr>
              </thead>
              <tbody className='divide-y'>
                {visible.map((r) => (
                  <tr key={r.orderId}>
                    <td className='px-5 py-3 font-semibold whitespace-nowrap tabular-nums'>
                      {r.invoiceNumber ?? r.orderId}
                    </td>
                    <td className='max-w-64 truncate py-3 pe-3'>
                      {r.customer}
                    </td>
                    <td className='py-3 text-end whitespace-nowrap tabular-nums'>
                      {money(r, r.invoicedCOP)}
                    </td>
                    <td className='py-3 text-end whitespace-nowrap tabular-nums'>
                      {money(r, r.deliveredCOP)}
                    </td>
                    <td className='px-5 py-3'>
                      <StatusPill tone={statusTone(r)}>{r.status}</StatusPill>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <ul className='divide-y border-t sm:hidden'>
              {visible.map((r) => (
                <li key={r.orderId} className='space-y-1 px-4 py-3'>
                  <div className='flex items-center justify-between gap-2'>
                    <span className='font-semibold tabular-nums'>
                      {r.invoiceNumber ?? r.orderId}
                    </span>
                    <StatusPill tone={statusTone(r)}>{r.status}</StatusPill>
                  </div>
                  <div className='truncate text-sm'>{r.customer}</div>
                  <div className='text-sm text-muted-foreground tabular-nums'>
                    Facturado {money(r, r.invoicedCOP)} · Entregado{' '}
                    {money(r, r.deliveredCOP)}
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}

        {rows.length > MAX_ROWS && status === 'todas' && (
          <p className='px-4 text-sm text-muted-foreground sm:px-5'>
            Se muestran las primeras {MAX_ROWS}. Descarga el CSV para ver todas.
          </p>
        )}
      </div>
    </details>
  )
}
