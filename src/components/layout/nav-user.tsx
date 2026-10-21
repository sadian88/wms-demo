import { Link } from '@tanstack/react-router'
import { ChevronsUpDown, LogOut, Palette, Repeat } from 'lucide-react'
import { useWms } from '@/context/wms-provider'
import useDialogState from '@/hooks/use-dialog-state'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { SignOutDialog } from '@/components/sign-out-dialog'
import { WMS_ROLES } from '@/features/wms/data/catalog'

// eslint-disable-next-line react-refresh/only-export-components
export function initials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

/** Contenido del menú de la persona: se comparte entre el menú lateral y el encabezado. */
export function UserMenuContent() {
  const { user, users, switchUser } = useWms()
  const activeUsers = users.filter((u) => u.active)

  return (
    <>
      <DropdownMenuLabel className='font-normal'>
        <div className='flex flex-col gap-0.5'>
          <span className='text-sm font-medium'>{user.name}</span>
          <span className='text-xs text-muted-foreground'>
            {WMS_ROLES[user.role].name} · {user.email}
          </span>
        </div>
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuGroup>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Repeat className='size-4' />
            Cambiar de usuario
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className='max-h-80 w-64 overflow-y-auto'>
            <DropdownMenuLabel className='text-xs font-normal text-muted-foreground'>
              Solo para la demostración
            </DropdownMenuLabel>
            {activeUsers.map((u) => (
              <DropdownMenuItem
                key={u.id}
                onClick={() => switchUser(u.id)}
                className='flex-col items-start gap-0'
              >
                <span className='text-sm font-medium'>
                  {u.name}
                  {u.id === user.id ? ' · tú' : ''}
                </span>
                <span className='text-xs text-muted-foreground'>
                  {WMS_ROLES[u.role].name}
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuItem asChild>
          <Link to='/wms/$code' params={{ code: '7-3' }}>
            <Palette className='size-4' />
            Apariencia
          </Link>
        </DropdownMenuItem>
      </DropdownMenuGroup>
    </>
  )
}

export function NavUser() {
  const { isMobile } = useSidebar()
  const { user } = useWms()
  const [open, setOpen] = useDialogState()

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size='lg'
                className='data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground'
              >
                <Avatar className='h-8 w-8 rounded-lg'>
                  <AvatarFallback className='rounded-lg bg-accent text-xs font-semibold text-accent-foreground'>
                    {initials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <div className='grid flex-1 text-start text-sm leading-tight'>
                  <span className='truncate font-semibold'>{user.name}</span>
                  <span className='truncate text-xs text-muted-foreground'>
                    {WMS_ROLES[user.role].name}
                  </span>
                </div>
                <ChevronsUpDown className='ms-auto size-4' />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className='w-(--radix-dropdown-menu-trigger-width) min-w-64 rounded-lg'
              side={isMobile ? 'bottom' : 'right'}
              align='end'
              sideOffset={4}
            >
              <UserMenuContent />
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant='destructive'
                onClick={() => setOpen(true)}
              >
                <LogOut />
                Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      <SignOutDialog open={!!open} onOpenChange={setOpen} />
    </>
  )
}
