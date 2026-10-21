import { TODAY_STR } from '@/features/wms/domain/clock'
import {
  CRITICAL_STALE_DAYS,
  EXPIRY_WARN_DAYS,
  STALE_DAYS,
  daysBetween,
  type Partida,
  type StockState,
} from '@/features/wms/domain/inventory'

/** Orden en que se muestran los 5 estados del stock, de más a menos «sano». */
export const STOCK_STATES: StockState[] = [
  'disponible',
  'reservado',
  'transito',
  'reclamo',
  'danado',
]

/**
 * Etiqueta y colores de cada estado. El color sale de los tokens de estado del
 * tema (verde, cobalto, gris, ámbar, coral) y siempre se acompaña del nombre.
 */
export const STOCK_STATE_META: Record<
  StockState,
  { label: string; dot: string; bar: string; stroke: string }
> = {
  disponible: {
    label: 'Disponible',
    dot: 'bg-success',
    bar: 'bg-success',
    stroke: 'stroke-success',
  },
  reservado: {
    label: 'Reservado',
    dot: 'bg-info',
    bar: 'bg-info',
    stroke: 'stroke-info',
  },
  transito: {
    label: 'En tránsito',
    dot: 'bg-muted-foreground/50',
    bar: 'bg-muted-foreground/50',
    stroke: 'stroke-muted-foreground/50',
  },
  reclamo: {
    label: 'En reclamo',
    dot: 'bg-warning',
    bar: 'bg-warning',
    stroke: 'stroke-warning',
  },
  danado: {
    label: 'Dañado',
    dot: 'bg-danger',
    bar: 'bg-danger',
    stroke: 'stroke-danger',
  },
}

/** Porcentaje legible: «68 %», «<1 %» o «0 %». */
export function pctLabel(part: number, total: number): string {
  if (total <= 0 || part <= 0) return '0 %'
  const pct = (part / total) * 100
  if (pct < 1) return '<1 %'
  return `${Math.round(pct)} %`
}

/** Alertas de una partida, listas para mostrar como `StatusPill`. */
export function partidaAlerts(p: Partida): {
  key: string
  tone: 'warning' | 'danger'
  label: string
}[] {
  const alerts: { key: string; tone: 'warning' | 'danger'; label: string }[] =
    []
  if (p.expiry) {
    const left = daysBetween(TODAY_STR, p.expiry)
    if (left < 0) {
      alerts.push({ key: 'expiry', tone: 'danger', label: 'Vencida' })
    } else if (left <= EXPIRY_WARN_DAYS) {
      alerts.push({
        key: 'expiry',
        tone: left <= 14 ? 'danger' : 'warning',
        label: `Vence en ${left} d`,
      })
    }
  }
  if (p.qty.disponible > 0) {
    const idle = daysBetween(p.lastOutAt, TODAY_STR)
    if (idle >= STALE_DAYS) {
      alerts.push({
        key: 'stale',
        tone: idle >= CRITICAL_STALE_DAYS ? 'danger' : 'warning',
        label: `Rezagada ${idle} d`,
      })
    }
  }
  if (p.qty.danado + p.qty.reclamo > 0) {
    alerts.push({
      key: 'problem',
      tone: p.qty.danado > 0 ? 'danger' : 'warning',
      label: p.qty.danado > 0 ? 'Con daño' : 'En reclamo',
    })
  }
  return alerts
}
