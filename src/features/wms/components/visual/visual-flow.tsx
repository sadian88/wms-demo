import { Fragment } from 'react'
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  FileWarning,
  PackageCheck,
  ShieldAlert,
  ShieldCheck,
  Truck,
  UserCheck,
  type LucideIcon,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { APPROVAL_THRESHOLD_COP } from '@/features/wms/domain/inventory'
import { cop, nf } from '@/features/wms/screens/ui-helpers'

export type FlowStepStatus =
  | 'completed'
  | 'active'
  | 'pending'
  | 'warning'
  | 'error'

export interface FlowStep {
  id: string
  title: string
  subtitle?: string
  icon?: LucideIcon
  status: FlowStepStatus
  badgeText?: string
  date?: string
}

interface VisualFlowStepperProps {
  steps: FlowStep[]
  className?: string
  orientation?: 'horizontal' | 'vertical'
}

export function VisualFlowStepper({
  steps,
  className = '',
  orientation = 'horizontal',
}: VisualFlowStepperProps) {
  if (orientation === 'vertical') {
    return (
      <div className={`relative space-y-4 pl-6 ${className}`}>
        {/* Continuous line */}
        <div className='absolute bottom-2 left-2.5 top-2 w-0.5 bg-border' />

        {steps.map((step, idx) => {
          const Icon = step.icon ?? (step.status === 'completed' ? CheckCircle2 : Clock)
          const isLast = idx === steps.length - 1

          const statusStyles = {
            completed: 'bg-emerald-500 text-white border-emerald-500',
            active: 'bg-primary text-primary-foreground ring-4 ring-primary/20 animate-pulse',
            pending: 'bg-muted text-muted-foreground border-border',
            warning: 'bg-amber-500 text-white border-amber-500',
            error: 'bg-rose-500 text-white border-rose-500',
          }[step.status]

          return (
            <div key={step.id} className='relative flex items-start gap-3'>
              <div
                className={`absolute -left-6 flex size-5 items-center justify-center rounded-full border text-[10px] ${statusStyles}`}
              >
                <Icon className='size-3 shrink-0' />
              </div>

              <div className='flex-1 pb-1'>
                <div className='flex items-center justify-between gap-2'>
                  <span
                    className={`text-xs font-semibold ${
                      step.status === 'active'
                        ? 'text-foreground'
                        : step.status === 'completed'
                          ? 'text-foreground'
                          : 'text-muted-foreground'
                    }`}
                  >
                    {step.title}
                  </span>
                  {step.badgeText && (
                    <Badge variant='outline' className='text-[10px] py-0'>
                      {step.badgeText}
                    </Badge>
                  )}
                </div>
                {step.subtitle && (
                  <p className='text-[11px] text-muted-foreground'>
                    {step.subtitle}
                  </p>
                )}
                {step.date && (
                  <p className='text-[10px] text-muted-foreground mt-0.5'>
                    {step.date}
                  </p>
                )}
              </div>
              {!isLast && null}
            </div>
          )
        })}
      </div>
    )
  }

  // Horizontal Stepper
  return (
    <div className={`w-full overflow-x-auto py-2 ${className}`}>
      <div className='flex min-w-[480px] items-center justify-between gap-2'>
        {steps.map((step, idx) => {
          const Icon = step.icon ?? (step.status === 'completed' ? CheckCircle2 : Clock)
          const isLast = idx === steps.length - 1

          const statusIconStyle = {
            completed: 'bg-emerald-500 text-white border-emerald-500',
            active: 'bg-primary text-primary-foreground ring-4 ring-primary/20 shadow-sm',
            pending: 'bg-muted text-muted-foreground border-border',
            warning: 'bg-amber-500 text-white border-amber-500',
            error: 'bg-rose-500 text-white border-rose-500',
          }[step.status]

          return (
            <Fragment key={step.id}>
              <div className='flex flex-1 flex-col items-center text-center'>
                <div
                  className={`flex size-8 items-center justify-center rounded-full border transition-all ${statusIconStyle}`}
                >
                  <Icon className='size-4 shrink-0' />
                </div>
                <div className='mt-1.5 flex flex-col items-center'>
                  <span
                    className={`text-xs font-medium leading-tight ${
                      step.status === 'active'
                        ? 'font-bold text-foreground'
                        : step.status === 'completed'
                          ? 'text-foreground'
                          : 'text-muted-foreground'
                    }`}
                  >
                    {step.title}
                  </span>
                  {step.subtitle && (
                    <span className='text-[10px] text-muted-foreground'>
                      {step.subtitle}
                    </span>
                  )}
                  {step.badgeText && (
                    <Badge
                      variant={
                        step.status === 'active' ? 'default' : 'outline'
                      }
                      className='mt-1 text-[9px] py-0 px-1.5'
                    >
                      {step.badgeText}
                    </Badge>
                  )}
                </div>
              </div>

              {!isLast && (
                <div className='flex flex-1 items-center px-1'>
                  <div
                    className={`h-0.5 w-full rounded ${
                      steps[idx + 1].status === 'completed' ||
                      step.status === 'completed'
                        ? 'bg-emerald-500/80'
                        : steps[idx + 1].status === 'active'
                          ? 'bg-primary/80'
                          : 'bg-muted'
                    }`}
                  />
                </div>
              )}
            </Fragment>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Real-time Segregation Diagram for Receiving (Camión -> Disponible / Reclamo)
 */
export function LiveSegregationPipeline({
  expectedQty,
  receivedGoodQty,
  damagedQty,
  unitMeasure = 'uds',
}: {
  expectedQty: number
  receivedGoodQty: number
  damagedQty: number
  unitMeasure?: string
}) {
  const totalReceived = receivedGoodQty + damagedQty
  const missingQty = Math.max(0, expectedQty - totalReceived)

  const goodPct = expectedQty > 0 ? (receivedGoodQty / expectedQty) * 100 : 0
  const damagePct = expectedQty > 0 ? (damagedQty / expectedQty) * 100 : 0

  return (
    <div className='rounded-xl border bg-card/60 p-4 shadow-xs backdrop-blur-xs'>
      <div className='flex items-center justify-between border-b pb-3'>
        <div className='flex items-center gap-2'>
          <div className='flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary'>
            <Truck className='size-4' />
          </div>
          <div>
            <h4 className='text-xs font-semibold'>
              Segregación Física en Vivo
            </h4>
            <p className='text-[11px] text-muted-foreground'>
              Ruta automática e inmediata según estado físico
            </p>
          </div>
        </div>
        <Badge variant='outline' className='font-mono text-xs'>
          {nf(totalReceived)} / {nf(expectedQty)} {unitMeasure}
        </Badge>
      </div>

      <div className='mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 items-center'>
        {/* Source: Camión / Guía */}
        <div className='rounded-lg border bg-background p-3 text-center'>
          <span className='text-[10px] uppercase font-semibold text-muted-foreground'>
            Camión Proveedor
          </span>
          <div className='mt-1 text-xl font-bold tabular-nums'>
            {nf(expectedQty)}
            <span className='ml-1 text-xs font-normal text-muted-foreground'>
              {unitMeasure}
            </span>
          </div>
          <span className='text-[10px] text-muted-foreground'>
            Declarado en Guía
          </span>
        </div>

        {/* Fork connectors */}
        <div className='flex flex-col items-center justify-center gap-1 text-muted-foreground'>
          <div className='hidden md:flex items-center gap-1'>
            <div className='h-0.5 w-8 bg-border' />
            <ArrowRight className='size-3 text-muted-foreground' />
          </div>
          <span className='text-[10px] font-medium text-center text-muted-foreground'>
            Segregación 1:1
          </span>
        </div>

        {/* Destinos bifurcados */}
        <div className='space-y-2.5'>
          {/* Ramo 1: Disponible */}
          <div className='flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50/60 dark:border-emerald-950 dark:bg-emerald-950/20 p-2.5'>
            <div className='flex items-center gap-2'>
              <PackageCheck className='size-4 text-emerald-600 shrink-0' />
              <div>
                <div className='text-xs font-semibold text-emerald-900 dark:text-emerald-200'>
                  Apto para Venta
                </div>
                <div className='text-[10px] text-emerald-700/80 dark:text-emerald-300/80'>
                  Entra a disponible en bodega
                </div>
              </div>
            </div>
            <div className='text-end'>
              <span className='text-sm font-bold text-emerald-700 dark:text-emerald-300 tabular-nums'>
                +{nf(receivedGoodQty)}
              </span>
              <span className='block text-[10px] text-emerald-600 dark:text-emerald-400'>
                {goodPct.toFixed(0)}%
              </span>
            </div>
          </div>

          {/* Ramo 2: Dañado / Reclamo */}
          <div
            className={`flex items-center justify-between rounded-lg border p-2.5 transition-all ${
              damagedQty > 0
                ? 'border-rose-300 bg-rose-50/70 dark:border-rose-900 dark:bg-rose-950/30'
                : 'border-border bg-muted/30 opacity-70'
            }`}
          >
            <div className='flex items-center gap-2'>
              <FileWarning
                className={`size-4 shrink-0 ${
                  damagedQty > 0 ? 'text-rose-600' : 'text-muted-foreground'
                }`}
              />
              <div>
                <div
                  className={`text-xs font-semibold ${
                    damagedQty > 0
                      ? 'text-rose-900 dark:text-rose-200'
                      : 'text-muted-foreground'
                  }`}
                >
                  Apertura Reclamo
                </div>
                <div className='text-[10px] text-muted-foreground'>
                  {damagedQty > 0
                    ? 'Aislado en zona de reclamo'
                    : 'Sin roturas ni averías'}
                </div>
              </div>
            </div>
            <div className='text-end'>
              <span
                className={`text-sm font-bold tabular-nums ${
                  damagedQty > 0
                    ? 'text-rose-700 dark:text-rose-300'
                    : 'text-muted-foreground'
                }`}
              >
                {damagedQty > 0 ? `+${nf(damagedQty)}` : '0'}
              </span>
              {damagedQty > 0 && (
                <span className='block text-[10px] text-rose-600 dark:text-rose-400'>
                  {damagePct.toFixed(0)}%
                </span>
              )}
            </div>
          </div>

          {/* Ramo 3: Faltante si aplica */}
          {missingQty > 0 && (
            <div className='flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50/60 dark:border-amber-950 dark:bg-amber-950/20 p-2 text-xs'>
              <span className='text-amber-800 dark:text-amber-300 font-medium'>
                Faltante sin entregar:
              </span>
              <span className='font-bold text-amber-700 dark:text-amber-300 tabular-nums'>
                {nf(missingQty)} {unitMeasure}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Visual Decision Branch for Dual Approval Threshold in COP
 */
export function ThresholdApprovalFlow({
  amountCOP,
  amountUSD,
  compact = false,
}: {
  amountCOP?: number
  amountUSD?: number
  compact?: boolean
}) {
  const effectiveAmount = amountCOP ?? amountUSD
  const isHighValue =
    effectiveAmount !== undefined ? effectiveAmount > APPROVAL_THRESHOLD_COP : null

  if (compact) {
    return (
      <div className='flex items-center gap-2 text-xs'>
        <span className='text-muted-foreground'>Regla de aprobación:</span>
        <Badge
          variant={isHighValue ? 'destructive' : 'secondary'}
          className='font-medium'
        >
          {isHighValue
            ? `Requiere Gerencia (> ${cop(APPROVAL_THRESHOLD_COP)})`
            : `Firma Jefe de Bodega (≤ ${cop(APPROVAL_THRESHOLD_COP)})`}
        </Badge>
      </div>
    )
  }

  return (
    <div className='rounded-xl border bg-card/60 p-4'>
      <div className='flex items-center justify-between border-b pb-2 mb-3'>
        <div className='flex items-center gap-2'>
          <ShieldAlert className='size-4 text-primary' />
          <h4 className='text-xs font-semibold'>
            Matriz de Autorización Dual (Umbral {cop(APPROVAL_THRESHOLD_COP)} COP)
          </h4>
        </div>
        {effectiveAmount !== undefined && (
          <Badge
            variant={isHighValue ? 'destructive' : 'default'}
            className='font-bold tabular-nums'
          >
            Monto a autorizar: {cop(effectiveAmount)}
          </Badge>
        )}
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
        {/* Branch 1: <= Threshold */}
        <div
          className={`rounded-lg border p-3 transition-all ${
            isHighValue === false
              ? 'border-emerald-400 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/30 ring-2 ring-emerald-500/20'
              : 'border-border bg-background'
          }`}
        >
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <UserCheck className='size-4 text-emerald-600' />
              <span className='text-xs font-semibold'>Jefe de Bodega (JB)</span>
            </div>
            <Badge variant='outline' className='text-[10px]'>
              ≤ {cop(APPROVAL_THRESHOLD_COP)}
            </Badge>
          </div>
          <p className='mt-1.5 text-[11px] text-muted-foreground'>
            Firma directa e inmediata para ajustes operacionales y mermas
            rutinarias.
          </p>
        </div>

        {/* Branch 2: > Threshold */}
        <div
          className={`rounded-lg border p-3 transition-all ${
            isHighValue === true
              ? 'border-rose-400 bg-rose-50/50 dark:border-rose-900 dark:bg-rose-950/30 ring-2 ring-rose-500/20'
              : 'border-border bg-background'
          }`}
        >
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <ShieldCheck className='size-4 text-rose-600' />
              <span className='text-xs font-semibold'>Gerencia (GER)</span>
            </div>
            <Badge
              variant={isHighValue ? 'destructive' : 'outline'}
              className='text-[10px]'
            >
              &gt; {cop(APPROVAL_THRESHOLD_COP)}
            </Badge>
          </div>
          <p className='mt-1.5 text-[11px] text-muted-foreground'>
            Requiere autorización explícita para evitar pérdidas financieras de
            alto impacto.
          </p>
        </div>
      </div>
    </div>
  )
}
