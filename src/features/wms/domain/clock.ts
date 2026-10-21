/** «Hoy» de la demostración: los datos semilla están construidos alrededor de esta fecha. */
export const TODAY_STR = '2026-10-20'

export function nowTimestamp(): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${TODAY_STR} ${pad(now.getHours())}:${pad(now.getMinutes())}`
}
