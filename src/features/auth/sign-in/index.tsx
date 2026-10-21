import { useSearch } from '@tanstack/react-router'
import { PackageCheck } from 'lucide-react'
import { DemoUserList, UserAuthForm } from './components/user-auth-form'

export function SignIn() {
  const { redirect } = useSearch({ from: '/(auth)/sign-in' })

  return (
    <div className='flex min-h-svh items-center justify-center bg-background px-4 py-8'>
      <div className='w-full max-w-md space-y-6'>
        <div className='flex flex-col items-center gap-3 text-center'>
          <div className='flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground'>
            <PackageCheck className='size-6' />
          </div>
          <div>
            <h1 className='text-2xl font-semibold tracking-tight'>
              Decor Cerámicas
            </h1>
            <p className='text-sm text-muted-foreground'>
              Control de bodega, entregas y facturas
            </p>
          </div>
        </div>

        <div className='space-y-6 rounded-xl border bg-card p-5 sm:p-6'>
          <UserAuthForm redirectTo={redirect} />
          <div className='border-t pt-5'>
            <DemoUserList redirectTo={redirect} />
          </div>
        </div>
      </div>
    </div>
  )
}
