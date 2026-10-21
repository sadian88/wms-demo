/**
 * Acceso seguro a localStorage: el almacenamiento puede estar bloqueado
 * (modo privado, cuota llena) y la app debe seguir funcionando en memoria.
 */
const memory = new Map<string, string>()

export function storageGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return memory.get(key) ?? null
  }
}

export function storageSet(key: string, value: string): boolean {
  try {
    window.localStorage.setItem(key, value)
    return true
  } catch {
    memory.set(key, value)
    return false
  }
}

export function storageRemove(key: string): void {
  try {
    window.localStorage.removeItem(key)
  } catch {
    // nada que limpiar
  }
  memory.delete(key)
}
