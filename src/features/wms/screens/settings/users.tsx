import { useState } from 'react'
import { Pencil, Plus, RotateCcw, UserPlus } from 'lucide-react'
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
import { ConfirmDialog } from '@/components/confirm-dialog'
import { WMS_ROLES } from '@/features/wms/data/catalog'
import { DEMO_PIN, type WmsUser } from '@/features/wms/data/users-data'
import type { RoleCode } from '@/features/wms/domain/inventory'
import {
  Field,
  ListRow,
  SELECT_CLASS,
  Section,
  StatusPill,
} from '../../components/kit'

function initials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function UsersSettings() {
  const {
    user: me,
    users,
    warehouses,
    createUser,
    updateUser,
    showRestricted,
    setShowRestricted,
    resetDemoData,
  } = useWms()

  const [editing, setEditing] = useState<WmsUser | 'new' | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<RoleCode>('OPE')
  const [allWarehouses, setAllWarehouses] = useState(true)
  const [picked, setPicked] = useState<string[]>([])
  const [pin, setPin] = useState('')

  const openDialog = (u: WmsUser | 'new') => {
    setEditing(u)
    if (u === 'new') {
      setName('')
      setEmail('')
      setRole('OPE')
      setAllWarehouses(false)
      setPicked(warehouses[0] ? [warehouses[0].id] : [])
      setPin('')
    } else {
      setName(u.name)
      setEmail(u.email)
      setRole(u.role)
      setAllWarehouses(u.scope === 'ALL')
      setPicked(u.scope === 'ALL' ? [] : u.scope)
      setPin('')
    }
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const scope = allWarehouses ? 'ALL' : picked
    if (!allWarehouses && picked.length === 0) return
    const ok =
      editing === 'new'
        ? createUser({ name, email, role, scope, pin: pin || undefined })
        : editing
          ? updateUser(editing.id, {
              name: name.trim(),
              role,
              scope,
              ...(pin ? { pin } : {}),
            })
          : false
    if (ok) setEditing(null)
  }

  return (
    <>
      <Section
        title='Usuarios'
        hint='Cada movimiento queda registrado a nombre de la persona que lo hizo.'
        action={
          <Button onClick={() => openDialog('new')}>
            <UserPlus /> Nuevo usuario
          </Button>
        }
        flush
      >
        <div className='divide-y'>
          {users.map((u) => (
            <ListRow
              key={u.id}
              trailing={
                <div className='flex items-center gap-2'>
                  <Switch
                    checked={u.active}
                    onCheckedChange={(v) => updateUser(u.id, { active: v })}
                    disabled={u.id === me.id}
                    aria-label={`${u.active ? 'Desactivar' : 'Activar'} a ${u.name}`}
                  />
                  <Button
                    size='icon'
                    variant='ghost'
                    onClick={() => openDialog(u)}
                    aria-label={`Editar a ${u.name}`}
                  >
                    <Pencil />
                  </Button>
                </div>
              }
            >
              <div className='flex items-center gap-3'>
                <span className='flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground'>
                  {initials(u.name)}
                </span>
                <div className='min-w-0'>
                  <div className='flex flex-wrap items-center gap-2'>
                    <span className='truncate text-sm font-medium'>
                      {u.name}
                    </span>
                    <StatusPill tone={u.active ? 'info' : 'neutral'}>
                      {WMS_ROLES[u.role].name}
                    </StatusPill>
                    {!u.active && (
                      <StatusPill tone='danger'>Inactivo</StatusPill>
                    )}
                  </div>
                  <div className='truncate text-sm text-muted-foreground'>
                    {u.email} ·{' '}
                    {u.scope === 'ALL'
                      ? 'Todas las bodegas'
                      : u.scope.join(', ')}
                  </div>
                </div>
              </div>
            </ListRow>
          ))}
        </div>
      </Section>

      <Section title='Qué puede hacer cada perfil'>
        <details className='group'>
          <summary className='cursor-pointer text-sm font-medium text-primary'>
            Ver los 6 perfiles
          </summary>
          <dl className='mt-3 divide-y'>
            {Object.values(WMS_ROLES).map((r) => (
              <div key={r.code} className='py-2.5'>
                <dt className='text-sm font-medium'>{r.name}</dt>
                <dd className='text-sm text-muted-foreground'>
                  {r.description}
                </dd>
              </div>
            ))}
          </dl>
        </details>
      </Section>

      <Section title='Demostración'>
        <div className='space-y-4'>
          <label className='flex items-center justify-between gap-4'>
            <span>
              <span className='block text-sm font-medium'>
                Mostrar pantallas bloqueadas en el menú
              </span>
              <span className='block text-sm text-muted-foreground'>
                Para enseñar qué no puede ver cada perfil.
              </span>
            </span>
            <Switch
              checked={showRestricted}
              onCheckedChange={setShowRestricted}
            />
          </label>
          <div className='flex items-center justify-between gap-4 border-t pt-4'>
            <span>
              <span className='block text-sm font-medium'>
                Restablecer datos de ejemplo
              </span>
              <span className='block text-sm text-muted-foreground'>
                Borra los cambios hechos en este navegador y vuelve al punto de
                partida.
              </span>
            </span>
            <Button variant='outline' onClick={() => setConfirmReset(true)}>
              <RotateCcw /> Restablecer
            </Button>
          </div>
        </div>
      </Section>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing === 'new' ? 'Nuevo usuario' : 'Editar usuario'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className='space-y-4'>
            <Field label='Nombre completo' required>
              <Input
                required
                className='h-10'
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
            <Field label='Correo' required>
              <Input
                required
                type='email'
                className='h-10'
                value={email}
                disabled={editing !== 'new'}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <Field label='Perfil' hint={WMS_ROLES[role].description} required>
              <select
                className={SELECT_CLASS}
                value={role}
                onChange={(e) => setRole(e.target.value as RoleCode)}
              >
                {Object.values(WMS_ROLES).map((r) => (
                  <option key={r.code} value={r.code}>
                    {r.name}
                  </option>
                ))}
              </select>
            </Field>

            <fieldset className='space-y-2'>
              <legend className='text-sm font-medium'>
                Bodegas a las que accede
              </legend>
              <label className='flex items-center gap-2 text-sm'>
                <input
                  type='checkbox'
                  className='size-4'
                  checked={allWarehouses}
                  onChange={(e) => setAllWarehouses(e.target.checked)}
                />
                Todas las bodegas
              </label>
              {!allWarehouses && (
                <div className='space-y-1.5 ps-6'>
                  {warehouses.map((w) => (
                    <label
                      key={w.id}
                      className='flex items-center gap-2 text-sm'
                    >
                      <input
                        type='checkbox'
                        className='size-4'
                        checked={picked.includes(w.id)}
                        onChange={(e) =>
                          setPicked((prev) =>
                            e.target.checked
                              ? [...prev, w.id]
                              : prev.filter((x) => x !== w.id)
                          )
                        }
                      />
                      {w.name}
                    </label>
                  ))}
                  {picked.length === 0 && (
                    <p className='text-sm text-danger-ink'>
                      Elige al menos una bodega.
                    </p>
                  )}
                </div>
              )}
            </fieldset>

            <Field
              label={editing === 'new' ? 'Clave inicial' : 'Nueva clave'}
              hint={
                editing === 'new'
                  ? `Si lo dejas vacío se usa ${DEMO_PIN}.`
                  : 'Déjalo vacío para conservar la actual.'
              }
            >
              <Input
                className='h-10'
                value={pin}
                onChange={(e) => setPin(e.target.value)}
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
              <Button type='submit'>
                {editing === 'new' ? (
                  <>
                    <Plus /> Crear usuario
                  </>
                ) : (
                  'Guardar'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title='¿Restablecer los datos de ejemplo?'
        desc='Se borran pedidos, facturas, recepciones y usuarios nuevos creados en este navegador. Esta acción no se puede deshacer.'
        confirmText='Sí, restablecer'
        cancelBtnText='Cancelar'
        destructive
        handleConfirm={resetDemoData}
      />
    </>
  )
}
