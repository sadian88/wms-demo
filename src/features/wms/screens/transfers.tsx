import { useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  FileCheck2,
  MapPin,
  Plus,
  Printer,
  ShieldCheck,
  Truck,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useWms } from '@/context/wms-provider'
import type { WmsTransfer } from '@/features/wms/domain/inventory'
import { EmptyState, PageHeader, nf } from './ui-helpers'

export function TransfersScreen() {
  const {
    role,
    isReadOnly,
    warehouses,
    partidas,
    transfers,
    matchesScope,
    createTransfer,
    advanceTransfer,
  } = useWms()

  const [newOpen, setNewOpen] = useState(false)
  const [guideTransfer, setGuideTransfer] = useState<WmsTransfer | null>(null)
  const [partidaId, setPartidaId] = useState('')
  const [destWh, setDestWh] = useState('')
  const [qty, setQty] = useState('24')

  const canApprove = role === 'ADM' || role === 'JB'
  const scopedTransfers = transfers.filter(
    (t) => matchesScope(t.originWarehouse) || matchesScope(t.destWarehouse)
  )
  const availPartidas = partidas.filter(
    (p) => matchesScope(p.warehouse) && p.qty.disponible > 0
  )
  const selectedPartida = availPartidas.find((p) => p.id === partidaId)

  const getTransferSteps = (t: WmsTransfer) => [
    {
      label: '1. Solicitado',
      done: true,
      active: t.status === 'Solicitado',
    },
    {
      label: '2. Aprobado',
      done: t.status !== 'Solicitado',
      active: t.status === 'Aprobado',
    },
    {
      label: '3. En tránsito',
      done:
        t.status === 'En tránsito' ||
        t.status === 'Recibido total' ||
        t.status === 'Cerrado con diferencias',
      active: t.status === 'En tránsito',
    },
    {
      label:
        t.status === 'Cerrado con diferencias'
          ? '4. Con rotura'
          : '4. Recibido OK',
      done:
        t.status === 'Recibido total' ||
        t.status === 'Cerrado con diferencias',
      active:
        t.status === 'Recibido total' ||
        t.status === 'Cerrado con diferencias',
    },
  ]

  const getTruckPosition = (status: WmsTransfer['status']) => {
    switch (status) {
      case 'Solicitado':
        return '10%'
      case 'Aprobado':
        return '35%'
      case 'En tránsito':
        return '65%'
      case 'Recibido total':
      case 'Cerrado con diferencias':
        return '90%'
      default:
        return '10%'
    }
  }

  return (
    <div className='space-y-6'>
      <PageHeader
        title='Traspasos entre bodegas'
        subtitle='Traslado trazado con pipeline visual de ruta y control de roturas en destino.'
        actions={
          !isReadOnly ? (
            <Button size='sm' onClick={() => setNewOpen(true)} className='text-xs'>
              <Plus className='mr-1.5 size-4' />
              Solicitar traspaso
            </Button>
          ) : undefined
        }
      />

      {/* Transfer cards */}
      <div className='space-y-4'>
        {scopedTransfers.length === 0 && (
          <EmptyState text='No hay traspasos registrados para las bodegas activas.' />
        )}
        {scopedTransfers.map((t) => {
          const steps = getTransferSteps(t)
          const truckPos = getTruckPosition(t.status)
          const isDamaged = t.status === 'Cerrado con diferencias'

          return (
            <div
              key={t.id}
              className='rounded-xl border bg-card p-5 shadow-xs transition-all hover:border-primary/40 space-y-4'
            >
              {/* Header: ID, Guide, Status Badge */}
              <div className='flex flex-wrap items-center justify-between gap-3 border-b pb-3'>
                <div className='flex items-center gap-2'>
                  <span className='font-mono text-sm font-bold text-foreground'>
                    {t.id}
                  </span>
                  <Badge
                    variant={
                      isDamaged
                        ? 'destructive'
                        : t.status === 'Recibido total'
                          ? 'default'
                          : t.status === 'En tránsito'
                            ? 'secondary'
                            : 'outline'
                    }
                    className='text-xs'
                  >
                    {t.status}
                  </Badge>
                  <span className='text-xs text-muted-foreground'>
                    Guía DTE: <strong>{t.guideNumber}</strong>
                  </span>
                </div>

                <div className='flex items-center gap-2'>
                  <Button
                    size='sm'
                    variant='outline'
                    className='h-7 text-xs px-2.5'
                    onClick={() => setGuideTransfer(t)}
                  >
                    <FileCheck2 className='mr-1 size-3.5 text-primary' />
                    Ver Guía
                  </Button>
                </div>
              </div>

              {/* Middle: Schematic Route & Truck */}
              <div className='rounded-lg border bg-muted/20 p-4'>
                <div className='flex items-center justify-between text-xs font-semibold mb-2'>
                  <div className='flex items-center gap-1.5 text-primary'>
                    <MapPin className='size-3.5' />
                    <span>Origen: {t.originWarehouse}</span>
                  </div>
                  <div className='text-muted-foreground'>
                    Partida: <span className='font-mono font-medium'>{t.partidaId}</span> · {t.skuName}
                  </div>
                  <div className='flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400'>
                    <MapPin className='size-3.5' />
                    <span>Destino: {t.destWarehouse}</span>
                  </div>
                </div>

                {/* Truck Track Animation Track */}
                <div className='relative my-3 flex h-7 w-full items-center'>
                  <div className='h-1.5 w-full rounded-full bg-border' />
                  <div
                    className='absolute -top-1.5 transition-all duration-500 flex items-center justify-center rounded-full bg-primary text-primary-foreground p-1 shadow-sm'
                    style={{ left: truckPos, transform: 'translateX(-50%)' }}
                  >
                    <Truck className='size-4' />
                  </div>
                </div>

                {/* 4 Milestones */}
                <div className='grid grid-cols-4 gap-2 pt-1 text-center'>
                  {steps.map((st) => (
                    <div key={st.label} className='flex flex-col items-center'>
                      <div
                        className={`size-2 rounded-full mb-1 ${
                          st.active
                            ? 'bg-primary ring-2 ring-primary/30'
                            : st.done
                              ? 'bg-emerald-500'
                              : 'bg-muted-foreground/30'
                        }`}
                      />
                      <span
                        className={`text-[11px] leading-tight ${
                          st.active
                            ? 'font-bold text-foreground'
                            : st.done
                              ? 'text-foreground font-medium'
                              : 'text-muted-foreground'
                        }`}
                      >
                        {st.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom: Quantities & Action Buttons */}
              <div className='flex flex-wrap items-center justify-between gap-3 border-t pt-3 text-xs'>
                <div className='flex items-center gap-4 text-muted-foreground'>
                  <span>
                    Solicitado: <strong className='text-foreground'>{nf(t.qtyRequested)} uds</strong>
                  </span>
                  <span>
                    Despachado: <strong className='text-foreground'>{nf(t.qtySent)} uds</strong>
                  </span>
                  <span>
                    Recibido en destino:{' '}
                    <strong className='text-foreground'>
                      {t.qtyReceived !== null ? `${nf(t.qtyReceived)} uds` : '—'}
                    </strong>
                  </span>
                </div>

                {/* Action buttons based on status */}
                <div className='flex items-center gap-2'>
                  {!isReadOnly && t.status === 'Solicitado' && (
                    <Button
                      size='sm'
                      className='h-7 text-xs'
                      disabled={!canApprove}
                      title={
                        canApprove
                          ? undefined
                          : 'Solo Jefe de Bodega o Administrador pueden aprobar'
                      }
                      onClick={() => advanceTransfer(t.id, 'Aprobado')}
                    >
                      <ShieldCheck className='mr-1 size-3.5' />
                      Aprobar Traspaso
                    </Button>
                  )}
                  {!isReadOnly && t.status === 'Aprobado' && (
                    <Button
                      size='sm'
                      className='h-7 text-xs'
                      onClick={() => advanceTransfer(t.id, 'En tránsito')}
                    >
                      <Truck className='mr-1 size-3.5' />
                      Despachar a Ruta
                    </Button>
                  )}
                  {!isReadOnly && t.status === 'En tránsito' && (
                    <>
                      <Button
                        size='sm'
                        className='h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white'
                        onClick={() => advanceTransfer(t.id, 'Recibido total')}
                      >
                        <CheckCircle2 className='mr-1 size-3.5' />
                        Recibir OK ({t.qtySent} uds)
                      </Button>
                      <Button
                        size='sm'
                        variant='outline'
                        className='h-7 text-xs border-amber-500/50 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20'
                        onClick={() => advanceTransfer(t.id, 'Cerrado con diferencias')}
                      >
                        <AlertTriangle className='mr-1 size-3.5 text-amber-600' />
                        Recibir con Rotura
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal Nuevo Traspaso */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Solicitar traspaso entre bodegas</DialogTitle>
          </DialogHeader>
          <form
            className='space-y-4 pt-2'
            onSubmit={(e) => {
              e.preventDefault()
              if (!selectedPartida || !destWh) return
              if (selectedPartida.warehouse === destWh) {
                toast.error('La bodega de destino debe ser distinta a la de origen')
                return
              }
              const q = Number(qty)
              if (!Number.isInteger(q) || q <= 0 || q > selectedPartida.qty.disponible) {
                toast.error('Cantidad inválida o superior al disponible')
                return
              }
              createTransfer(selectedPartida.warehouse, destWh, selectedPartida.id, q)
              setNewOpen(false)
            }}
          >
            <div className='space-y-1.5'>
              <label className='text-xs font-medium'>Partida de origen</label>
              <select
                required
                className='h-9 w-full rounded-md border bg-background px-2.5 text-xs'
                value={partidaId}
                onChange={(e) => setPartidaId(e.target.value)}
              >
                <option value=''>Selecciona partida con disponible…</option>
                {availPartidas.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.id} · {p.sku} ({p.warehouse} · Disp: {p.qty.disponible})
                  </option>
                ))}
              </select>
            </div>
            <div className='space-y-1.5'>
              <label className='text-xs font-medium'>Bodega de destino</label>
              <select
                required
                className='h-9 w-full rounded-md border bg-background px-2.5 text-xs'
                value={destWh}
                onChange={(e) => setDestWh(e.target.value)}
              >
                <option value=''>Selecciona bodega…</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.id} · {w.name}
                  </option>
                ))}
              </select>
            </div>
            <div className='space-y-1.5'>
              <label className='text-xs font-medium'>Cantidad a trasladar</label>
              <Input
                type='number'
                min={1}
                max={selectedPartida?.qty.disponible ?? 9999}
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                required
                className='h-9 text-xs'
              />
            </div>
            <div className='flex justify-end gap-2 pt-2'>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={() => setNewOpen(false)}
              >
                Cancelar
              </Button>
              <Button type='submit' size='sm' disabled={!selectedPartida || !destWh}>
                Crear solicitud
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Guía de Despacho Electrónica Estilizada */}
      <Dialog
        open={guideTransfer !== null}
        onOpenChange={(open) => !open && setGuideTransfer(null)}
      >
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle className='flex items-center justify-between text-sm'>
              <span>Guía de Despacho Electrónica</span>
              <Button
                size='sm'
                variant='ghost'
                className='h-7 text-xs'
                onClick={() => window.print()}
              >
                <Printer className='mr-1 size-3.5' /> Imprimir
              </Button>
            </DialogTitle>
          </DialogHeader>

          {guideTransfer && (
            <div className='rounded-lg border bg-card p-4 space-y-3 font-mono text-xs'>
              <div className='flex justify-between border-b pb-2 text-[11px]'>
                <div>
                  <div className='font-bold text-foreground'>
                    CERÁMICAS & PISOS S.A.
                  </div>
                  <div className='text-muted-foreground'>RUT: 76.432.890-K</div>
                  <div className='text-muted-foreground'>Giro: Materiales de Construcción</div>
                </div>
                <div className='text-right'>
                  <div className='font-bold text-primary'>
                    {guideTransfer.guideNumber}
                  </div>
                  <div className='text-muted-foreground'>
                    Fecha: {guideTransfer.createdAt}
                  </div>
                </div>
              </div>

              <div className='grid grid-cols-2 gap-2 text-[11px]'>
                <div>
                  <span className='text-muted-foreground'>Origen:</span>{' '}
                  <strong>{guideTransfer.originWarehouse}</strong>
                </div>
                <div>
                  <span className='text-muted-foreground'>Destino:</span>{' '}
                  <strong>{guideTransfer.destWarehouse}</strong>
                </div>
              </div>

              <div className='border-t pt-2'>
                <div className='flex justify-between font-bold text-foreground'>
                  <span>Producto / SKU</span>
                  <span>Cantidad</span>
                </div>
                <div className='flex justify-between py-1 text-muted-foreground'>
                  <span>
                    {guideTransfer.skuName} (Partida {guideTransfer.partidaId})
                  </span>
                  <span className='font-bold text-foreground'>
                    {guideTransfer.qtySent} uds
                  </span>
                </div>
              </div>

              <div className='border-t pt-2 text-[10px] text-muted-foreground flex justify-between items-center'>
                <span>Timbre Electrónico SII · Res. N° 80 de 2014</span>
                <Badge variant='outline' className='text-[9px] font-mono'>
                  {guideTransfer.status}
                </Badge>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
