import { useState } from 'react'
import { Lock, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useWms } from '@/context/wms-provider'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  ItemPicker,
  QtyStepper,
  unitQty,
  unitWord,
} from '@/features/wms/components/flow-bits'
import {
  FilterTabs,
  ListRow,
  PhotoCapture,
  PhotoStrip,
  Section,
  StatStrip,
  StatusPill,
  TONE,
  type Tone,
} from '@/features/wms/components/kit'
import { TODAY_STR } from '@/features/wms/domain/clock'
import {
  APPROVAL_THRESHOLD_COP,
  needsHigherApproval,
  type DamageReport,
  type SkuItem,
} from '@/features/wms/domain/inventory'
import { EmptyState, PageHeader, cop, nf, shortDate } from './ui-helpers'

const DAMAGE_REASONS = [
  'Caída en descarga',
  'Humedad',
  'Aplastado en estiba',
  'Golpe con montacargas',
]
const OTHER_REASON = 'Otro'

/** Texto para quien no puede aprobar un monto: dice quién sí puede. */
function ApprovalNote({ valueCOP }: { valueCOP: number }) {
  return (
    <p
      className={cn(
        'mt-3 flex items-start gap-2 text-sm font-medium',
        TONE.warning.text
      )}
    >
      <Lock className='mt-0.5 size-4 shrink-0' />
      {needsHigherApproval(valueCOP)
        ? `Requiere aprobación de Gerencia (supera ${cop(APPROVAL_THRESHOLD_COP)})`
        : 'Requiere aprobación del Jefe de Bodega'}
    </p>
  )
}

const THRESHOLD_NOTE = `Hasta ${cop(APPROVAL_THRESHOLD_COP)} aprueba el Jefe de Bodega; por encima, Gerencia.`

function RowTitle({ sku, code }: { sku?: SkuItem; code: string }) {
  return (
    <div className='line-clamp-2 text-sm font-medium'>{sku?.name ?? code}</div>
  )
}

/* -------------------------------------------------------------------------- */
/*  5.1 Daños y mermas                                                         */
/* -------------------------------------------------------------------------- */

const DAMAGE_TONE: Record<DamageReport['status'], Tone> = {
  Pendiente: 'warning',
  'Baja aprobada': 'danger',
  'Enviado a reclamo': 'info',
  Rechazado: 'neutral',
}

export function DamagesScreen() {
  const { role, skus, damages, matchesScope, canApproveAmount, resolveDamage } =
    useWms()
  const [tab, setTab] = useState<'pending' | 'done'>('pending')
  const [reporting, setReporting] = useState(false)

  const canReport = role === 'ADM' || role === 'JB' || role === 'OPE'
  const list = damages
    .filter((d) => matchesScope(d.warehouse))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const valueOf = (d: DamageReport) => d.valueCOP ?? d.valueUSD
  const pending = list.filter((d) => d.status === 'Pendiente')
  const resolved = list.filter((d) => d.status !== 'Pendiente')
  const approvedMonth = list.filter(
    (d) =>
      d.status === 'Baja aprobada' &&
      d.createdAt.startsWith(TODAY_STR.slice(0, 7))
  )
  const sum = (rows: DamageReport[]) =>
    rows.reduce((acc, d) => acc + valueOf(d), 0)
  const shown = tab === 'pending' ? pending : resolved

  return (
    <div className='space-y-5'>
      <PageHeader
        title='Daños y mermas'
        actions={
          canReport && (
            <Button className='h-11' onClick={() => setReporting(true)}>
              <Plus className='size-4' />
              Reportar daño
            </Button>
          )
        }
      />

      <StatStrip
        items={[
          {
            label: 'Pendientes de decisión',
            value: String(pending.length),
            tone: pending.length > 0 ? 'warning' : undefined,
          },
          {
            label: 'Valor pendiente',
            value: cop(sum(pending)),
          },
          {
            label: 'Aprobados este mes',
            value: String(approvedMonth.length),
            hint:
              approvedMonth.length > 0 ? cop(sum(approvedMonth)) : undefined,
          },
        ]}
      />

      <div className='space-y-2'>
        <FilterTabs
          value={tab}
          onChange={setTab}
          options={[
            { id: 'pending', label: 'Pendientes', count: pending.length },
            { id: 'done', label: 'Resueltos', count: resolved.length },
          ]}
        />
        <p className='text-sm text-muted-foreground'>{THRESHOLD_NOTE}</p>
      </div>

      <Section flush>
        {shown.length === 0 ? (
          <EmptyState
            title={
              tab === 'pending'
                ? 'No hay daños por decidir'
                : 'Aún no hay daños resueltos'
            }
            text={
              tab === 'pending'
                ? canReport
                  ? 'Cuando encuentres mercancía rota o averiada, usa «Reportar daño» con fotos.'
                  : 'Los reportes de daño de las bodegas seleccionadas aparecerán aquí.'
                : 'Las bajas aprobadas, reclamos y rechazos quedan en este historial.'
            }
          />
        ) : (
          <div className='divide-y'>
            {shown.map((d) => {
              const sku = skus.find((s) => s.sku === d.sku)
              const value = valueOf(d)
              const can = canApproveAmount(value)
              return (
                <ListRow
                  key={d.id}
                  className='items-start'
                  trailing={
                    <div className='text-end'>
                      <div className='text-sm font-semibold tabular-nums'>
                        {unitQty(d.qty, sku)}
                      </div>
                      <div className='text-sm text-muted-foreground tabular-nums'>
                        {cop(value)}
                      </div>
                    </div>
                  }
                >
                  <RowTitle sku={sku} code={d.sku} />
                  <div className='text-sm'>{d.reason}</div>
                  <div className='mt-0.5 text-sm text-muted-foreground'>
                    Reportó {d.reportedBy} · {shortDate(d.createdAt)} ·{' '}
                    {d.warehouse}
                  </div>
                  {d.photos && d.photos.length > 0 ? (
                    <div className='mt-2'>
                      <PhotoStrip photos={d.photos} size='sm' />
                    </div>
                  ) : (
                    d.evidence && (
                      <div className='mt-0.5 text-sm text-muted-foreground'>
                        {d.evidence}
                      </div>
                    )
                  )}
                  <div className='mt-2 flex flex-wrap items-center gap-2'>
                    <StatusPill tone={DAMAGE_TONE[d.status]}>
                      {d.status}
                    </StatusPill>
                    {d.claimableToSupplier && (
                      <StatusPill tone='neutral'>
                        Reclamable al proveedor
                      </StatusPill>
                    )}
                    {d.resolvedBy && (
                      <span className='text-sm text-muted-foreground'>
                        por {d.resolvedBy}
                      </span>
                    )}
                  </div>
                  {d.status === 'Pendiente' &&
                    (can ? (
                      <div className='mt-3 flex flex-wrap gap-2'>
                        <Button
                          className='h-11 flex-1 sm:flex-none'
                          onClick={() => resolveDamage(d.id, 'Baja aprobada')}
                        >
                          Aprobar baja
                        </Button>
                        {d.claimableToSupplier && (
                          <Button
                            variant='outline'
                            className='h-11 flex-1 sm:flex-none'
                            onClick={() =>
                              resolveDamage(d.id, 'Enviado a reclamo')
                            }
                          >
                            Enviar a reclamo
                          </Button>
                        )}
                        <Button
                          variant='outline'
                          className='h-11 flex-1 sm:flex-none'
                          title='Devuelve las unidades a Disponible'
                          onClick={() => resolveDamage(d.id, 'Rechazado')}
                        >
                          Rechazar
                        </Button>
                      </div>
                    ) : (
                      <ApprovalNote valueCOP={value} />
                    ))}
                </ListRow>
              )
            })}
          </div>
        )}
      </Section>

      {canReport && (
        <ReportDamageDialog open={reporting} onOpenChange={setReporting} />
      )}
    </div>
  )
}

function ReportDamageDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const { skus, partidas, warehouses, matchesScope, reportDamage } = useWms()
  const [partidaId, setPartidaId] = useState('')
  const [qty, setQty] = useState(1)
  const [reasonChip, setReasonChip] = useState('')
  const [other, setOther] = useState('')
  const [photos, setPhotos] = useState<string[]>([])
  const [note, setNote] = useState('')
  const [claimable, setClaimable] = useState(false)

  const avail = partidas.filter(
    (p) => matchesScope(p.warehouse) && p.qty.disponible > 0
  )
  const partida = avail.find((p) => p.id === partidaId)
  const sku = skus.find((s) => s.sku === partida?.sku)
  const max = partida?.qty.disponible ?? 0
  const reason = reasonChip === OTHER_REASON ? other.trim() : reasonChip
  const estimated = (sku?.unitCost ?? 0) * qty

  const lacking: string[] = []
  if (!partida) lacking.push('el producto')
  else if (qty < 1) lacking.push('la cantidad')
  if (reason.length < 3) lacking.push('el motivo')
  if (photos.length === 0) lacking.push('al menos una foto')
  const valid = lacking.length === 0

  const reset = () => {
    setPartidaId('')
    setQty(1)
    setReasonChip('')
    setOther('')
    setPhotos([])
    setNote('')
    setClaimable(false)
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!valid || !partida) return
    reportDamage({
      partidaId: partida.id,
      qty,
      reason,
      evidence: note.trim() || `Con ${photos.length} foto(s)`,
      claimableToSupplier: claimable,
      photos,
    })
    reset()
    onOpenChange(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset()
        onOpenChange(o)
      }}
    >
      <DialogContent
        aria-describedby={undefined}
        className='max-h-[92dvh] overflow-y-auto sm:max-w-xl [&>*]:min-w-0'
      >
        <DialogHeader>
          <DialogTitle>Reportar daño</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className='space-y-5'>
          <ItemPicker
            label='Producto y partida'
            required
            value={partidaId}
            onChange={(id) => {
              setPartidaId(id)
              setQty(1)
            }}
            items={avail.map((p) => {
              const s = skus.find((x) => x.sku === p.sku)
              const whName =
                warehouses.find((w) => w.id === p.warehouse)?.name ??
                p.warehouse
              return {
                id: p.id,
                title: s?.name ?? p.sku,
                meta: `${p.id} · ${whName} · Disponible: ${unitQty(p.qty.disponible, s)}`,
                category: s?.category,
              }
            })}
          />

          {partida && (
            <QtyStepper
              id='dmg-qty'
              label={`Cantidad dañada (máximo ${nf(max)})`}
              value={qty}
              onChange={setQty}
              max={max}
              tone='danger'
              hint={unitQty(qty, sku)}
            />
          )}

          <div className='space-y-1.5'>
            <span id='dmg-reason-label' className='block text-sm font-medium'>
              Motivo<span className='text-danger'> *</span>
            </span>
            <div
              role='radiogroup'
              aria-labelledby='dmg-reason-label'
              className='flex flex-wrap gap-2'
            >
              {[...DAMAGE_REASONS, OTHER_REASON].map((r) => {
                const active = reasonChip === r
                return (
                  <button
                    key={r}
                    type='button'
                    role='radio'
                    aria-checked={active}
                    onClick={() => setReasonChip(r)}
                    className={cn(
                      'h-11 rounded-full border px-4 text-sm font-medium transition-colors',
                      active
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'bg-card text-muted-foreground hover:bg-accent hover:text-foreground'
                    )}
                  >
                    {r}
                  </button>
                )
              })}
            </div>
            {reasonChip === OTHER_REASON && (
              <Input
                className='h-11'
                value={other}
                onChange={(e) => setOther(e.target.value)}
                placeholder='Cuéntanos qué pasó'
                aria-label='Describe el motivo'
                autoFocus
              />
            )}
          </div>

          <div className='space-y-1.5'>
            <span className='block text-sm font-medium'>
              Fotos del daño<span className='text-danger'> *</span>
            </span>
            <PhotoCapture
              photos={photos}
              onChange={setPhotos}
              required
              label='Tomar foto'
            />
          </div>

          <label className='block space-y-1.5'>
            <span className='text-sm font-medium'>Nota (opcional)</span>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder='Ej: pallet 12, patio de descargue'
              rows={2}
            />
          </label>

          <label className='flex min-h-11 cursor-pointer items-center gap-3 text-sm'>
            <Checkbox
              className='size-5'
              checked={claimable}
              onCheckedChange={(v) => setClaimable(v === true)}
            />
            Es reclamable al proveedor
          </label>

          {partida && qty > 0 && (
            <p className='text-sm text-muted-foreground'>
              Valor estimado{' '}
              <span className='font-medium text-foreground tabular-nums'>
                {cop(estimated)}
              </span>
              {' · '}
              {needsHigherApproval(estimated)
                ? 'La aprueba Gerencia'
                : 'La aprueba el Jefe de Bodega'}
            </p>
          )}

          <DialogFooter className='flex-col gap-2 sm:flex-col sm:items-stretch'>
            {!valid && (
              <p className='text-sm text-muted-foreground'>
                Falta {lacking.join(', ')}.
              </p>
            )}
            <div className='flex gap-2 sm:justify-end'>
              <Button
                type='button'
                variant='outline'
                className='h-11'
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button
                type='submit'
                className='h-11 flex-1 sm:flex-none'
                disabled={!valid}
              >
                Reportar daño
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/* -------------------------------------------------------------------------- */
/*  5.2 Conteos de inventario                                                  */
/* -------------------------------------------------------------------------- */

export function CountsScreen({
  onGoToAdjustments,
}: {
  onGoToAdjustments: () => void
}) {
  const {
    role,
    skus,
    counts,
    adjustments,
    matchesScope,
    isReadOnly,
    submitCount,
  } = useWms()
  const [tab, setTab] = useState<'pending' | 'done' | null>(null)
  const [scheduling, setScheduling] = useState(false)
  const [inputs, setInputs] = useState<Record<string, string>>({})

  const canSchedule = role === 'ADM' || role === 'JB'
  const list = counts
    .filter((c) => matchesScope(c.warehouse))
    .sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt))
  const pending = list.filter((c) => c.status === 'Programado')
  const done = list.filter((c) => c.status !== 'Programado')
  const withDiff = done.filter((c) => c.status === 'Ajuste generado')
  const active = tab ?? (pending.length > 0 ? 'pending' : 'done')
  const shown = active === 'pending' ? pending : done

  return (
    <div className='space-y-5'>
      <PageHeader
        title='Conteos de inventario'
        actions={
          canSchedule && (
            <Button className='h-11' onClick={() => setScheduling(true)}>
              <Plus className='size-4' />
              Programar conteo
            </Button>
          )
        }
      />

      <StatStrip
        items={[
          {
            label: 'Por contar',
            value: String(pending.length),
            tone: pending.length > 0 ? 'warning' : undefined,
          },
          {
            label: 'Cuadrados',
            value: String(done.length - withDiff.length),
          },
          {
            label: 'Con diferencia',
            value: String(withDiff.length),
            tone: withDiff.length > 0 ? 'danger' : undefined,
          },
        ]}
      />

      <FilterTabs
        value={active}
        onChange={setTab}
        options={[
          { id: 'pending', label: 'Por contar', count: pending.length },
          { id: 'done', label: 'Contados', count: done.length },
        ]}
      />

      <Section flush>
        {shown.length === 0 ? (
          <EmptyState
            title={
              active === 'pending'
                ? 'No hay conteos por hacer'
                : 'Aún no hay conteos terminados'
            }
            text={
              active === 'pending'
                ? canSchedule
                  ? 'Usa «Programar conteo» para pedir un conteo ciego de una partida.'
                  : 'Cuando el Jefe de Bodega programe un conteo, aparecerá aquí.'
                : 'Los conteos que registres quedan aquí con su resultado.'
            }
          />
        ) : (
          <div className='divide-y'>
            {shown.map((c) => {
              const sku = skus.find((s) => s.sku === c.sku)
              const val = inputs[c.id] ?? ''
              const num = Math.floor(Number(val))
              const validNum =
                val.trim() !== '' && Number.isFinite(num) && num >= 0
              const adj = adjustments.find((a) => a.countId === c.id)
              const delta = (c.countedQty ?? 0) - c.expectedQty
              const diffValue =
                adj?.valueCOP ?? Math.abs(delta) * (sku?.unitCost ?? 0)

              return (
                <ListRow key={c.id} className='items-start'>
                  <RowTitle sku={sku} code={c.sku} />
                  <div className='text-sm text-muted-foreground'>
                    Partida {c.partidaId} · {c.warehouse} ·{' '}
                    {shortDate(c.scheduledAt)}
                  </div>

                  {c.status === 'Programado' ? (
                    !isReadOnly && (
                      <div className='mt-3 space-y-2'>
                        <div className='flex gap-2'>
                          <Input
                            inputMode='numeric'
                            autoComplete='off'
                            className='h-14 min-w-0 flex-1 text-center text-2xl font-semibold tabular-nums placeholder:text-base placeholder:font-normal sm:max-w-64 md:text-2xl'
                            placeholder='Cantidad contada'
                            aria-label={`Cantidad contada de ${sku?.name ?? c.sku}`}
                            value={val}
                            onChange={(e) =>
                              setInputs((prev) => ({
                                ...prev,
                                [c.id]: e.target.value.replace(/\D/g, ''),
                              }))
                            }
                          />
                          <Button
                            className='h-14 px-5'
                            disabled={!validNum}
                            onClick={() => submitCount(c.id, num)}
                          >
                            Registrar conteo
                          </Button>
                        </div>
                        <p className='text-sm text-muted-foreground'>
                          Cuenta lo que hay en el piso
                          {sku ? `, en ${unitWord(2, sku)}` : ''}. El stock del
                          sistema está oculto a propósito.
                        </p>
                      </div>
                    )
                  ) : (
                    <>
                      <div className='mt-0.5 text-sm text-muted-foreground tabular-nums'>
                        Contó {unitQty(c.countedQty ?? 0, sku)}
                        {c.countedBy ? ` (${c.countedBy})` : ''}
                      </div>
                      <div className='mt-2 flex flex-wrap items-center gap-2'>
                        {c.status === 'Ajuste generado' ? (
                          <>
                            <StatusPill tone='danger'>
                              Diferencia {delta > 0 ? '+' : '−'}
                              {unitQty(Math.abs(delta), sku)}
                            </StatusPill>
                            <span className='text-sm font-medium tabular-nums'>
                              {cop(diffValue)}
                            </span>
                            <Button
                              variant='outline'
                              className='ms-auto h-11'
                              onClick={onGoToAdjustments}
                            >
                              Ver ajuste
                            </Button>
                          </>
                        ) : (
                          <StatusPill tone='success'>Cuadrado</StatusPill>
                        )}
                      </div>
                    </>
                  )}
                </ListRow>
              )
            })}
          </div>
        )}
      </Section>

      {canSchedule && (
        <ScheduleCountDialog open={scheduling} onOpenChange={setScheduling} />
      )}
    </div>
  )
}

function ScheduleCountDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const { skus, partidas, warehouses, matchesScope, scheduleCount } = useWms()
  const [partidaId, setPartidaId] = useState('')

  const options = partidas.filter((p) => matchesScope(p.warehouse))
  const partida = options.find((p) => p.id === partidaId)

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) setPartidaId('')
        onOpenChange(o)
      }}
    >
      <DialogContent
        aria-describedby={undefined}
        className='max-h-[92dvh] overflow-y-auto sm:max-w-lg [&>*]:min-w-0'
      >
        <DialogHeader>
          <DialogTitle>Programar conteo ciego</DialogTitle>
        </DialogHeader>
        <ItemPicker
          label='Producto y partida'
          required
          value={partidaId}
          onChange={setPartidaId}
          items={options.map((p) => {
            const s = skus.find((x) => x.sku === p.sku)
            const whName =
              warehouses.find((w) => w.id === p.warehouse)?.name ?? p.warehouse
            return {
              id: p.id,
              title: s?.name ?? p.sku,
              meta: `${p.id} · ${whName}`,
              category: s?.category,
            }
          })}
        />
        <DialogFooter className='flex-col gap-2 sm:flex-col sm:items-stretch'>
          {!partida && (
            <p className='text-sm text-muted-foreground'>
              Elige el producto y la partida a contar.
            </p>
          )}
          <div className='flex gap-2 sm:justify-end'>
            <Button
              variant='outline'
              className='h-11'
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              className='h-11 flex-1 sm:flex-none'
              disabled={!partida}
              onClick={() => {
                if (!partida) return
                scheduleCount(partida.warehouse, partida.id)
                setPartidaId('')
                onOpenChange(false)
              }}
            >
              Programar conteo
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* -------------------------------------------------------------------------- */
/*  5.3 Ajustes y aprobaciones                                                 */
/* -------------------------------------------------------------------------- */

export function AdjustmentsScreen() {
  const {
    skus,
    adjustments,
    buckets,
    matchesScope,
    canApproveAmount,
    resolveAdjustment,
  } = useWms()

  const list = adjustments
    .filter((a) => matchesScope(a.warehouse))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const pending = list.filter((a) => a.status === 'Pendiente')
  const resolved = list.filter((a) => a.status !== 'Pendiente')
  const pendingValue = pending.reduce(
    (acc, a) => acc + (a.valueCOP ?? a.valueUSD),
    0
  )
  const lost = buckets.perdidaMes

  const renderRow = (a: (typeof list)[number]) => {
    const sku = skus.find((s) => s.sku === a.sku)
    const value = a.valueCOP ?? a.valueUSD
    const can = canApproveAmount(value)
    return (
      <ListRow
        key={a.id}
        className='items-start'
        trailing={
          <div className='text-end'>
            <div
              className={cn(
                'text-sm font-semibold tabular-nums',
                a.qtyDelta < 0 && TONE.danger.text
              )}
            >
              {a.qtyDelta > 0 ? '+' : '−'}
              {unitQty(Math.abs(a.qtyDelta), sku)}
            </div>
            <div className='text-sm text-muted-foreground tabular-nums'>
              {cop(value)}
            </div>
          </div>
        }
      >
        <RowTitle sku={sku} code={a.sku} />
        <div className='text-sm'>{a.reason}</div>
        <div className='mt-0.5 text-sm text-muted-foreground'>
          Solicitó {a.requestedBy} · {shortDate(a.createdAt)} · {a.warehouse}
        </div>
        {a.status !== 'Pendiente' && (
          <div className='mt-2 flex flex-wrap items-center gap-2'>
            <StatusPill tone={a.status === 'Aprobado' ? 'success' : 'neutral'}>
              {a.status}
            </StatusPill>
            {a.resolvedBy && (
              <span className='text-sm text-muted-foreground'>
                por {a.resolvedBy}
              </span>
            )}
          </div>
        )}
        {a.status === 'Pendiente' &&
          (can ? (
            <div className='mt-3 flex flex-wrap gap-2'>
              <Button
                className='h-11 flex-1 sm:flex-none'
                onClick={() => resolveAdjustment(a.id, true)}
              >
                Aprobar ajuste
              </Button>
              <Button
                variant='outline'
                className='h-11 flex-1 sm:flex-none'
                onClick={() => resolveAdjustment(a.id, false)}
              >
                Rechazar
              </Button>
            </div>
          ) : (
            <ApprovalNote valueCOP={value} />
          ))}
      </ListRow>
    )
  }

  return (
    <div className='space-y-5'>
      <PageHeader title='Ajustes de inventario' />

      <StatStrip
        items={[
          {
            label: 'Pendientes de aprobación',
            value: String(pending.length),
            tone: pending.length > 0 ? 'warning' : undefined,
          },
          { label: 'Valor pendiente', value: cop(pendingValue) },
          {
            label: 'Pérdida confirmada del mes',
            value: cop(lost.valueCOP ?? lost.valueUSD),
            hint: `${nf(lost.units)} unidades`,
          },
        ]}
      />

      <p className='-mt-2 text-sm text-muted-foreground'>{THRESHOLD_NOTE}</p>

      <Section flush>
        {pending.length === 0 ? (
          <EmptyState
            title='No hay ajustes por aprobar'
            text='Las diferencias de los conteos aparecerán aquí para que las revise quien tenga atribución.'
          />
        ) : (
          <div className='divide-y'>{pending.map(renderRow)}</div>
        )}
      </Section>

      {resolved.length > 0 && (
        <details className='group rounded-xl border bg-card'>
          <summary className='flex min-h-12 cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-base font-semibold sm:px-5 [&::-webkit-details-marker]:hidden'>
            Historial ({resolved.length})
            <span className='text-sm font-normal text-muted-foreground group-open:hidden'>
              Mostrar
            </span>
            <span className='hidden text-sm font-normal text-muted-foreground group-open:inline'>
              Ocultar
            </span>
          </summary>
          <div className='divide-y border-t'>{resolved.map(renderRow)}</div>
        </details>
      )}
    </div>
  )
}
