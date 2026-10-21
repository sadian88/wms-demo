import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { storageGet } from '@/lib/storage'
import { UserAuthForm } from './user-auth-form'

const navigate = vi.fn()
const setUserMock = vi.fn()
const setAccessTokenMock = vi.fn()

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: () => ({
    auth: {
      setUser: setUserMock,
      setAccessToken: setAccessTokenMock,
    },
  }),
}))

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return { ...actual, useNavigate: () => navigate }
})

async function renderForm(redirectTo?: string) {
  const screen = await render(<UserAuthForm redirectTo={redirectTo} />)
  return {
    screen,
    email: screen.getByRole('textbox', { name: /^Correo$/i }),
    password: screen.getByLabelText(/^Clave$/i),
    submit: screen.getByRole('button', { name: /^Ingresar$/i }),
  }
}

describe('UserAuthForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.localStorage.clear()
  })

  it('renders email, password and submit button', async () => {
    const { email, password, submit } = await renderForm()
    await expect.element(email).toBeInTheDocument()
    await expect.element(password).toBeInTheDocument()
    await expect.element(submit).toBeInTheDocument()
  })

  it('asks for the email when submitting an empty form', async () => {
    const { screen, submit } = await renderForm()
    await userEvent.click(submit)
    await expect
      .element(screen.getByText('Escribe tu correo.'))
      .toBeInTheDocument()
    expect(navigate).not.toHaveBeenCalled()
  })

  it('rejects a wrong password with a clear message', async () => {
    const { screen, email, password, submit } = await renderForm()
    await userEvent.fill(email, 'marcela.ortiz@decor.demo')
    await userEvent.fill(password, 'mala')
    await userEvent.click(submit)
    await expect.element(screen.getByText(/no coinciden/i)).toBeInTheDocument()
    expect(navigate).not.toHaveBeenCalled()
    expect(storageGet('wms-decor:session')).toBeNull()
  })

  it('signs in an administrator and goes to the summary', async () => {
    const { email, password, submit } = await renderForm()
    await userEvent.fill(email, 'Marcela.Ortiz@decor.demo')
    await userEvent.fill(password, '1234')
    await userEvent.click(submit)

    expect(storageGet('wms-decor:session')).toBe('USR-01')
    expect(setUserMock).toHaveBeenCalledOnce()
    expect(setAccessTokenMock).toHaveBeenCalledOnce()
    expect(navigate).toHaveBeenCalledWith({ to: '/', replace: true })
  })

  it('sends a warehouse operator straight to the delivery screen', async () => {
    const { email, password, submit } = await renderForm('/wms/2-1')
    await userEvent.fill(email, 'camilo.rojas@decor.demo')
    await userEvent.fill(password, '1234')
    await userEvent.click(submit)

    expect(navigate).toHaveBeenCalledWith({ to: '/wms/4-2', replace: true })
  })

  it('respects the saved destination for users who start on the summary', async () => {
    const { email, password, submit } = await renderForm('/wms/2-1')
    await userEvent.fill(email, 'marcela.ortiz@decor.demo')
    await userEvent.fill(password, '1234')
    await userEvent.click(submit)

    expect(navigate).toHaveBeenCalledWith({ to: '/wms/2-1', replace: true })
  })
})
