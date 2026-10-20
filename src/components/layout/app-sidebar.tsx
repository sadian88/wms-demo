import {
  Activity,
  AlertTriangle,
  Boxes,
  Building2,
  ChevronsUpDown,
  Factory,
  Lock,
  PackageCheck,
  Settings2,
  ShieldAlert,
  ShoppingBag,
  Warehouse,
} from 'lucide-react'
import { useLayout } from '@/context/layout-provider'
import { useWms } from '@/context/wms-provider'
import { WMS_MODULES } from '@/features/wms/data/catalog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar'
import { sidebarData } from './data/sidebar-data'
import { NavGroup } from './nav-group'
import { NavUser } from './nav-user'
import { type NavGroup as NavGroupType } from './types'

const MODULE_ICONS: Record<number, React.ElementType> = {
  1: Activity,
  2: Boxes,
  3: PackageCheck,
  4: ShoppingBag,
  5: ShieldAlert,
  6: AlertTriangle,
  7: Settings2,
}

export function AppSidebar() {
  const { collapsible, variant } = useLayout()
  const { isMobile } = useSidebar()
  const {
    topology,
    almacenes,
    warehouses,
    warehouse,
    setWarehouse,
    showRestricted,
    hasAccess,
  } = useWms()

  const activeWh = warehouses.find((w) => w.id === warehouse)
  const activeAlm = warehouse.startsWith('ALM:')
    ? almacenes.find((a) => a.id === warehouse.replace('ALM:', ''))
    : activeWh
      ? almacenes.find((a) => a.id === activeWh.almacenId)
      : almacenes[0]

  const getHeaderTitle = () => {
    if (warehouses.length === 1 && !topology.hasHeadquarters) {
      return almacenes[0]?.name ?? 'Almacén Principal'
    }
    if (activeWh) return activeWh.name
    if (warehouse.startsWith('ALM:') && activeAlm) return activeAlm.name
    return 'Todas las bodegas'
  }

  const getHeaderSubtitle = () => {
    if (warehouses.length === 1 && !topology.hasHeadquarters) {
      return `${warehouses[0]?.name ?? 'Bodega Principal'} (Atada)`
    }
    if (activeWh) {
      return `${activeWh.almacenName} · ${activeWh.isDefaultTied ? 'Bodega por defecto' : 'Bodega adicional'}`
    }
    if (warehouse.startsWith('ALM:') && activeAlm) {
      const count = warehouses.filter((w) => w.almacenId === activeAlm.id).length
      return `Almacén · ${count} bodegas`
    }
    if (topology.hasHeadquarters) {
      return `${topology.headquartersName} · ${almacenes.length} almacenes`
    }
    return `${almacenes[0]?.name ?? 'Almacén'} · ${warehouses.length} bodegas`
  }

  const buildNavGroup = (
    title: string,
    modules: typeof WMS_MODULES
  ): NavGroupType => {
    const items = modules
      .map((mod) => {
        const visibleScreens = mod.screens.filter(
          (scr) => hasAccess(scr) || showRestricted
        )
        if (visibleScreens.length === 0) return null

        return {
          title: mod.name,
          icon: MODULE_ICONS[mod.id] || Boxes,
          items: visibleScreens.map((scr) => {
            const allowed = hasAccess(scr)
            return {
              title: scr.name,
              url: scr.slug === '1-1' ? '/' : `/wms/${scr.slug}`,
              badge: !allowed ? '🔒' : undefined,
              icon: !allowed ? Lock : undefined,
            }
          }),
        }
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)

    return { title, items }
  }

  const operationsGroup = buildNavGroup(
    'Operación',
    WMS_MODULES.filter((m) => m.id <= 4)
  )
  const managementGroup = buildNavGroup(
    'Control',
    WMS_MODULES.filter((m) => m.id > 4)
  )

  return (
    <Sidebar collapsible={collapsible} variant={variant}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size='lg'
                  className='data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground'
                >
                  <div className='flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground'>
                    {warehouse === 'ALL' && topology.hasHeadquarters ? (
                      <Building2 className='size-4' />
                    ) : warehouse.startsWith('ALM:') ? (
                      <Factory className='size-4' />
                    ) : (
                      <Warehouse className='size-4' />
                    )}
                  </div>
                  <div className='grid flex-1 text-start text-sm leading-tight'>
                    <span className='truncate font-semibold'>
                      {getHeaderTitle()}
                    </span>
                    <span className='truncate text-xs text-muted-foreground'>
                      {getHeaderSubtitle()}
                    </span>
                  </div>
                  <ChevronsUpDown className='ms-auto size-4' />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className='w-(--radix-dropdown-menu-trigger-width) min-w-72 rounded-lg'
                align='start'
                side={isMobile ? 'bottom' : 'right'}
                sideOffset={4}
              >
                <DropdownMenuLabel className='text-xs text-muted-foreground'>
                  {topology.hasHeadquarters
                    ? `Casa Matriz · ${almacenes.length} Almacenes`
                    : `${almacenes[0]?.name ?? 'Almacén Único'} (Sin Casa Matriz)`}
                </DropdownMenuLabel>

                {warehouses.length > 1 && (
                  <>
                    <DropdownMenuItem
                      onClick={() => setWarehouse('ALL')}
                      className='gap-2 p-2'
                    >
                      <div className='flex size-6 items-center justify-center rounded-sm border'>
                        <Building2 className='size-3.5 shrink-0' />
                      </div>
                      <div className='flex flex-col'>
                        <span className='text-xs font-medium'>
                          Todas las bodegas (Consolidado)
                        </span>
                        <span className='text-[11px] text-muted-foreground'>
                          {topology.hasHeadquarters
                            ? `${topology.headquartersName} · ${almacenes.length} almacenes · ${warehouses.length} bodegas`
                            : `${almacenes[0]?.name} · ${warehouses.length} bodegas`}
                        </span>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}

                {almacenes.map((alm) => {
                  const almWarehouses = warehouses.filter(
                    (w) => w.almacenId === alm.id
                  )
                  return (
                    <div key={alm.id}>
                      {almacenes.length > 1 && (
                        <DropdownMenuItem
                          onClick={() => setWarehouse(`ALM:${alm.id}`)}
                          className='gap-2 p-2'
                        >
                          <div className='flex size-6 items-center justify-center rounded-sm border bg-muted/50'>
                            <Factory className='size-3.5 shrink-0' />
                          </div>
                          <div className='flex flex-1 flex-col'>
                            <span className='text-xs font-semibold'>
                              {alm.name} (Todo el almacén)
                            </span>
                            <span className='text-[11px] text-muted-foreground'>
                              {alm.city} · {almWarehouses.length} bodegas
                            </span>
                          </div>
                        </DropdownMenuItem>
                      )}
                      {almWarehouses.map((w) => (
                        <DropdownMenuItem
                          key={w.id}
                          onClick={() => setWarehouse(w.id)}
                          className='gap-2 p-2 ps-4'
                        >
                          <div className='flex size-6 items-center justify-center rounded-sm border'>
                            <Warehouse className='size-3.5 shrink-0' />
                          </div>
                          <div className='flex flex-1 flex-col'>
                            <span className='text-xs font-medium'>
                              {w.name}
                            </span>
                            <span className='text-[11px] text-muted-foreground'>
                              {w.isDefaultTied
                                ? 'Bodega por defecto (atada al almacén)'
                                : 'Bodega adicional'}{' '}
                              · {w.id}
                            </span>
                          </div>
                        </DropdownMenuItem>
                      ))}
                    </div>
                  )
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {operationsGroup.items.length > 0 && <NavGroup {...operationsGroup} />}
        {managementGroup.items.length > 0 && <NavGroup {...managementGroup} />}
      </SidebarContent>

      <SidebarFooter>
        <NavUser user={sidebarData.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
