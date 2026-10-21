import { storageGet, storageRemove, storageSet } from './storage'

const SESSION_KEY = 'wms-decor:session'

/** Usuario con sesión iniciada (demo: se guarda solo en este navegador). */
export function getSessionUserId(): string | null {
  return storageGet(SESSION_KEY)
}

export function setSessionUserId(userId: string): void {
  storageSet(SESSION_KEY, userId)
}

export function clearSession(): void {
  storageRemove(SESSION_KEY)
}
