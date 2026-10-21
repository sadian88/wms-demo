import { useState } from 'react'
import { Pencil } from 'lucide-react'
import { useWms } from '@/context/wms-provider'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  TOPOLOGY_SCENARIOS,
  type WmsWarehouse,
} from '@/features/wms/data/topology-data'
import { Field, ListRow, Section, StatusPill } from '../../components/kit'

export function StructureSettings() {
  const {
    role,
    scenario,
    setScenario,
    almacenes,
    warehouses,
    updateOperationalParams,
  } = useWms()
  const canEdit = role === 'ADM'
  const [editing, setEditing] = useState<WmsWarehouse | null>(null)
  const [manager, setManager] = useState('')
  const [schedule, setSchedule] = useState('')
  const [cutoff, setCutoff] = useState('')

  const openEdit = (w: WmsWarehouse) => {
    setEditing(w)
    setManager(w.manager)
    setSchedule(w.schedule)
    setCutoff(w.cutoff)
  }

  return (
    <>
      <Section
        title='Estructura contratada'
        hint='Casa matriz, almacenes y bodegas se contratan con el plan; aquí se ve cuál está activo.'
        flush
      >
        <div className='divide-y'>
          {Object.values(TOPOLOGY_SCENARIOS).map((sc) => (
            <ListRow
              key={sc.id}
              selected={scenario === sc.id}
              onClick={canEdit ? () => setScenario(sc.id) : undefined}
              trailing={
                scenario === sc.id ? (
                  <StatusPill tone='info'>Activo</StatusPill>
                ) : undefined
              }
            >
              <div className='text-sm font-medium'>{sc.badge}</div>
              <div className='text-sm text-muted-foreground'>{sc.subtitle}</div>
            </ListRow>
          ))}
        </div>
      </Section>

      {almacenes.map((alm) => (
        <Section
          key={alm.id}
          title={alm.name}
          hint={`${alm.city} · ${alm.schedule}`}
          flush
        >
          <div className='divide-y'>
            {warehouses
              .filter((w) => w.almacenId === alm.id)
              .map((w) => (
                <ListRow
                  key={w.id}
                  trailing={
                    canEdit ? (
                      <Button
                        size='sm'
                        variant='outline'
                        onClick={() => openEdit(w)}
                      >
                        <Pencil /> Editar
                      </Button>
                    ) : undefined
                  }
                >
                  <div className='flex flex-wrap items-center gap-2'>
                    <span className='text-sm font-medium'>{w.name}</span>
                    <StatusPill tone={w.isDefaultTied ? 'neutral' : 'info'}>
                      {w.isDefaultTied ? 'Por defecto' : 'Adicional'}
                    </StatusPill>
                  </div>
                  <div className='text-sm text-muted-foreground'>
                    {w.manager} · {w.schedule} · Corte {w.cutoff}
                  </div>
                </ListRow>
              ))}
          </div>
        </Section>
      ))}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.name}</DialogTitle>
          </DialogHeader>
          {editing && (
            <form
              className='space-y-4'
              onSubmit={(e) => {
                e.preventDefault()
                updateOperationalParams(editing.id, {
                  manager: manager.trim(),
                  schedule: schedule.trim(),
                  cutoff: cutoff.trim(),
                })
                setEditing(null)
              }}
            >
              <Field label='Jefe de bodega responsable' required>
                <Input
                  required
                  className='h-10'
                  value={manager}
                  onChange={(e) => setManager(e.target.value)}
                />
              </Field>
              <Field label='Horario de atención' required>
                <Input
                  required
                  className='h-10'
                  value={schedule}
                  onChange={(e) => setSchedule(e.target.value)}
                />
              </Field>
              <Field
                label='Hora de corte'
                hint='Después de esta hora los pedidos pasan al día siguiente.'
                required
              >
                <Input
                  required
                  className='h-10'
                  value={cutoff}
                  onChange={(e) => setCutoff(e.target.value)}
                />
              </Field>
              <div className='flex justify-end gap-2 pt-1'>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => setEditing(null)}
                >
                  Cancelar
                </Button>
                <Button type='submit'>Guardar</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
