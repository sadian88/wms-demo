import { Lock, PackageCheck } from 'lucide-react'
import { useLayout } from '@/context/layout-provider'
import { useWms } from '@/context/wms-provider'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar'
import {
  SCREEN_ICONS,
  navSections,
  screenPath,
} from '@/features/wms/data/navigation'
import { NavGroup } from './nav-group'
import { NavUser } from './nav-user'
import { type NavGroup as NavGroupType } from './types'

export function AppSidebar() {
  const { collapsible, variant } = useLayout()
  const { hasAccess, showRestricted } = useWms()

  const groups: NavGroupType[] = navSections(hasAccess, showRestricted).map(
    (section) => ({
      title: section.title,
      items: section.screens.map((scr) => {
        const allowed = hasAccess(scr)
        return {
          title: scr.name,
          url: screenPath(scr.slug),
          icon: allowed ? SCREEN_ICONS[scr.slug] : Lock,
        }
      }),
    })
  )

  return (
    <Sidebar collapsible={collapsible} variant={variant}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size='lg' className='pointer-events-none'>
              <div className='flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground'>
                <PackageCheck className='size-4' />
              </div>
              <div className='grid flex-1 text-start text-sm leading-tight'>
                <span className='truncate font-semibold'>Decor Cerámicas</span>
                <span className='truncate text-xs text-muted-foreground'>
                  Control de bodega
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {groups.map((g) => (
          <NavGroup key={g.title} {...g} />
        ))}
      </SidebarContent>

      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
