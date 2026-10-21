import { useState } from 'react'
import { Download, Plus } from 'lucide-react'
import { downloadCsv } from '@/lib/csv'
import { useWms } from '@/context/wms-provider'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { PAYMENT_METHODS } from '@/features/wms/domain/inventory'
import { SIIGO_CSV_TEMPLATE } from '@/features/wms/domain/invoicing'
import {
  Field,
  ListRow,
  SELECT_CLASS,
  Section,
  StatusPill,
} from '../../components/kit'

const CSV_COLUMNS = [
  {
    name: 'factura',
    need: 'Obligatoria',
    desc: 'Número con prefijo (FV-10452) o solo el consecutivo',
  },
  {
    name: 'sku',
    need: 'Obligatoria',
    desc: 'Código del producto en el catálogo',
  },
  {
    name: 'cantidad',
    need: 'Obligatoria',
    desc: 'En la unidad base (cajas) o en m², kg… si agregas «unidad»',
  },
  {
    name: 'fecha, nit, cliente',
    need: 'Recomendada',
    desc: 'Para identificar al cliente y la antigüedad',
  },
  {
    name: 'precio, bodega, medio de pago, vendedor',
    need: 'Opcional',
    desc: 'Si faltan se usan el precio del catálogo y la bodega activa',
  },
  {
    name: 'estado',
    need: 'Opcional',
    desc: '«Anulada» anula la factura si ya estaba cargada',
  },
]

export function BillingSettings() {
  const {
    prefixes,
    pointsOfSale,
    warehouses,
    updateInvoicePrefix,
    addInvoicePrefix,
    addPointOfSale,
    updatePointOfSale,
  } = useWms()

  const [prefixOpen, setPrefixOpen] = useState(false)
  const [newPrefix, setNewPrefix] = useState('')
  const [newPrefixDesc, setNewPrefixDesc] = useState('')
  const [posOpen, setPosOpen] = useState(false)
  const [posName, setPosName] = useState('')
  const [posWh, setPosWh] = useState('')
  const [posPrefix, setPosPrefix] = useState('')

  const downloadTemplate = () =>
    downloadCsv(
      'facturas-ejemplo.csv',
      SIIGO_CSV_TEMPLATE.split('\n').map((l) => l.split(';'))
    )

  return (
    <>
      <Section
        title='Prefijos de factura'
        hint='Los números que se registran en caja o se cargan de Siigo deben empezar por uno de estos prefijos.'
        action={
          <Button
            variant='outline'
            onClick={() => {
              setNewPrefix('')
              setNewPrefixDesc('')
              setPrefixOpen(true)
            }}
          >
            <Plus /> Nuevo prefijo
          </Button>
        }
        flush
      >
        <div className='divide-y'>
          {prefixes.map((p) => (
            <ListRow
              key={p.prefix}
              trailing={
                <Switch
                  checked={p.active}
                  onCheckedChange={(v) =>
                    updateInvoicePrefix(p.prefix, { active: v })
                  }
                  aria-label={`${p.active ? 'Desactivar' : 'Activar'} el prefijo ${p.prefix}`}
                />
              }
            >
              <div className='flex flex-wrap items-center gap-2'>
                <span className='font-mono text-sm font-semibold'>
                  {p.prefix}
                </span>
                <span className='text-sm'>{p.description}</span>
                {!p.active && <StatusPill>Inactivo</StatusPill>}
              </div>
              <div className='text-sm text-muted-foreground'>
                Próximo consecutivo sugerido:{' '}
                <span className='font-mono'>
                  {p.prefix}-{p.nextNumber}
                </span>
              </div>
            </ListRow>
          ))}
        </div>
      </Section>

      <Section
        title='Puntos de venta'
        action={
          <Button
            variant='outline'
            onClick={() => {
              setPosName('')
              setPosWh(warehouses[0]?.id ?? '')
              setPosPrefix(prefixes[0]?.prefix ?? '')
              setPosOpen(true)
            }}
          >
            <Plus /> Nuevo punto de venta
          </Button>
        }
        flush
      >
        <div className='divide-y'>
          {pointsOfSale.map((p) => (
            <ListRow
              key={p.id}
              trailing={
                <Switch
                  checked={p.active}
                  onCheckedChange={(v) =>
                    updatePointOfSale(p.id, { active: v })
                  }
                  aria-label={`${p.active ? 'Desactivar' : 'Activar'} ${p.name}`}
                />
              }
            >
              <div className='text-sm font-medium'>{p.name}</div>
              <div className='text-sm text-muted-foreground'>
                {warehouses.find((w) => w.id === p.warehouse)?.name ??
                  p.warehouse}{' '}
                · prefijo {p.prefix}
              </div>
            </ListRow>
          ))}
        </div>
      </Section>

      <Section title='Medios de pago'>
        <div className='flex flex-wrap gap-2'>
          {PAYMENT_METHODS.map((m) => (
            <StatusPill key={m} tone='neutral'>
              {m}
            </StatusPill>
          ))}
        </div>
      </Section>

      <Section
        title='Facturas desde Siigo'
        hint='Siigo no tiene conexión directa: las facturas del día se exportan en CSV y se cargan en «Pedidos y facturas».'
        action={
          <Button variant='outline' onClick={downloadTemplate}>
            <Download /> Archivo de ejemplo
          </Button>
        }
      >
        <details>
          <summary className='cursor-pointer text-sm font-medium text-primary'>
            Ver las columnas que se reconocen
          </summary>
          <dl className='mt-3 divide-y'>
            {CSV_COLUMNS.map((c) => (
              <div key={c.name} className='py-2.5'>
                <dt className='flex flex-wrap items-center gap-2 text-sm font-medium'>
                  <span className='font-mono'>{c.name}</span>
                  <span className='text-xs font-normal text-muted-foreground'>
                    {c.need}
                  </span>
                </dt>
                <dd className='text-sm text-muted-foreground'>{c.desc}</dd>
              </div>
            ))}
          </dl>
          <p className='mt-2 text-sm text-muted-foreground'>
            El separador puede ser coma, punto y coma o tabulación.
          </p>
        </details>
      </Section>

      <Dialog open={prefixOpen} onOpenChange={setPrefixOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo prefijo de factura</DialogTitle>
          </DialogHeader>
          <form
            className='space-y-4'
            onSubmit={(e) => {
              e.preventDefault()
              if (addInvoicePrefix(newPrefix, newPrefixDesc))
                setPrefixOpen(false)
            }}
          >
            <Field
              label='Prefijo'
              hint='Solo letras, por ejemplo FV o POS.'
              required
            >
              <Input
                required
                className='h-10 font-mono uppercase'
                maxLength={6}
                value={newPrefix}
                onChange={(e) => setNewPrefix(e.target.value)}
              />
            </Field>
            <Field label='Descripción'>
              <Input
                className='h-10'
                value={newPrefixDesc}
                onChange={(e) => setNewPrefixDesc(e.target.value)}
              />
            </Field>
            <div className='flex justify-end gap-2'>
              <Button
                type='button'
                variant='outline'
                onClick={() => setPrefixOpen(false)}
              >
                Cancelar
              </Button>
              <Button type='submit'>Crear prefijo</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={posOpen} onOpenChange={setPosOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo punto de venta</DialogTitle>
          </DialogHeader>
          <form
            className='space-y-4'
            onSubmit={(e) => {
              e.preventDefault()
              addPointOfSale({
                name: posName,
                warehouse: posWh,
                prefix: posPrefix,
              })
              setPosOpen(false)
            }}
          >
            <Field label='Nombre' required>
              <Input
                required
                className='h-10'
                value={posName}
                onChange={(e) => setPosName(e.target.value)}
              />
            </Field>
            <Field label='Bodega'>
              <select
                className={SELECT_CLASS}
                value={posWh}
                onChange={(e) => setPosWh(e.target.value)}
              >
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label='Prefijo de factura'>
              <select
                className={SELECT_CLASS}
                value={posPrefix}
                onChange={(e) => setPosPrefix(e.target.value)}
              >
                {prefixes
                  .filter((p) => p.active)
                  .map((p) => (
                    <option key={p.prefix} value={p.prefix}>
                      {p.prefix} · {p.description}
                    </option>
                  ))}
              </select>
            </Field>
            <div className='flex justify-end gap-2'>
              <Button
                type='button'
                variant='outline'
                onClick={() => setPosOpen(false)}
              >
                Cancelar
              </Button>
              <Button type='submit'>Crear punto de venta</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
