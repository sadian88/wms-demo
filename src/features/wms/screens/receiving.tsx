import { useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  FileWarning,
  PackagePlus,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useWms } from '@/context/wms-provider'
import { LiveSegregationPipeline } from '@/features/wms/components/visual/visual-flow'
import { EmptyState, PageHeader, nf } from './ui-helpers'

export function ReceivingScreen({
  onGoToClaims,
}: {
  onGoToClaims: () => void
}) {
  const { warehouses, skus, receipts, matchesScope, isReadOnly, receive } =
    useWms()

  const scopedWarehouses = warehouses.filter((w) => matchesScope(w.id))
  const [wh, setWh] = useState(scopedWarehouses[0]?.id ?? 'BOD-CEN-01')
  const [sku, setSku] = useState(skus[0]?.sku ?? 'POR-60120-CAL')
  const [supplier, setSupplier] = useState('Foshan Ceramics Co.')
  const [docRef, setDocRef] = useState('OC-2026-0330')
  const [expectedQty, setExpectedQty] = useState('100')
  const [goodQty, setGoodQty] = useState('96')
  const [damagedQty, setDamagedQty] = useState('4')
  const [expiry, setExpiry] = useState('')

  const skuObj = skus.find((s) => s.sku === sku)
  const expNum = Math.max(0, Math.floor(Number(expectedQty) || 0))
  const goodNum = Math.max(0, Math.floor(Number(goodQty) || 0))
  const dmgNum = Math.max(0, Math.floor(Number(damagedQty) || 0))
  const missingNum = Math.max(0, expNum - goodNum - dmgNum)
  const claimTotal = dmgNum + missingNum

  const valid =
    docRef.trim().length >= 3 &&
    supplier.trim().length >= 3 &&
    (goodNum > 0 || dmgNum > 0) &&
    (!skuObj?.requiresExpiry || expiry.trim().length === 10)

  const list = receipts.filter((r) => matchesScope(r.warehouse))

  return (
    <div className='space-y-6'>
      <PageHeader
        title='Recepción de mercadería'
        subtitle='Ingreso contra orden de compra o guía de despacho. Segregación física inmediata en bodega vs reclamo a proveedor.'
      />

      {/* Doble panel: Formulario a la izquierda, Diagrama de Segregación en Vivo a la derecha */}
      {!isReadOnly && (
        <div className='grid grid-cols-1 lg:grid-cols-12 gap-5 items-start'>
          {/* Panel Izquierdo: Formulario Operativo */}
          <form
            className='lg:col-span-7 space-y-4 rounded-xl border bg-card p-5 shadow-xs'
            onSubmit={(e) => {
              e.preventDefault()
              if (!valid) return
              receive({
                docRef: docRef.trim(),
                supplier: supplier.trim(),
                warehouse: wh,
                sku,
                expectedQty: expNum,
                receivedGoodQty: goodNum,
                damagedQty: dmgNum,
                expiry: expiry.trim() ? expiry.trim() : null,
              })
              setDocRef(`OC-2026-0${331 + receipts.length}`)
            }}
          >
            <div className='flex items-center gap-2 border-b pb-2.5'>
              <PackagePlus className='size-4 text-primary' />
              <h3 className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
                Datos de Descarga y Verificación
              </h3>
            </div>

            <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
              <div className='space-y-1'>
                <label className='text-xs font-medium'>Bodega receptora</label>
                <select
                  className='h-8 w-full rounded-md border bg-background px-2 text-xs'
                  value={wh}
                  onChange={(e) => setWh(e.target.value)}
                >
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.id} · {w.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className='space-y-1'>
                <label className='text-xs font-medium'>Producto (SKU)</label>
                <select
                  className='h-8 w-full rounded-md border bg-background px-2 text-xs'
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                >
                  {skus.map((s) => (
                    <option key={s.sku} value={s.sku}>
                      {s.sku} · {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className='space-y-1'>
                <label className='text-xs font-medium'>Proveedor</label>
                <Input
                  className='h-8 text-xs'
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  placeholder='Nombre del proveedor'
                />
              </div>

              <div className='space-y-1'>
                <label className='text-xs font-medium'>N° OC / Guía despacho</label>
                <Input
                  className='h-8 text-xs font-mono'
                  value={docRef}
                  onChange={(e) => setDocRef(e.target.value)}
                  placeholder='OC-2026-XXXX'
                />
              </div>

              <div className='space-y-1'>
                <label className='text-xs font-medium'>
                  Cantidad anunciada (guía)
                </label>
                <Input
                  type='number'
                  min={1}
                  className='h-8 text-xs font-semibold'
                  value={expectedQty}
                  onChange={(e) => setExpectedQty(e.target.value)}
                />
              </div>

              <div className='space-y-1'>
                <label className='text-xs font-medium text-emerald-600 dark:text-emerald-400'>
                  Recibida conforme (→ Disponible)
                </label>
                <Input
                  type='number'
                  min={0}
                  className='h-8 text-xs font-bold'
                  value={goodQty}
                  onChange={(e) => setGoodQty(e.target.value)}
                />
              </div>

              <div className='space-y-1'>
                <label className='text-xs font-medium text-rose-600 dark:text-rose-400'>
                  Recibida dañada (→ En reclamo)
                </label>
                <Input
                  type='number'
                  min={0}
                  className='h-8 text-xs font-bold'
                  value={damagedQty}
                  onChange={(e) => setDamagedQty(e.target.value)}
                />
              </div>

              <div className='space-y-1'>
                <label className='text-xs font-medium'>
                  Vencimiento {skuObj?.requiresExpiry ? '(FEFO obligatorio)' : '(opcional)'}
                </label>
                <Input
                  type='date'
                  className='h-8 text-xs'
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                  required={skuObj?.requiresExpiry}
                />
              </div>
            </div>

            <div className='flex items-center justify-between border-t pt-3'>
              <div className='text-xs text-muted-foreground'>
                {claimTotal > 0 ? (
                  <span className='font-semibold text-rose-600 flex items-center gap-1'>
                    <AlertTriangle className='size-3.5' /> Reclamo por {nf(claimTotal)} uds
                  </span>
                ) : (
                  <span className='text-emerald-600 flex items-center gap-1 font-medium'>
                    <CheckCircle2 className='size-3.5' /> Recepción 100% conforme
                  </span>
                )}
              </div>
              <Button size='sm' type='submit' disabled={!valid} className='text-xs'>
                Confirmar recepción
              </Button>
            </div>
          </form>

          {/* Panel Derecho: Diagrama de Segregación en Vivo */}
          <div className='lg:col-span-5 space-y-3'>
            <LiveSegregationPipeline
              expectedQty={expNum}
              receivedGoodQty={goodNum}
              damagedQty={dmgNum}
              unitMeasure={skuObj?.unitMeasure.toLowerCase() ?? 'uds'}
            />

            <div className='rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground space-y-1'>
              <div className='font-semibold text-foreground'>
                Garantía de Control Físico:
              </div>
              <p>
                Las unidades aptas entran inmediatamente al stock vendible de la bodega.
                Las unidades con rotura o faltantes generan un ticket de reclamo formal
                sin duplicar inventario ni permitir que mercadería averiada llegue a clientes.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Historial de recepciones */}
      <div className='rounded-xl border bg-card shadow-xs overflow-hidden'>
        <div className='border-b bg-muted/20 px-4 py-3 flex items-center justify-between'>
          <h3 className='text-xs font-semibold text-foreground uppercase tracking-wider'>
            Historial de Recepciones ({list.length})
          </h3>
          <span className='text-[11px] text-muted-foreground'>
            Trazabilidad por orden de compra
          </span>
        </div>

        <div className='overflow-x-auto'>
          <table className='w-full text-xs'>
            <thead className='border-b bg-muted/40 text-left text-muted-foreground'>
              <tr>
                <th className='px-3.5 py-2.5 font-medium'>Recepción · Fecha</th>
                <th className='px-3.5 py-2.5 font-medium'>Documento · Proveedor</th>
                <th className='px-3.5 py-2.5 font-medium'>SKU · Partida</th>
                <th className='px-3.5 py-2.5 font-medium'>Bodega</th>
                <th className='px-3.5 py-2.5 font-medium'>Anunciado</th>
                <th className='px-3.5 py-2.5 font-medium'>Recibido OK</th>
                <th className='px-3.5 py-2.5 font-medium'>Resolución</th>
              </tr>
            </thead>
            <tbody className='divide-y'>
              {list.map((r) => (
                <tr key={r.id} className='hover:bg-muted/20'>
                  <td className='px-3.5 py-2.5'>
                    <div className='font-bold font-mono text-foreground'>{r.id}</div>
                    <div className='text-muted-foreground text-[10px]'>{r.createdAt}</div>
                  </td>
                  <td className='px-3.5 py-2.5'>
                    <div className='font-medium text-foreground'>{r.docRef}</div>
                    <div className='text-muted-foreground truncate max-w-xs'>{r.supplier}</div>
                  </td>
                  <td className='px-3.5 py-2.5'>
                    <div className='font-semibold text-foreground'>{r.sku}</div>
                    <div className='text-muted-foreground text-[11px] font-mono'>
                      {r.partidaId}
                      {r.expiry ? ` · Vence ${r.expiry}` : ''}
                    </div>
                  </td>
                  <td className='px-3.5 py-2.5 font-medium'>{r.warehouse}</td>
                  <td className='px-3.5 py-2.5 tabular-nums text-muted-foreground'>
                    {nf(r.expectedQty)} uds
                  </td>
                  <td className='px-3.5 py-2.5 font-bold tabular-nums text-emerald-600 dark:text-emerald-400'>
                    {nf(r.receivedGoodQty)} uds
                  </td>
                  <td className='px-3.5 py-2.5'>
                    {r.claimId ? (
                      <Button
                        size='sm'
                        variant='outline'
                        className='h-6 text-xs text-rose-600 border-rose-300 dark:border-rose-900 px-2'
                        onClick={onGoToClaims}
                      >
                        <FileWarning className='mr-1 size-3' />
                        {r.claimId} ({r.damagedQty + r.missingQty} uds)
                      </Button>
                    ) : (
                      <Badge variant='outline' className='text-[10px] text-emerald-600 border-emerald-300'>
                        <CheckCircle2 className='mr-1 size-3' /> 100% Conforme
                      </Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {list.length === 0 && (
          <EmptyState text='No hay recepciones registradas en la bodega activa.' />
        )}
      </div>
    </div>
  )
}
