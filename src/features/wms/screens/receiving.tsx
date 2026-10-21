import { useMemo, useState } from 'react'
import { ChevronRight, FileWarning, PackageCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useWms } from '@/context/wms-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  ItemPicker,
  QtyStepper,
  damagedWord,
  unitQty,
} from '@/features/wms/components/flow-bits'
import {
  Callout,
  DefRow,
  Field,
  ListRow,
  PhotoCapture,
  PhotoStrip,
  SELECT_CLASS,
  Section,
  Stepper,
  TONE,
  type Tone,
} from '@/features/wms/components/kit'
import { WMS_MODULES } from '@/features/wms/data/catalog'
import { TODAY_STR } from '@/features/wms/domain/clock'
import {
  formatQtyWithEquivalent,
  type SkuItem,
} from '@/features/wms/domain/inventory'
import { EmptyState, PageHeader, nf, shortDate } from './ui-helpers'

const STEPS = ['Documento', 'Conteo', 'Fotos y confirmar']

export function ReceivingScreen({
  onGoToClaims,
}: {
  onGoToClaims: () => void
}) {
  const {
    warehouses,
    skus,
    partidas,
    receipts,
    claims,
    matchesScope,
    isReadOnly,
    hasAccess,
    receive,
  } = useWms()

  // El operario no ve la pantalla de reclamos: sin acceso no se ofrece el enlace.
  const claimsScreen = WMS_MODULES.flatMap((m) => m.screens).find(
    (s) => s.slug === '6-1'
  )
  const canSeeClaims = claimsScreen ? hasAccess(claimsScreen) : false

  const scoped = warehouses.filter((w) => matchesScope(w.id))
  const [step, setStep] = useState(0)
  const [whPick, setWhPick] = useState('')
  const [supplier, setSupplier] = useState('')
  const [docRef, setDocRef] = useState('')
  const [skuCode, setSkuCode] = useState('')
  const [expiry, setExpiry] = useState('')
  const [expected, setExpected] = useState(0)
  const [good, setGood] = useState(0)
  const [damaged, setDamaged] = useState(0)
  const [photos, setPhotos] = useState<string[]>([])
  /** Cantidad de recepciones antes de confirmar; sirve para encontrar la nueva. */
  const [baseline, setBaseline] = useState<number | null>(null)

  const wh =
    scoped.length === 1
      ? scoped[0].id
      : scoped.some((w) => w.id === whPick)
        ? whPick
        : ''
  const whName = scoped.find((w) => w.id === wh)?.name ?? wh
  const sku = skus.find((s) => s.sku === skuCode)
  const missing = Math.max(0, expected - good - damaged)
  const extra = Math.max(0, good + damaged - expected)

  const knownSuppliers = useMemo(
    () =>
      Array.from(
        new Set([
          ...receipts.map((r) => r.supplier),
          ...partidas.map((p) => p.supplier),
        ])
      ).sort(),
    [receipts, partidas]
  )

  const expiryPast = expiry !== '' && expiry < TODAY_STR
  const missingStep1: string[] = []
  if (!wh) missingStep1.push('la bodega')
  if (supplier.trim().length < 3) missingStep1.push('el proveedor')
  if (docRef.trim().length < 3) missingStep1.push('el número de documento')
  if (!sku) missingStep1.push('el producto')
  if (sku?.requiresExpiry && expiry.length !== 10)
    missingStep1.push('el vencimiento')
  const step1Ok = missingStep1.length === 0 && !expiryPast

  const step2Reason =
    expected <= 0
      ? 'Indica cuántas anunciaba el documento.'
      : good + damaged <= 0
        ? 'Indica cuántas llegaron, buenas o dañadas.'
        : ''
  const step2Ok = step2Reason === ''

  const needsPhoto = damaged > 0
  const step3Ok = !needsPhoto || photos.length > 0

  const done =
    baseline !== null && receipts.length > baseline ? receipts[0] : null
  const doneSku = skus.find((s) => s.sku === done?.sku)
  const doneWhName =
    warehouses.find((w) => w.id === done?.warehouse)?.name ?? done?.warehouse
  const doneClaim = done?.claimId
    ? claims.find((c) => c.id === done.claimId)
    : undefined

  const reset = () => {
    setStep(0)
    setSupplier('')
    setDocRef('')
    setSkuCode('')
    setExpiry('')
    setExpected(0)
    setGood(0)
    setDamaged(0)
    setPhotos([])
    setBaseline(null)
  }

  const confirm = () => {
    if (!step1Ok || !step2Ok || !step3Ok || !sku) return
    setBaseline(receipts.length)
    receive({
      docRef: docRef.trim(),
      supplier: supplier.trim(),
      warehouse: wh,
      sku: sku.sku,
      expectedQty: expected,
      receivedGoodQty: good,
      damagedQty: damaged,
      expiry: sku.requiresExpiry && expiry ? expiry : null,
      photos,
    })
  }

  const history = receipts
    .filter((r) => matchesScope(r.warehouse))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const [showAll, setShowAll] = useState(false)
  const visibleHistory = showAll ? history : history.slice(0, 8)

  const historyRows =
    history.length === 0 ? (
      <EmptyState text='Aún no hay recepciones en las bodegas seleccionadas. Cuando registres una, aparecerá aquí.' />
    ) : (
      <>
        <div className='divide-y'>
          {visibleHistory.map((r) => {
            const rSku = skus.find((s) => s.sku === r.sku)
            return (
              <ListRow key={r.id} className='items-start'>
                <div className='line-clamp-2 text-sm font-medium'>
                  {rSku?.name ?? r.sku}
                </div>
                <div className='text-sm text-muted-foreground'>
                  {shortDate(r.createdAt)} · {r.docRef} · {r.supplier}
                </div>
                <div className='mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm'>
                  <span className={cn('tabular-nums', TONE.success.text)}>
                    {unitQty(r.receivedGoodQty, rSku)} buenas
                  </span>
                  {r.damagedQty > 0 && (
                    <span className={cn('tabular-nums', TONE.danger.text)}>
                      {r.damagedQty} {damagedWord(r.damagedQty, rSku)}
                    </span>
                  )}
                  {r.missingQty > 0 && (
                    <span className={cn('tabular-nums', TONE.warning.text)}>
                      {r.missingQty}{' '}
                      {r.missingQty === 1 ? 'faltante' : 'faltantes'}
                    </span>
                  )}
                  {r.receivedBy && (
                    <span className='text-muted-foreground'>
                      Recibió {r.receivedBy}
                    </span>
                  )}
                </div>
                {r.photos && r.photos.length > 0 && (
                  <div className='mt-2'>
                    <PhotoStrip photos={r.photos} size='sm' />
                  </div>
                )}
                {r.claimId &&
                  (canSeeClaims ? (
                    <Button
                      type='button'
                      variant='link'
                      className='mt-1 h-auto p-0'
                      onClick={onGoToClaims}
                    >
                      <FileWarning className='size-4' />
                      Ver reclamo {r.claimId}
                    </Button>
                  ) : (
                    <div
                      className={cn(
                        'mt-1 flex items-center gap-1.5 text-sm',
                        TONE.warning.text
                      )}
                    >
                      <FileWarning className='size-4' />
                      Reclamo {r.claimId} abierto
                    </div>
                  ))}
              </ListRow>
            )
          })}
        </div>
        {history.length > visibleHistory.length && (
          <div className='border-t p-3 text-center'>
            <Button variant='ghost' onClick={() => setShowAll(true)}>
              Ver las {history.length} recepciones
            </Button>
          </div>
        )}
      </>
    )

  return (
    <div className='w-full max-w-3xl space-y-5'>
      <PageHeader title='Recepción de mercadería' />

      {!isReadOnly && baseline === null && (
        <Section>
          <Stepper steps={STEPS} current={step} className='mb-5' />

          {step === 0 && (
            <div className='space-y-4'>
              <h2 className='text-base font-semibold'>Datos del documento</h2>
              {scoped.length > 1 ? (
                <Field label='Bodega receptora' required>
                  <select
                    className={cn(SELECT_CLASS, 'h-11')}
                    value={wh}
                    onChange={(e) => setWhPick(e.target.value)}
                  >
                    <option value=''>Elige la bodega…</option>
                    {scoped.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.id})
                      </option>
                    ))}
                  </select>
                </Field>
              ) : (
                <div className='text-sm'>
                  <span className='text-muted-foreground'>
                    Bodega receptora:{' '}
                  </span>
                  <span className='font-medium'>{whName}</span>
                </div>
              )}

              <Field label='Proveedor' required>
                <Input
                  className='h-11'
                  list='receiving-suppliers'
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  placeholder='Nombre del proveedor'
                  autoComplete='off'
                />
                <datalist id='receiving-suppliers'>
                  {knownSuppliers.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </Field>

              <Field
                label='N.º de orden de compra o remisión del proveedor'
                required
              >
                <Input
                  className='h-11'
                  value={docRef}
                  onChange={(e) => setDocRef(e.target.value)}
                  placeholder='Ej: OC-2026-0330'
                  autoComplete='off'
                />
              </Field>

              <ItemPicker
                label='Producto'
                required
                value={skuCode}
                onChange={setSkuCode}
                items={skus.map((s) => ({
                  id: s.sku,
                  title: s.name,
                  meta: s.sku,
                  category: s.category,
                }))}
              />

              {sku?.requiresExpiry && (
                <Field
                  label='Vencimiento'
                  required
                  error={
                    expiryPast
                      ? 'Esa fecha ya pasó. Revisa el empaque o el documento.'
                      : undefined
                  }
                >
                  <Input
                    type='date'
                    className='h-11'
                    value={expiry}
                    onChange={(e) => setExpiry(e.target.value)}
                  />
                </Field>
              )}

              <div className='space-y-2 border-t pt-4'>
                {!step1Ok && (
                  <p className='text-sm text-muted-foreground'>
                    {missingStep1.length > 0
                      ? `Falta ${missingStep1.join(', ')}.`
                      : 'Corrige el vencimiento para continuar.'}
                  </p>
                )}
                <Button
                  className='h-12 w-full'
                  disabled={!step1Ok}
                  onClick={() => setStep(1)}
                >
                  Siguiente: conteo
                  <ChevronRight className='size-4' />
                </Button>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className='space-y-5'>
              <h2 className='text-base font-semibold'>¿Cuántas llegaron?</h2>

              <QtyStepper
                id='rec-expected'
                label='Anunciadas en el documento'
                value={expected}
                onChange={setExpected}
                hint={
                  expected > 0
                    ? formatQtyWithEquivalent(expected, sku)
                    : undefined
                }
              />
              <QtyStepper
                id='rec-good'
                label='Recibidas en buen estado'
                tone='success'
                value={good}
                onChange={setGood}
                hint={good > 0 ? formatQtyWithEquivalent(good, sku) : undefined}
              />
              <QtyStepper
                id='rec-damaged'
                label='Dañadas'
                tone='danger'
                value={damaged}
                onChange={setDamaged}
                hint={
                  damaged > 0
                    ? formatQtyWithEquivalent(damaged, sku)
                    : undefined
                }
              />

              {extra > 0 && (
                <Callout
                  tone='warning'
                  title={`Llegaron ${unitQty(extra, sku)} más de las anunciadas`}
                >
                  Se recibirán igual. Si es un error de conteo, corrígelo antes
                  de continuar.
                </Callout>
              )}

              <div className='border-t pt-4'>
                <LiveSummary
                  good={good}
                  damaged={damaged}
                  missing={missing}
                  sku={sku}
                />
              </div>

              <div className='space-y-2 border-t pt-4'>
                {!step2Ok && (
                  <p className='text-sm text-muted-foreground'>{step2Reason}</p>
                )}
                <div className='flex gap-2'>
                  <Button
                    variant='outline'
                    className='h-12 px-5'
                    onClick={() => setStep(0)}
                  >
                    Atrás
                  </Button>
                  <Button
                    className='h-12 flex-1'
                    disabled={!step2Ok}
                    onClick={() => setStep(2)}
                  >
                    Siguiente: fotos
                    <ChevronRight className='size-4' />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className='space-y-5'>
              <div className='space-y-2'>
                <h2 className='text-base font-semibold'>
                  {needsPhoto
                    ? 'Fotos de las unidades dañadas'
                    : 'Fotos de la mercancía'}
                </h2>
                {needsPhoto ? (
                  <p className='text-sm text-muted-foreground'>
                    Toma al menos una foto de las {unitQty(damaged, sku)}{' '}
                    {damagedWord(damaged, sku)}. Sirve como soporte del reclamo
                    al proveedor.
                  </p>
                ) : (
                  <p className='text-sm text-muted-foreground'>
                    Opcional. Puedes dejar una foto del documento o de la
                    mercancía.
                  </p>
                )}
                <PhotoCapture
                  photos={photos}
                  onChange={setPhotos}
                  required={needsPhoto}
                  label={needsPhoto ? 'Tomar foto de daños' : 'Agregar foto'}
                />
              </div>

              <dl className='divide-y border-y'>
                <DefRow label='Bodega'>{whName}</DefRow>
                <DefRow label='Proveedor'>{supplier.trim()}</DefRow>
                <DefRow label='Documento'>{docRef.trim()}</DefRow>
                <DefRow label='Producto'>{sku?.name}</DefRow>
                {sku?.requiresExpiry && expiry && (
                  <DefRow label='Vencimiento'>{shortDate(expiry)}</DefRow>
                )}
                <DefRow label='Anunciadas'>
                  {formatQtyWithEquivalent(expected, sku)}
                </DefRow>
              </dl>

              <LiveSummary
                good={good}
                damaged={damaged}
                missing={missing}
                sku={sku}
              />

              <div className='space-y-2 border-t pt-4'>
                {!step3Ok && (
                  <p className={cn('text-sm', TONE.danger.text)}>
                    Falta al menos una foto de las unidades dañadas para poder
                    confirmar.
                  </p>
                )}
                <div className='flex gap-2'>
                  <Button
                    variant='outline'
                    className='h-12 px-5'
                    onClick={() => setStep(1)}
                  >
                    Atrás
                  </Button>
                  <Button
                    className='h-12 flex-1'
                    disabled={!step3Ok}
                    onClick={confirm}
                  >
                    <PackageCheck className='size-5' />
                    Confirmar recepción
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Section>
      )}

      {!isReadOnly && baseline !== null && done && (
        <Section>
          <div className='space-y-4'>
            <Callout
              tone='success'
              icon={PackageCheck}
              title={`Recepción registrada: ${done.id}`}
            >
              {done.receivedGoodQty > 0
                ? `${unitQty(done.receivedGoodQty, doneSku)} quedaron disponibles en ${doneWhName}.`
                : 'Ninguna unidad quedó disponible: todo pasó a reclamo.'}
            </Callout>
            {done.claimId && (
              <Callout
                tone='warning'
                icon={FileWarning}
                title={`Se abrió el reclamo ${done.claimId}`}
              >
                {doneClaim
                  ? `${unitQty(doneClaim.qty, doneSku)} por reclamar a ${doneClaim.counterparty}`
                  : 'Quedó pendiente de gestionar con el proveedor'}
              </Callout>
            )}
            <div className='flex flex-col gap-2 sm:flex-row'>
              {done.claimId && canSeeClaims && (
                <Button
                  variant='outline'
                  className='h-12 sm:flex-1'
                  onClick={onGoToClaims}
                >
                  Ver reclamo
                </Button>
              )}
              <Button className='h-12 sm:flex-1' onClick={reset}>
                Registrar otra recepción
              </Button>
            </div>
          </div>
        </Section>
      )}

      {isReadOnly ? (
        <Section title={`Recepciones recientes (${history.length})`} flush>
          {historyRows}
        </Section>
      ) : (
        <details className='group rounded-xl border bg-card'>
          <summary className='flex min-h-12 cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-base font-semibold sm:px-5 [&::-webkit-details-marker]:hidden'>
            Recepciones recientes ({history.length})
            <ChevronRight className='size-4 text-muted-foreground transition-transform group-open:rotate-90' />
          </summary>
          <div className='border-t'>{historyRows}</div>
        </details>
      )}
    </div>
  )
}

/** Resumen vivo: a dónde va cada unidad apenas se confirma. */
function LiveSummary({
  good,
  damaged,
  missing,
  sku,
}: {
  good: number
  damaged: number
  missing: number
  sku?: SkuItem
}) {
  const items: { tone: Tone; text: React.ReactNode }[] = [
    {
      tone: good > 0 ? 'success' : 'neutral',
      text: (
        <>
          <b className='tabular-nums'>{unitQty(good, sku)}</b> en buen estado →
          Disponible
        </>
      ),
    },
    {
      tone: damaged > 0 ? 'danger' : 'neutral',
      text: (
        <>
          <b className='tabular-nums'>{nf(damaged)}</b>{' '}
          {damagedWord(damaged, sku)}
          {damaged > 0 && ' → Reclamo a proveedor'}
        </>
      ),
    },
    {
      tone: missing > 0 ? 'warning' : 'neutral',
      text: (
        <>
          <b className='tabular-nums'>{nf(missing)}</b>{' '}
          {missing === 1 ? 'faltante' : 'faltantes'}
          {missing > 0 && ' → Reclamo a proveedor'}
        </>
      ),
    },
  ]
  return (
    <ul
      className='flex flex-wrap gap-x-5 gap-y-1.5 text-sm'
      aria-live='polite'
      aria-label='Resumen de la recepción'
    >
      {items.map((it, i) => (
        <li key={i} className='flex items-center gap-2'>
          <span
            className={cn('size-2 shrink-0 rounded-full', TONE[it.tone].dot)}
          />
          <span>{it.text}</span>
        </li>
      ))}
    </ul>
  )
}
