import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { SignOutDialog } from './sign-out-dialog'

const navigate = vi.fn()
const reset = vi.fn()
const clearSession = vi.fn()

vi.mock('@/lib/session', () => ({ clearSession: () => clearSession() }))

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: () => ({
    auth: { reset },
  }),
}))

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    useNavigate: () => navigate,
  }
})

describe('SignOutDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('clears the session and navigates to sign-in', async () => {
    const { getByRole } = await render(
      <SignOutDialog open onOpenChange={vi.fn()} />
    )

    await userEvent.click(getByRole('button', { name: /^Cerrar sesión$/i }))

    expect(reset).toHaveBeenCalledOnce()
    expect(clearSession).toHaveBeenCalledOnce()
    expect(navigate).toHaveBeenCalledWith({ to: '/sign-in', replace: true })
  })

  it('does not call reset or navigate when Cancel is clicked', async () => {
    const { getByRole } = await render(
      <SignOutDialog open onOpenChange={vi.fn()} />
    )

    await userEvent.click(getByRole('button', { name: /^Cancelar$/i }))

    expect(reset).not.toHaveBeenCalled()
    expect(clearSession).not.toHaveBeenCalled()
    expect(navigate).not.toHaveBeenCalled()
  })
})
