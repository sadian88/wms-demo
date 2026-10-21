import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { LogIn } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { setSessionUserId } from '@/lib/session'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/password-input'
import { WMS_ROLES, landingSlugForRole } from '@/features/wms/data/catalog'
import { loadUsers } from '@/features/wms/data/persistence'
import { type WmsUser } from '@/features/wms/data/users-data'

type AuthApi = ReturnType<typeof useAuthStore.getState>['auth']

/** Abre la sesión de la persona y la lleva a su pantalla de trabajo. */
function completeSignIn(
  user: WmsUser,
  auth: AuthApi,
  navigate: ReturnType<typeof useNavigate>,
  redirectTo?: string
) {
  setSessionUserId(user.id)
  auth.setUser({
    accountNo: user.id,
    email: user.email,
    role: [user.role],
    exp: new Date().getTime() + 24 * 60 * 60 * 1000,
  })
  auth.setAccessToken(`session-${user.id}`)
  const landing = landingSlugForRole(user.role)
  const fallback = landing === '1-1' ? '/' : `/wms/${landing}`
  // El destino guardado solo se respeta si la persona arranca en el resumen.
  navigate({
    to: redirectTo && landing === '1-1' ? redirectTo : fallback,
    replace: true,
  })
}

interface UserAuthFormProps extends React.HTMLAttributes<HTMLFormElement> {
  redirectTo?: string
}

export function UserAuthForm({
  className,
  redirectTo,
  ...props
}: UserAuthFormProps) {
  const navigate = useNavigate()
  const { auth } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) {
      setError('Escribe tu correo.')
      return
    }
    if (!password) {
      setError('Escribe tu clave.')
      return
    }
    const user = loadUsers().find(
      (u) => u.email.toLowerCase() === email.trim().toLowerCase()
    )
    if (!user || user.pin !== password) {
      setError('El correo o la clave no coinciden. Revisa e intenta de nuevo.')
      return
    }
    if (!user.active) {
      setError(
        'Este usuario está desactivado. Pide a un administrador que lo active.'
      )
      return
    }
    setError(null)
    completeSignIn(user, auth, navigate, redirectTo)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={cn('grid gap-4', className)}
      noValidate
      {...props}
    >
      <div className='grid gap-1.5'>
        <label htmlFor='login-email' className='text-sm font-medium'>
          Correo
        </label>
        <Input
          id='login-email'
          type='email'
          autoComplete='username'
          placeholder='nombre@decor.demo'
          className='h-11'
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className='grid gap-1.5'>
        <label htmlFor='login-password' className='text-sm font-medium'>
          Clave
        </label>
        <PasswordInput
          id='login-password'
          autoComplete='current-password'
          placeholder='Tu clave'
          className='[&_input]:h-11'
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      {error && (
        <p role='alert' className='text-sm text-danger-ink'>
          {error}
        </p>
      )}
      <Button type='submit' className='h-11 text-base'>
        <LogIn /> Ingresar
      </Button>
    </form>
  )
}

/** Acceso rápido para la demostración: entra directo como ese usuario. */
export function DemoUserList({ redirectTo }: { redirectTo?: string }) {
  const navigate = useNavigate()
  const { auth } = useAuthStore()
  const users = loadUsers().filter((u) => u.active)

  return (
    <div className='space-y-2'>
      <p className='text-sm font-medium'>Entrar como (demostración)</p>
      <ul className='grid gap-1.5 sm:grid-cols-2'>
        {users.map((u) => (
          <li key={u.id}>
            <button
              type='button'
              onClick={() => completeSignIn(u, auth, navigate, redirectTo)}
              className='flex w-full items-center gap-3 rounded-lg border bg-card px-3 py-2 text-start transition-colors hover:bg-accent'
            >
              <span className='flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground'>
                {u.name
                  .split(' ')
                  .map((p) => p[0])
                  .slice(0, 2)
                  .join('')}
              </span>
              <span className='min-w-0'>
                <span className='block truncate text-sm font-medium'>
                  {u.name}
                </span>
                <span className='block truncate text-xs text-muted-foreground'>
                  {WMS_ROLES[u.role].name}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      <p className='text-xs text-muted-foreground'>
        Clave de todos los usuarios de demostración: 1234
      </p>
    </div>
  )
}
