import { createFileRoute, redirect } from '@tanstack/react-router'
import { getSessionUserId } from '@/lib/session'
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'
import { resolveSessionUser } from '@/features/wms/data/persistence'

export const Route = createFileRoute('/_authenticated')({
  // Sin sesión válida no se entra a ninguna pantalla del WMS.
  beforeLoad: ({ location }) => {
    if (!resolveSessionUser(getSessionUserId())) {
      throw redirect({
        to: '/sign-in',
        search: { redirect: location.href },
        replace: true,
      })
    }
  },
  component: AuthenticatedLayout,
})
