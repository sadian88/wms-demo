import { useState } from 'react'
import {
  CheckCircle2,
  EyeOff,
  FileImage,
  ShieldAlert,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useWms } from '@/context/wms-provider'
import { ThresholdApprovalFlow } from '@/features/wms/components/visual/visual-flow'
import {
  APPROVAL_THRESHOLD_COP,
  needsHigherApproval,
} from '@/features/wms/domain/inventory'
import { EmptyState, KpiCard, PageHeader, cop, nf } from './ui-helpers'

const DAMAGE_REASONS = [
  'Rotura en movimiento interno',
  'Cajas aplastadas en estiba',
  'Humedad o filtración en bodega',
  'Defecto detectado al abrir pallet',
]

// 5.1 Daños y mermas
export function DamagesScreen() {
  const {
    role,
    partidas,
    damages,
    buckets,
    matchesScope,
    canApproveAmount,
    reportDamage,
    resolveDamage,
  } = useWms()

  const availPartidas = partidas.filter(
    (p) => matchesScope(p.warehouse) && p.qty.disponible > 0
  )
  const [partidaId, setPartidaId] = useState(availPartidas[0]?.id ?? '')
  const [qty, setQty] = useState('4')
  const [reason, setReason] = useState(DAMAGE_REASONS[0])
  const [evidence, setEvidence] = useState('')
  const [claimable, setClaimable] = useState(false)

  const list = damages.filter((d) => matchesScope(d.warehouse))
  const canReport = role === 'ADM' || role === 'JB' || role === 'OPE'
  const canManageClaim = role === 'ADM' || role === 'JB'

  return (
    <div className='space-y-6'>
      <PageHeader
        title='Daños y mermas'
        subtitle={`Registro de roturas físicas y aprobación dual según umbral de ${cop(APPROVAL_THRESHOLD_COP)} COP.`}
      />

      {/* Diagrama Visual de Bifurcación $1.200.000 COP */}
      <ThresholdApprovalFlow />

      {/* KPI Cards */}
      <div className='grid grid-cols-2 gap-3 lg:grid-cols-3'>
        <KpiCard
          label='Unidades en estado Dañado'
          value={`${nf(buckets.danada.units)} uds`}
          sub={cop(buckets.danada.valueCOP ?? buckets.danada.valueUSD)}
          tone={buckets.danada.units > 0 ? 'text-destructive' : undefined}
        />
        <KpiCard
          label='Reportes pendientes de decisión'
          value={String(buckets.danada.pendingReportsCount)}
          sub='Esperan firma de baja o reclamo'
        />
        <KpiCard
          label='Regla de autorización dual'
          value={`Umbral ${cop(APPROVAL_THRESHOLD_COP)}`}
          sub='≤ $ 1.200.000 JB directo | > $ 1.200.000 GER'
        />
      </div>

      {/* Formulario de reporte */}
      {canReport && (
        <form
          className='space-y-4 rounded-xl border bg-card p-5 shadow-xs'
          onSubmit={(e) => {
            e.preventDefault()
            const q = Number(qty)
            if (!partidaId || !Number.isInteger(q) || q <= 0 || evidence.trim().length < 3)
              return
            reportDamage({
              partidaId,
              qty: q,
              reason,
              evidence: evidence.trim(),
              claimableToSupplier: claimable,
            })
            setEvidence('')
          }}
        >
          <div className='flex items-center gap-2 border-b pb-2'>
            <ShieldAlert className='size-4 text-rose-600' />
            <h3 className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
              Reportar Mercadería Dañada
            </h3>
          </div>

          <div className='grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4'>
            <div className='space-y-1'>
              <label className='text-xs font-medium'>Partida con stock</label>
              <select
                required
                className='h-8 w-full rounded-md border bg-background px-2 text-xs'
                value={partidaId}
                onChange={(e) => setPartidaId(e.target.value)}
              >
                <option value=''>Seleccionar…</option>
                {availPartidas.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.id} · {p.sku} (Disp: {p.qty.disponible} en {p.warehouse})
                  </option>
                ))}
              </select>
            </div>

            <div className='space-y-1'>
              <label className='text-xs font-medium'>Unidades dañadas</label>
              <Input
                type='number'
                min={1}
                className='h-8 text-xs font-bold'
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                required
              />
            </div>

            <div className='space-y-1'>
              <label className='text-xs font-medium'>Causa / Motivo</label>
              <select
                className='h-8 w-full rounded-md border bg-background px-2 text-xs'
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              >
                {DAMAGE_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div className='space-y-1'>
              <label className='text-xs font-medium'>Evidencia (foto o acta)</label>
              <Input
                className='h-8 text-xs'
                placeholder='Ej: Foto patio #12'
                value={evidence}
                onChange={(e) => setEvidence(e.target.value)}
                required
              />
            </div>
          </div>

          <div className='flex flex-wrap items-center justify-between gap-3 border-t pt-3'>
            <label className='flex cursor-pointer items-center gap-1.5 text-xs select-none'>
              <input
                type='checkbox'
                checked={claimable}
                onChange={(e) => setClaimable(e.target.checked)}
                className='rounded'
              />
              <span>Atribuible a proveedor (Abrir reclamo de garantía)</span>
            </label>

            <Button
              size='sm'
              type='submit'
              disabled={!partidaId || evidence.trim().length < 3}
              className='text-xs'
            >
              Registrar daño
            </Button>
          </div>
        </form>
      )}

      {/* Lista de daños */}
      <div className='space-y-3'>
        {list.length === 0 && (
          <EmptyState text='No hay daños registrados en la bodega seleccionada.' />
        )}
        {list.map((d) => {
          const dVal = d.valueCOP ?? d.valueUSD
          const highValue = needsHigherApproval(dVal)
          const allowedApprove = canApproveAmount(dVal)
          const approveTooltip = allowedApprove
            ? undefined
            : highValue
              ? `Monto > ${cop(APPROVAL_THRESHOLD_COP)}: requiere aprobación de Gerencia (GER) o Administrador`
              : `Monto ≤ ${cop(APPROVAL_THRESHOLD_COP)}: aprueba Jefe de Bodega (JB) o Administrador`

          return (
            <div
              key={d.id}
              className={`rounded-xl border bg-card p-4 shadow-xs transition-all hover:border-primary/40 space-y-3 ${
                highValue ? 'border-rose-300 dark:border-rose-900 ring-1 ring-rose-500/20' : ''
              }`}
            >
              <div className='flex flex-wrap items-center justify-between gap-2 border-b pb-2.5'>
                <div className='flex items-center gap-2'>
                  <span className='font-mono text-xs font-bold text-foreground'>
                    {d.id}
                  </span>
                  <span className='text-xs font-medium text-primary'>
                    {d.warehouse} · Partida: {d.partidaId}
                  </span>
                  {d.claimableToSupplier && (
                    <Badge variant='outline' className='text-[10px] py-0 border-blue-300 text-blue-600'>
                      Origen proveedor
                    </Badge>
                  )}
                  {highValue ? (
                    <Badge variant='destructive' className='text-[10px] py-0'>
                      &gt; {cop(APPROVAL_THRESHOLD_COP)} · Requiere Gerencia
                    </Badge>
                  ) : (
                    <Badge variant='secondary' className='text-[10px] py-0'>
                      ≤ {cop(APPROVAL_THRESHOLD_COP)} · Firma JB
                    </Badge>
                  )}
                </div>

                <Badge
                  variant={
                    d.status === 'Pendiente'
                      ? 'outline'
                      : d.status === 'Baja aprobada'
                        ? 'destructive'
                        : 'secondary'
                  }
                  className='text-xs'
                >
                  {d.status}
                </Badge>
              </div>

              <div className='grid grid-cols-1 sm:grid-cols-12 gap-3 items-center'>
                <div className='sm:col-span-7 space-y-1'>
                  <div className='text-xs font-semibold text-foreground'>
                    {d.sku} · {d.reason}
                  </div>
                  <div className='flex items-center gap-2 text-xs text-muted-foreground'>
                    <span className='flex items-center gap-1'>
                      <FileImage className='size-3.5 text-muted-foreground' /> Evidencia: {d.evidence}
                    </span>
                    <span>· Reportó: {d.reportedBy}</span>
                  </div>
                </div>

                <div className='sm:col-span-5 flex flex-wrap items-center justify-between sm:justify-end gap-3'>
                  <div className='text-end'>
                    <span className='text-sm font-bold tabular-nums text-rose-600 dark:text-rose-400'>
                      {nf(d.qty)} uds
                    </span>
                    <span className='block text-xs font-semibold tabular-nums text-muted-foreground'>
                      {cop(dVal)}
                    </span>
                  </div>

                  {d.status === 'Pendiente' && (
                    <div className='flex items-center gap-1.5'>
                      <Button
                        size='sm'
                        variant='destructive'
                        className='h-7 text-xs px-2.5'
                        disabled={!allowedApprove}
                        title={approveTooltip}
                        onClick={() => resolveDamage(d.id, 'Baja aprobada')}
                      >
                        Aprobar baja
                      </Button>
                      {canManageClaim && (
                        <>
                          <Button
                            size='sm'
                            variant='outline'
                            className='h-7 text-xs px-2.5'
                            onClick={() =>
                              resolveDamage(d.id, 'Enviado a reclamo')
                            }
                          >
                            A reclamo
                          </Button>
                          <Button
                            size='sm'
                            variant='ghost'
                            className='h-7 text-xs px-2'
                            onClick={() => resolveDamage(d.id, 'Rechazado')}
                          >
                            Reintegrar
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// 5.2 Conteos de inventario (Ciego)
export function CountsScreen({
  onGoToAdjustments,
}: {
  onGoToAdjustments: () => void
}) {
  const {
    role,
    partidas,
    counts,
    matchesScope,
    isReadOnly,
    scheduleCount,
    submitCount,
  } = useWms()

  const scopedPartidas = partidas.filter((p) => matchesScope(p.warehouse))
  const [partidaId, setPartidaId] = useState(scopedPartidas[0]?.id ?? '')
  const [inputs, setInputs] = useState<Record<string, string>>({})

  const canSchedule = role === 'ADM' || role === 'JB'
  const list = counts.filter((c) => matchesScope(c.warehouse))

  return (
    <div className='space-y-6'>
      <PageHeader
        title='Conteos de inventario (Captura ciega)'
        subtitle='El operario audita físicamente sin conocer el stock del sistema. Las discrepancias generan un ajuste formal para aprobación dual.'
      />

      {canSchedule && (
        <form
          className='flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4 shadow-xs'
          onSubmit={(e) => {
            e.preventDefault()
            const p = scopedPartidas.find((x) => x.id === partidaId)
            if (!p) return
            scheduleCount(p.warehouse, p.id)
          }}
        >
          <div className='space-y-1'>
            <label className='text-xs font-medium'>
              Programar auditoría para partida
            </label>
            <select
              className='h-8 w-80 rounded-md border bg-background px-2.5 text-xs'
              value={partidaId}
              onChange={(e) => setPartidaId(e.target.value)}
            >
              {scopedPartidas.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.id} · {p.sku} ({p.warehouse})
                </option>
              ))}
            </select>
          </div>
          <Button size='sm' type='submit' className='h-8 text-xs'>
            Programar conteo ciego
          </Button>
        </form>
      )}

      {/* Lista de sesiones de conteo con feedback visual */}
      <div className='space-y-3'>
        {list.length === 0 && (
          <EmptyState text='No hay sesiones de conteo para la bodega seleccionada.' />
        )}
        {list.map((c) => {
          const isPending = c.status === 'Programado'
          const val = inputs[c.id] ?? ''
          const delta = (c.countedQty ?? 0) - c.expectedQty

          return (
            <div
              key={c.id}
              className='rounded-xl border bg-card p-4 shadow-xs transition-all hover:border-primary/40 space-y-3'
            >
              <div className='flex items-center justify-between border-b pb-2'>
                <div className='flex items-center gap-2'>
                  <span className='font-mono text-xs font-bold text-foreground'>
                    {c.id}
                  </span>
                  <span className='text-xs text-primary font-medium'>
                    {c.warehouse} · Partida: {c.partidaId}
                  </span>
                </div>
                <div className='text-[11px] text-muted-foreground'>
                  Programado: {c.scheduledAt}
                </div>
              </div>

              <div className='grid grid-cols-1 sm:grid-cols-12 gap-3 items-center'>
                <div className='sm:col-span-5'>
                  <div className='text-xs font-semibold text-foreground'>{c.sku}</div>
                </div>

                <div className='sm:col-span-4'>
                  {isPending ? (
                    <div className='flex items-center gap-2 text-xs text-muted-foreground'>
                      <div className='flex size-6 items-center justify-center rounded-md bg-muted text-muted-foreground'>
                        <EyeOff className='size-3.5' />
                      </div>
                      <span>Stock teórico oculto (Conteo ciego estricto)</span>
                    </div>
                  ) : (
                    <div className='text-xs space-y-0.5'>
                      <div className='text-muted-foreground'>
                        Teórico: <strong className='text-foreground'>{nf(c.expectedQty)}</strong> | Contado:{' '}
                        <strong className='text-foreground'>{nf(c.countedQty ?? 0)}</strong>
                      </div>
                      <div
                        className={`font-semibold ${
                          delta === 0
                            ? 'text-emerald-600'
                            : delta < 0
                              ? 'text-rose-600'
                              : 'text-amber-600'
                        }`}
                      >
                        {delta === 0
                          ? '✓ Conteo 100% exacto'
                          : `Discrepancia: ${delta > 0 ? `+${delta}` : delta} uds`}
                      </div>
                    </div>
                  )}
                </div>

                <div className='sm:col-span-3 flex items-center justify-end gap-2'>
                  {isPending && !isReadOnly ? (
                    <>
                      <Input
                        type='number'
                        min={0}
                        placeholder='Cantidad'
                        className='h-8 w-24 text-xs font-bold text-center'
                        value={val}
                        onChange={(e) =>
                          setInputs((prev) => ({
                            ...prev,
                            [c.id]: e.target.value,
                          }))
                        }
                      />
                      <Button
                        size='sm'
                        className='h-8 text-xs px-3 bg-emerald-600 hover:bg-emerald-700 text-white'
                        disabled={val.trim() === '' || Number(val) < 0}
                        onClick={() =>
                          submitCount(c.id, Math.floor(Number(val)))
                        }
                      >
                        <CheckCircle2 className='mr-1 size-3.5' />
                        Validar
                      </Button>
                    </>
                  ) : (
                    <>
                      <Badge
                        variant={
                          c.status === 'Ajuste generado'
                            ? 'destructive'
                            : 'secondary'
                        }
                        className='text-xs'
                      >
                        {c.status}
                      </Badge>
                      {c.status === 'Ajuste generado' && (
                        <Button
                          size='sm'
                          variant='outline'
                          className='h-7 text-xs px-2.5'
                          onClick={onGoToAdjustments}
                        >
                          Ver ajuste
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// 5.3 Ajustes y aprobaciones
export function AdjustmentsScreen() {
  const { adjustments, buckets, matchesScope, canApproveAmount, resolveAdjustment } =
    useWms()

  const list = adjustments.filter((a) => matchesScope(a.warehouse))

  return (
    <div className='space-y-6'>
      <PageHeader
        title='Ajustes de inventario y aprobaciones'
        subtitle={`Los faltantes aprobados se registran como pérdida confirmada. Montos sobre ${cop(APPROVAL_THRESHOLD_COP)} requieren firma de Gerencia.`}
      />

      <div className='grid grid-cols-2 gap-3 lg:grid-cols-3'>
        <KpiCard
          label='Ajustes pendientes de firma'
          value={String(buckets.perdidaMes.pendingAdjustmentsCount)}
          sub='Generados por arqueos o conteos'
        />
        <KpiCard
          label='Pérdida confirmada del mes'
          value={`${nf(buckets.perdidaMes.units)} uds`}
          sub={cop(buckets.perdidaMes.valueCOP ?? buckets.perdidaMes.valueUSD)}
          tone={buckets.perdidaMes.units > 0 ? 'text-destructive' : undefined}
        />
        <KpiCard
          label='Regla de autorización dual'
          value={`Umbral ${cop(APPROVAL_THRESHOLD_COP)}`}
          sub='≤ $ 1.200.000 JB directo | > $ 1.200.000 GER'
        />
      </div>

      <div className='space-y-3'>
        {list.length === 0 && (
          <EmptyState text='No hay ajustes registrados en las bodegas activas.' />
        )}
        {list.map((a) => {
          const aVal = a.valueCOP ?? a.valueUSD
          const highValue = needsHigherApproval(aVal)
          const allowed = canApproveAmount(aVal)
          const tooltip = allowed
            ? undefined
            : highValue
              ? `Monto > ${cop(APPROVAL_THRESHOLD_COP)}: requiere aprobación de Gerencia (GER) o Administrador`
              : `Monto ≤ ${cop(APPROVAL_THRESHOLD_COP)}: aprueba Jefe de Bodega (JB) o Administrador`

          return (
            <div
              key={a.id}
              className={`rounded-xl border bg-card p-4 shadow-xs transition-all hover:border-primary/40 space-y-3 ${
                highValue ? 'border-rose-300 dark:border-rose-900 ring-1 ring-rose-500/20' : ''
              }`}
            >
              <div className='flex flex-wrap items-center justify-between gap-2 border-b pb-2.5'>
                <div className='flex items-center gap-2'>
                  <span className='font-mono text-xs font-bold text-foreground'>
                    {a.id}
                  </span>
                  <span className='text-xs font-medium text-primary'>
                    {a.warehouse} · Partida: {a.partidaId}
                  </span>
                  {highValue ? (
                    <Badge variant='destructive' className='text-[10px] py-0'>
                      &gt; {cop(APPROVAL_THRESHOLD_COP)} · Firma Gerencia
                    </Badge>
                  ) : (
                    <Badge variant='secondary' className='text-[10px] py-0'>
                      ≤ {cop(APPROVAL_THRESHOLD_COP)} · Firma JB
                    </Badge>
                  )}
                </div>

                <Badge
                  variant={
                    a.status === 'Pendiente'
                      ? 'outline'
                      : a.status === 'Aprobado'
                        ? 'secondary'
                        : 'destructive'
                  }
                  className='text-xs'
                >
                  {a.status}
                </Badge>
              </div>

              <div className='grid grid-cols-1 sm:grid-cols-12 gap-3 items-center'>
                <div className='sm:col-span-6 space-y-1'>
                  <div className='text-xs font-semibold text-foreground'>
                    {a.sku} · {a.reason}
                  </div>
                  <div className='text-[11px] text-muted-foreground'>
                    Evidencia: {a.evidence} · Solicitó: {a.requestedBy}
                  </div>
                </div>

                <div className='sm:col-span-6 flex flex-wrap items-center justify-between sm:justify-end gap-3'>
                  <div className='text-end'>
                    <div
                      className={`text-sm font-bold tabular-nums ${
                        a.qtyDelta < 0 ? 'text-destructive' : 'text-emerald-600'
                      }`}
                    >
                      {a.qtyDelta > 0 ? `+${nf(a.qtyDelta)}` : nf(a.qtyDelta)} uds
                    </div>
                    <div className='text-xs font-semibold tabular-nums text-muted-foreground'>
                      {cop(aVal)}
                    </div>
                  </div>

                  {a.status === 'Pendiente' && (
                    <div className='flex items-center gap-1.5'>
                      <Button
                        size='sm'
                        className='h-7 text-xs px-3'
                        disabled={!allowed}
                        title={tooltip}
                        onClick={() => resolveAdjustment(a.id, true)}
                      >
                        Aprobar ajuste
                      </Button>
                      <Button
                        size='sm'
                        variant='outline'
                        className='h-7 text-xs px-2.5'
                        disabled={!allowed}
                        title={tooltip}
                        onClick={() => resolveAdjustment(a.id, false)}
                      >
                        Rechazar
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
