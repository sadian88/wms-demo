import { useWms } from '@/context/wms-provider'
import useDialogState from '@/hooks/use-dialog-state'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { UserMenuContent, initials } from '@/components/layout/nav-user'
import { SignOutDialog } from '@/components/sign-out-dialog'

/** Menú de la persona en el encabezado (útil en el celular, donde el menú lateral está oculto). */
export function ProfileDropdown() {
  const { user } = useWms()
  const [open, setOpen] = useDialogState()

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            variant='ghost'
            className='relative size-9 rounded-full'
            aria-label={`Menú de ${user.name}`}
          >
            <Avatar className='size-8'>
              <AvatarFallback className='bg-accent text-xs font-semibold text-accent-foreground'>
                {initials(user.name)}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className='w-64' align='end'>
          <UserMenuContent />
          <DropdownMenuSeparator />
          <DropdownMenuItem variant='destructive' onClick={() => setOpen(true)}>
            Cerrar sesión
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <SignOutDialog open={!!open} onOpenChange={setOpen} />
    </>
  )
}
