import { useState } from 'react'
import {
  Building2,
  Factory,
  Palette,
  SlidersHorizontal,
  Users,
  Warehouse,
} from 'lucide-react'
import { toast } from 'sonner'
import { fonts } from '@/config/fonts'
import { useFont } from '@/context/font-provider'
import { useTheme } from '@/context/theme-provider'
import { useWms } from '@/context/wms-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { WMS_ROLES, type RoleCode } from '@/features/wms/data/catalog'
import {
  TOPOLOGY_SCENARIOS,
  type WmsWarehouse,
} from '@/features/wms/data/topology-data'

export function SettingsScreen({
  activeSlug,
  onNavigate,
}: {
  activeSlug: string
  onNavigate: (slug: string) => void
}) {
  const { font, setFont } = useFont()
  const { theme, setTheme } = useTheme()
  const {
    role,
    setRole,
    scenario,
    setScenario,
    topology,
    almacenes,
    warehouses,
    warehouse,
    setWarehouse,
    showRestricted,
    setShowRestricted,
    isReadOnly,
    updateOperationalParams,
  } = useWms()

  const [editingWh, setEditingWh] = useState<WmsWarehouse | null>(null)
  const [whSchedule, setWhSchedule] = useState('')
  const [whCutoff, setWhCutoff] = useState('')
  const [whManager, setWhManager] = useState('')

  const sideNavItems = [
    {
      title: 'Bodegas y estructura',
      slug: '7-1',
      icon: Warehouse,
    },
    {
      title: 'Usuarios y perfiles',
      slug: '7-2',
      icon: Users,
    },
    {
      title: 'Apariencia',
      slug: '7-3',
      icon: Palette,
    },
  ]

  const activeTab = sideNavItems.some((i) => i.slug === activeSlug)
    ? activeSlug
    : '7-1'

  const openEditWh = (w: WmsWarehouse) => {
    setEditingWh(w)
    setWhSchedule(w.schedule)
    setWhCutoff(w.cutoff)
    setWhManager(w.manager)
  }

  return (
    <div className='space-y-6'>
      <div className='space-y-0.5'>
        <h1 className='text-2xl font-bold tracking-tight md:text-3xl'>
          Configuración
        </h1>
        <p className='text-sm text-muted-foreground'>
          Administra la estructura contratada de almacenes y bodegas, los 4
          perfiles de usuario, el catálogo de productos y la apariencia.
        </p>
      </div>

      <Separator className='my-4' />

      <div className='flex flex-1 flex-col space-y-6 lg:flex-row lg:space-y-0 lg:space-x-12'>
        <aside className='top-0 lg:sticky lg:w-1/5'>
          <nav className='flex space-x-2 overflow-x-auto lg:flex-col lg:space-y-1 lg:space-x-0'>
            {sideNavItems.map((item) => {
              const Icon = item.icon
              const isActive = activeTab === item.slug
              return (
                <button
                  key={item.slug}
                  type='button'
                  onClick={() => onNavigate(item.slug)}
                  className={`inline-flex items-center gap-2.5 rounded-md px-3 py-2 text-start text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-muted text-foreground'
                      : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                  }`}
                >
                  <Icon className='size-4 shrink-0' />
                  <span className='truncate'>{item.title}</span>
                </button>
              )
            })}
          </nav>
        </aside>

        <div className='flex-1 lg:max-w-3xl'>
          {/* 7.1 Bodegas y estructura */}
          {activeTab === '7-1' && (
            <div className='space-y-6'>
              <div>
                <h3 className='text-lg font-medium'>
                  Estructura Contratada y Alcance Operativo
                </h3>
                <p className='text-sm text-muted-foreground'>
                  Todo Almacén incluye por defecto una Bodega atada. La
                  contratación de Casa Matriz, Almacenes o Bodegas adicionales
                  se realiza en el sistema comercial.
                </p>
              </div>
              <Separator />

              <div className='space-y-3'>
                <div className='flex items-center justify-between'>
                  <span className='text-sm font-semibold'>
                    1. Plan / Topología Contratada (3 Casos Comerciales)
                  </span>
                  <Badge variant='outline' className='text-xs'>
                    Suscripción SaaS
                  </Badge>
                </div>
                <div className='grid grid-cols-1 gap-3'>
                  {Object.values(TOPOLOGY_SCENARIOS).map((sc) => {
                    const isCurrent = scenario === sc.id
                    return (
                      <button
                        key={sc.id}
                        type='button'
                        onClick={() => setScenario(sc.id)}
                        className={`flex flex-col items-start justify-between gap-2 rounded-lg border p-4 text-start transition-colors sm:flex-row sm:items-center ${
                          isCurrent
                            ? 'border-primary bg-primary/5 ring-1 ring-primary'
                            : 'bg-card hover:bg-muted/40'
                        }`}
                      >
                        <div className='space-y-1'>
                          <div className='flex flex-wrap items-center gap-2'>
                            <span className='text-sm font-semibold'>
                              {sc.title}
                            </span>
                            <Badge variant={isCurrent ? 'default' : 'secondary'}>
                              {sc.badge}
                            </Badge>
                          </div>
                          <p className='text-xs text-muted-foreground'>
                            {sc.subtitle}
                          </p>
                        </div>
                        <Badge
                          variant={isCurrent ? 'default' : 'outline'}
                          className='shrink-0'
                        >
                          {isCurrent ? 'Plan Activo' : 'Simular caso'}
                        </Badge>
                      </button>
                    )
                  })}
                </div>
              </div>

              <Separator />

              <div className='space-y-3'>
                <span className='block text-sm font-semibold'>
                  2. Selección de Alcance Activo y Parámetros Operativos
                </span>

                <button
                  type='button'
                  onClick={() => setWarehouse('ALL')}
                  className={`flex w-full items-center justify-between rounded-lg border p-4 text-start transition-colors ${
                    warehouse === 'ALL'
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'bg-card hover:bg-muted/40'
                  }`}
                >
                  <div className='flex items-center gap-3'>
                    <div className='flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary'>
                      <Building2 className='size-5' />
                    </div>
                    <div>
                      <div className='text-sm font-semibold'>
                        {topology.hasHeadquarters
                          ? `Todas las Bodegas (${topology.headquartersName})`
                          : `Consolidado ${almacenes[0]?.name} (${warehouses.length} ${
                              warehouses.length === 1 ? 'bodega' : 'bodegas'
                            })`}
                      </div>
                      <div className='text-xs text-muted-foreground'>
                        {topology.hasHeadquarters
                          ? `Casa Matriz · ${almacenes.length} almacenes y ${warehouses.length} bodegas habilitadas`
                          : `Sin Casa Matriz · Operación directa sobre ${almacenes[0]?.name}`}
                      </div>
                    </div>
                  </div>
                  <Badge variant={warehouse === 'ALL' ? 'default' : 'outline'}>
                    {warehouse === 'ALL' ? 'Activo' : 'Seleccionar'}
                  </Badge>
                </button>

                <div className='space-y-4 pt-1'>
                  {almacenes.map((alm) => {
                    const almBodegas = warehouses.filter(
                      (w) => w.almacenId === alm.id
                    )
                    const isAlmSelected = warehouse === `ALM:${alm.id}`
                    return (
                      <div
                        key={alm.id}
                        className='overflow-hidden rounded-lg border bg-card'
                      >
                        <div className='flex flex-wrap items-center justify-between gap-2 border-b bg-muted/30 px-4 py-3'>
                          <div className='flex items-center gap-2.5'>
                            <Factory className='size-4 text-primary' />
                            <div>
                              <div className='text-sm font-semibold'>
                                {alm.name}{' '}
                                <span className='font-normal text-muted-foreground'>
                                  ({alm.id})
                                </span>
                              </div>
                              <div className='text-xs text-muted-foreground'>
                                {alm.city} · {alm.address}
                              </div>
                            </div>
                          </div>
                          {almacenes.length > 1 && (
                            <Button
                              size='sm'
                              variant={isAlmSelected ? 'default' : 'outline'}
                              onClick={() => setWarehouse(`ALM:${alm.id}`)}
                            >
                              {isAlmSelected
                                ? 'Almacén Activo'
                                : 'Ver todo el Almacén'}
                            </Button>
                          )}
                        </div>

                        <div className='divide-y p-2'>
                          {almBodegas.map((w) => {
                            const selected = warehouse === w.id
                            return (
                              <div
                                key={w.id}
                                className={`flex flex-wrap items-center justify-between gap-2 rounded-md p-3 transition-colors ${
                                  selected
                                    ? 'bg-primary/10 text-foreground'
                                    : 'hover:bg-muted/40'
                                }`}
                              >
                                <button
                                  type='button'
                                  onClick={() => setWarehouse(w.id)}
                                  className='flex flex-1 items-center gap-3 text-start'
                                >
                                  <div className='flex size-8 items-center justify-center rounded-md bg-muted text-foreground'>
                                    <Warehouse className='size-4' />
                                  </div>
                                  <div>
                                    <div className='flex flex-wrap items-center gap-2 text-sm font-semibold'>
                                      <span>{w.name}</span>
                                      <span className='text-xs font-normal text-muted-foreground'>
                                        ({w.id})
                                      </span>
                                      <Badge
                                        variant={
                                          w.isDefaultTied
                                            ? 'secondary'
                                            : 'outline'
                                        }
                                        className='text-[10px]'
                                      >
                                        {w.isDefaultTied
                                          ? 'Por defecto (Atada)'
                                          : 'Adicional'}
                                      </Badge>
                                    </div>
                                    <div className='text-xs text-muted-foreground'>
                                      Responsable: {w.manager} · Horario:{' '}
                                      {w.schedule} · Corte: {w.cutoff}
                                    </div>
                                  </div>
                                </button>
                                <div className='flex items-center gap-2'>
                                  {!isReadOnly && (
                                    <Button
                                      size='sm'
                                      variant='ghost'
                                      onClick={() => openEditWh(w)}
                                    >
                                      <SlidersHorizontal className='mr-1 size-3.5' />
                                      Parámetros
                                    </Button>
                                  )}
                                  <Badge
                                    variant={selected ? 'default' : 'outline'}
                                  >
                                    {selected ? 'Activa' : 'Elegir'}
                                  </Badge>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* 7.2 Usuarios y perfiles */}
          {activeTab === '7-2' && (
            <div className='space-y-6'>
              <div>
                <h3 className='text-lg font-medium'>
                  Perfiles de Usuario (4 Roles Operativos)
                </h3>
                <p className='text-sm text-muted-foreground'>
                  Cambia de perfil para comprobar las pantallas autorizadas y
                  las reglas de aprobación por monto.
                </p>
              </div>
              <Separator />

              <div className='flex items-center justify-between rounded-lg border bg-card p-4'>
                <div className='space-y-0.5'>
                  <div className='text-sm font-medium'>
                    Mostrar pantallas restringidas en el menú (🔒)
                  </div>
                  <div className='text-xs text-muted-foreground'>
                    Permite ver con candado las opciones no habilitadas para el
                    perfil activo.
                  </div>
                </div>
                <Switch
                  checked={showRestricted}
                  onCheckedChange={setShowRestricted}
                />
              </div>

              <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                {Object.values(WMS_ROLES).map((r) => {
                  const selected = role === r.code
                  return (
                    <button
                      key={r.code}
                      type='button'
                      onClick={() => setRole(r.code)}
                      className={`flex flex-col items-start gap-1.5 rounded-lg border p-4 text-start transition-colors ${
                        selected
                          ? 'border-primary bg-primary/5 ring-1 ring-primary'
                          : 'bg-card hover:bg-muted/40'
                      }`}
                    >
                      <div className='flex w-full items-center justify-between'>
                        <span className='text-sm font-semibold'>{r.name}</span>
                        <Badge variant={selected ? 'default' : 'secondary'}>
                          {r.code}
                        </Badge>
                      </div>
                      <p className='text-xs text-muted-foreground'>
                        {r.description}
                      </p>
                    </button>
                  )
                })}
              </div>

              <div className='rounded-lg border bg-card'>
                <table className='w-full text-xs'>
                  <thead>
                    <tr className='border-b bg-muted/40 text-start text-muted-foreground'>
                      <th className='px-4 py-2.5 text-start font-medium'>
                        Usuario
                      </th>
                      <th className='px-4 py-2.5 text-start font-medium'>
                        Perfil
                      </th>
                      <th className='px-4 py-2.5 text-start font-medium'>
                        Alcance
                      </th>
                      <th className='px-4 py-2.5 text-end font-medium'>
                        Simular
                      </th>
                    </tr>
                  </thead>
                  <tbody className='divide-y'>
                    {[
                      {
                        name: 'Andrés Morales',
                        email: 'a.morales@ceramix.cl',
                        r: 'ADM' as RoleCode,
                        wh: 'ALL',
                      },
                      {
                        name: 'Roberto Méndez',
                        email: 'r.mendez@ceramix.cl',
                        r: 'JB' as RoleCode,
                        wh: 'BOD-CEN-01',
                      },
                      {
                        name: 'Carlos Muñoz',
                        email: 'c.munoz@ceramix.cl',
                        r: 'OPE' as RoleCode,
                        wh: 'BOD-CEN-01',
                      },
                      {
                        name: 'Gonzalo Rojas',
                        email: 'g.rojas@ceramix.cl',
                        r: 'GER' as RoleCode,
                        wh: 'ALL',
                      },
                    ].map((u) => (
                      <tr key={u.email} className='hover:bg-muted/30'>
                        <td className='px-4 py-3'>
                          <div className='font-medium'>{u.name}</div>
                          <div className='text-muted-foreground'>{u.email}</div>
                        </td>
                        <td className='px-4 py-3'>
                          <Badge variant='secondary'>
                            {u.r} · {WMS_ROLES[u.r]?.name}
                          </Badge>
                        </td>
                        <td className='px-4 py-3 text-muted-foreground'>
                          {u.wh === 'ALL' ? 'Todas las Bodegas' : u.wh}
                        </td>
                        <td className='px-4 py-3 text-end'>
                          <Button
                            size='sm'
                            variant='outline'
                            onClick={() => {
                              setRole(u.r)
                              setWarehouse(u.wh)
                              toast.success(
                                `Simulando sesión de ${u.name} (${u.r})`
                              )
                            }}
                          >
                            Usar perfil
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 7.3 Apariencia */}
          {activeTab === '7-3' && (
            <div className='space-y-6'>
              <div>
                <h3 className='text-lg font-medium'>Apariencia y Tipografía</h3>
                <p className='text-sm text-muted-foreground'>
                  Personaliza la fuente del sistema y el modo de color.
                </p>
              </div>
              <Separator />

              <div className='space-y-4'>
                <div>
                  <label className='text-sm font-medium'>
                    Fuente del sistema
                  </label>
                  <div className='mt-2 flex flex-wrap gap-2'>
                    {fonts.map((f) => (
                      <Button
                        key={f}
                        type='button'
                        variant={font === f ? 'default' : 'outline'}
                        size='sm'
                        className='capitalize'
                        onClick={() => setFont(f)}
                      >
                        {f}
                      </Button>
                    ))}
                  </div>
                </div>

                <Separator />

                <div>
                  <label className='text-sm font-medium'>Tema de color</label>
                  <div className='mt-2 flex flex-wrap gap-2'>
                    {(['light', 'dark', 'system'] as const).map((t) => (
                      <Button
                        key={t}
                        type='button'
                        variant={theme === t ? 'default' : 'outline'}
                        size='sm'
                        className='capitalize'
                        onClick={() => setTheme(t)}
                      >
                        {t === 'light'
                          ? 'Claro'
                          : t === 'dark'
                            ? 'Oscuro'
                            : 'Sistema'}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal edición de parámetros operativos de bodega */}
      <Dialog
        open={!!editingWh}
        onOpenChange={(open) => !open && setEditingWh(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Parámetros Operativos · {editingWh?.name}
            </DialogTitle>
          </DialogHeader>
          {editingWh && (
            <form
              className='space-y-3 pt-2 text-xs'
              onSubmit={(e) => {
                e.preventDefault()
                updateOperationalParams(editingWh.id, {
                  schedule: whSchedule.trim(),
                  cutoff: whCutoff.trim(),
                  manager: whManager.trim(),
                })
                setEditingWh(null)
              }}
            >
              <div className='space-y-1'>
                <label className='font-medium'>Jefe de Bodega responsable</label>
                <Input
                  required
                  value={whManager}
                  onChange={(e) => setWhManager(e.target.value)}
                />
              </div>
              <div className='space-y-1'>
                <label className='font-medium'>Horario de atención</label>
                <Input
                  required
                  value={whSchedule}
                  onChange={(e) => setWhSchedule(e.target.value)}
                />
              </div>
              <div className='space-y-1'>
                <label className='font-medium'>Hora de corte operativa</label>
                <Input
                  required
                  value={whCutoff}
                  onChange={(e) => setWhCutoff(e.target.value)}
                />
              </div>
              <div className='flex justify-end gap-2 pt-2'>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => setEditingWh(null)}
                >
                  Cancelar
                </Button>
                <Button type='submit'>Guardar cambios</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

