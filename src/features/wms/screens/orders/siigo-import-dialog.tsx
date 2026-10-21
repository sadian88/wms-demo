import { useRef, useState } from 'react'
import { CircleAlert, CircleCheck, TriangleAlert, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useWms } from '@/context/wms-provider'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import {
  Callout,
  DefRow,
  Field,
  SELECT_CLASS,
  StatusPill,
  type Tone,
} from '@/features/wms/components/kit'
import {
  SIIGO_CSV_TEMPLATE,
  type InvoiceImportPreview,
  type ParsedInvoice,
} from '@/features/wms/domain/invoicing'
import { cop } from '../ui-helpers'
import { BTN, STEP_DIALOG_CLASS, StepLayout } from './step-layout'

const STEPS = ['Archivo', 'Revisar', 'Confirmar']

type Outcome = 'lista' | 'omite' | 'error' | 'anula'

const OUTCOME: Record<Outcome, { tone: Tone; label: string; rank: number }> = {
  error: { tone: 'danger', label: 'Con error', rank: 0 },
  anula: { tone: 'warning', label: 'Se anula', rank: 1 },
  lista: { tone: 'success', label: 'Lista', rank: 2 },
  omite: { tone: 'neutral', label: 'Se omite', rank: 3 },
}

function outcomeOf(inv: ParsedInvoice): Outcome {
  if (inv.action === 'importar') return 'lista'
  if (inv.action === 'anular') return 'anula'
  return inv.issues.some((i) => i.level === 'error') ? 'error' : 'omite'
}

interface ImportResult {
  imported: number
  voided: number
  failed: number
}

const plural = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`

export function SiigoImportDialog({
  open,
  onOpenChange,
  onImported,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImported?: (result: ImportResult) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={STEP_DIALOG_CLASS}>
        <SiigoFlow
          onClose={() => onOpenChange(false)}
          onImported={onImported}
        />
      </DialogContent>
    </Dialog>
  )
}

function SiigoFlow({
  onClose,
  onImported,
}: {
  onClose: () => void
  onImported?: (result: ImportResult) => void
}) {
  const {
    warehouses,
    activeWarehouseIds,
    previewInvoicesImport,
    applyInvoicesImport,
  } = useWms()

  const fileRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState(0)
  const [text, setText] = useState('')
  const [fileName, setFileName] = useState('')
  const [wh, setWh] = useState(
    () => activeWarehouseIds[0] ?? warehouses[0]?.id ?? ''
  )
  const [preview, setPreview] = useState<InvoiceImportPreview | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)

  const whName = (id: string) => warehouses.find((w) => w.id === id)?.name ?? id

  const onFile = async (file: File | undefined) => {
    if (!file) return
    try {
      setText(await file.text())
      setFileName(file.name)
    } catch {
      toast.error('No se pudo leer el archivo. Revisa que sea un .csv o .txt.')
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const review = () => {
    setPreview(previewInvoicesImport(text, wh))
    setStep(1)
  }

  const invoices = preview?.invoices ?? []
  const toApply = invoices.filter((i) => i.action !== 'omitir')
  const toImport = invoices.filter((i) => i.action === 'importar')
  const toVoid = invoices.filter((i) => i.action === 'anular')
  const skipped = invoices.length - toApply.length
  const fatal = preview?.fatal ?? []

  const counts: Record<Outcome, number> = {
    lista: 0,
    omite: 0,
    error: 0,
    anula: 0,
  }
  invoices.forEach((i) => counts[outcomeOf(i)]++)
  const summary = [
    counts.lista > 0 &&
      plural(counts.lista, 'factura lista', 'facturas listas'),
    counts.anula > 0 && plural(counts.anula, 'se anula', 'se anulan'),
    counts.omite > 0 && plural(counts.omite, 'se omite', 'se omiten'),
    counts.error > 0 && plural(counts.error, 'con error', 'con error'),
  ]
    .filter(Boolean)
    .join(' · ')

  const apply = () => {
    const r = applyInvoicesImport(toApply)
    setResult(r)
    if (r.imported > 0 || r.voided > 0) onImported?.(r)
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

  const applyLabel =
    toApply.length === 1
      ? 'Cargar 1 factura'
      : `Cargar ${toApply.length} facturas`

  return (
    <StepLayout
      title='Cargar facturas de Siigo'
      description='Sube el archivo de facturas del día, revisa lo que se va a cargar y confírmalo.'
      steps={STEPS}
      current={result ? 3 : step}
      back={step > 0 && !result ? back : undefined}
      hint={
        step === 0 && text.trim() === '' ? (
          <span className='text-muted-foreground'>
            Sube un archivo o pega el texto para continuar.
          </span>
        ) : step === 1 && fatal.length > 0 ? (
          <span className='text-warning-ink'>
            Corrige el archivo y vuelve a revisarlo.
          </span>
        ) : step === 1 && toApply.length === 0 ? (
          <span className='text-warning-ink'>
            No hay facturas para cargar. Corrige el archivo y vuelve a
            revisarlo.
          </span>
        ) : undefined
      }
      actions={
        result ? (
          <Button className={BTN} onClick={onClose}>
            Listo
          </Button>
        ) : step === 0 ? (
          <Button
            className={BTN}
            disabled={text.trim() === ''}
            onClick={review}
          >
            Revisar archivo
          </Button>
        ) : step === 1 ? (
          <Button
            className={BTN}
            disabled={toApply.length === 0 || fatal.length > 0}
            onClick={() => setStep(2)}
          >
            Continuar
          </Button>
        ) : (
          <Button className={BTN} onClick={apply}>
            {applyLabel}
          </Button>
        )
      }
    >
      {step === 0 && (
        <div className='space-y-5'>
          <div className='space-y-2'>
            <input
              ref={fileRef}
              type='file'
              accept='.csv,.txt,text/csv,text/plain'
              className='sr-only'
              tabIndex={-1}
              aria-label='Archivo de facturas'
              onChange={(e) => void onFile(e.target.files?.[0])}
            />
            <Button
              type='button'
              variant='outline'
              className='h-10 w-full border-dashed'
              onClick={() => fileRef.current?.click()}
            >
              <Upload className='size-4' />
              {fileName ? 'Cambiar archivo' : 'Subir archivo .csv o .txt'}
            </Button>
            {fileName && (
              <p className='text-sm text-muted-foreground'>
                Archivo cargado: <b className='text-foreground'>{fileName}</b>
              </p>
            )}
          </div>

          <div className='flex items-center gap-3 text-sm text-muted-foreground'>
            <span className='h-px flex-1 bg-border' />o pega el texto
            <span className='h-px flex-1 bg-border' />
          </div>

          <div className='space-y-1'>
            <Field label='Texto del archivo'>
              <Textarea
                className='max-h-44 min-h-28 font-mono'
                value={text}
                onChange={(e) => {
                  setText(e.target.value)
                  setFileName('')
                }}
                placeholder={'factura;sku;cantidad\nFV-10452;POR-60120-CAL;30'}
                spellCheck={false}
              />
            </Field>
            <Button
              type='button'
              variant='link'
              className='h-auto px-0 py-1'
              onClick={() => {
                setText(SIIGO_CSV_TEMPLATE)
                setFileName('')
              }}
            >
              Usar archivo de ejemplo
            </Button>
          </div>

          <Field
            label='Bodega por defecto'
            hint='Se usa en las facturas del archivo que no traen la columna bodega.'
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
        </div>
      )}

      {step === 1 && preview && (
        <div className='space-y-4'>
          {fatal.length > 0 ? (
            <>
              <Callout
                tone='danger'
                icon={CircleAlert}
                title='No pudimos leer el archivo'
              >
                <ul className='list-disc ps-4'>
                  {fatal.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              </Callout>
              <div className='space-y-1.5 text-sm'>
                <p className='font-medium'>Columnas que espera el archivo</p>
                <p>
                  <b>Obligatorias:</b> factura, sku, cantidad.
                </p>
                <p>
                  <b>Opcionales:</b> fecha, nit, cliente, precio, bodega, medio
                  de pago, vendedor.
                </p>
                <p className='text-muted-foreground'>
                  La primera fila debe traer los nombres de las columnas, y el
                  separador puede ser coma o punto y coma.
                </p>
              </div>
            </>
          ) : invoices.length === 0 ? (
            <p className='text-sm text-muted-foreground'>
              El archivo no trae facturas. Revisa que tenga filas debajo de los
              títulos de las columnas.
            </p>
          ) : (
            <>
              <p className='text-sm font-medium'>{summary}</p>
              <ul className='divide-y rounded-lg border'>
                {[...invoices]
                  .sort(
                    (a, b) =>
                      OUTCOME[outcomeOf(a)].rank - OUTCOME[outcomeOf(b)].rank
                  )
                  .map((inv) => {
                    const o = OUTCOME[outcomeOf(inv)]
                    return (
                      <li key={inv.number} className='space-y-1.5 p-3'>
                        <div className='flex items-start justify-between gap-3'>
                          <div className='min-w-0'>
                            <div className='truncate text-sm font-semibold'>
                              {inv.number}
                              <span className='font-normal text-muted-foreground'>
                                {' · '}
                                {inv.customer}
                              </span>
                            </div>
                            <div className='text-sm text-muted-foreground'>
                              {cop(inv.totalCOP)} · {whName(inv.warehouse)} ·{' '}
                              {plural(
                                inv.lines.length,
                                'producto',
                                'productos'
                              )}
                            </div>
                          </div>
                          <StatusPill tone={o.tone}>{o.label}</StatusPill>
                        </div>
                        {inv.issues.map((issue, i) => (
                          <p
                            key={i}
                            className={cn(
                              'flex items-start gap-1.5 text-sm',
                              issue.level === 'error'
                                ? 'text-danger-ink'
                                : 'text-warning-ink'
                            )}
                          >
                            {issue.level === 'error' ? (
                              <CircleAlert className='mt-0.5 size-4 shrink-0' />
                            ) : (
                              <TriangleAlert className='mt-0.5 size-4 shrink-0' />
                            )}
                            {issue.message}
                          </p>
                        ))}
                      </li>
                    )
                  })}
              </ul>
            </>
          )}
        </div>
      )}

      {step === 2 && !result && (
        <div className='space-y-4'>
          <p className='text-base font-semibold'>Todo listo para cargar</p>
          <dl className='divide-y'>
            <DefRow label='Facturas nuevas'>{toImport.length}</DefRow>
            {toVoid.length > 0 && (
              <DefRow label='Facturas que se anulan'>{toVoid.length}</DefRow>
            )}
            <DefRow label='Valor de las facturas nuevas'>
              {cop(toImport.reduce((s, i) => s + i.totalCOP, 0))}
            </DefRow>
            {skipped > 0 && (
              <DefRow label='Quedan sin cargar'>{skipped}</DefRow>
            )}
          </dl>
          <p className='text-sm text-muted-foreground'>
            Cada factura nueva crea un pedido y reserva el stock en su bodega,
            listo para entregar. Las que se omiten no se tocan.
          </p>
        </div>
      )}

      {result && (
        <div className='flex flex-col items-center gap-2 py-6 text-center'>
          <div
            className={cn(
              'flex size-10 items-center justify-center rounded-full',
              result.imported + result.voided > 0
                ? 'bg-success-soft text-success-ink'
                : 'bg-warning-soft text-warning-ink'
            )}
          >
            {result.imported + result.voided > 0 ? (
              <CircleCheck className='size-6' />
            ) : (
              <TriangleAlert className='size-6' />
            )}
          </div>
          <h3 className='text-base font-semibold'>
            {result.imported + result.voided > 0
              ? 'Facturas cargadas'
              : 'No se cargó ninguna factura'}
          </h3>
          <p className='max-w-sm text-sm text-muted-foreground'>
            {[
              result.imported > 0 &&
                `${plural(result.imported, 'factura cargada', 'facturas cargadas')} con el stock reservado`,
              result.voided > 0 &&
                plural(result.voided, 'factura anulada', 'facturas anuladas'),
              result.failed > 0 &&
                `${plural(result.failed, 'no se pudo reservar', 'no se pudieron reservar')}`,
            ]
              .filter(Boolean)
              .join(' · ') || 'Revisa el stock disponible e intenta de nuevo.'}
          </p>
        </div>
      )}
    </StepLayout>
  )
}
