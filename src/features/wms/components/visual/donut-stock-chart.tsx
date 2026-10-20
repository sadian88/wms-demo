import { useState } from 'react'
import { cop, nf } from '@/features/wms/screens/ui-helpers'

export interface DonutSegment {
  id: string
  label: string
  units: number
  valueCOP?: number
  valueUSD?: number
  color: string
}

interface DonutStockChartProps {
  segments: DonutSegment[]
  totalUnits: number
  totalCOP?: number
  totalUSD?: number
  size?: number
  strokeWidth?: number
  onSegmentClick?: (segmentId: string) => void
  selectedSegmentId?: string | null
}

function computeArcData(
  segments: DonutSegment[],
  validTotal: number,
  circumference: number
) {
  let accumulatedAngle = -90 // start from top
  return segments.map((seg) => {
    const fraction = Math.max(0, seg.units) / validTotal
    const dashLength = fraction * circumference
    const strokeDasharray = `${dashLength} ${circumference}`
    const angle = accumulatedAngle
    accumulatedAngle += fraction * 360
    return {
      ...seg,
      fraction,
      percentage: fraction * 100,
      strokeDasharray,
      angle,
    }
  })
}

export function DonutStockChart({
  segments,
  totalUnits,
  totalCOP,
  totalUSD,
  size = 200,
  strokeWidth = 26,
  onSegmentClick,
  selectedSegmentId,
}: DonutStockChartProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const radius = (size - strokeWidth) / 2
  const center = size / 2
  const circumference = 2 * Math.PI * radius

  const validTotal = Math.max(
    1,
    totalUnits > 0
      ? totalUnits
      : segments.reduce((acc, s) => acc + Math.max(0, s.units), 0)
  )

  const arcData = computeArcData(segments, validTotal, circumference)

  const activeSegment = arcData.find(
    (s) => s.id === (hoveredId || selectedSegmentId)
  )

  return (
    <div className='flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-around'>
      {/* SVG Canvas */}
      <div className='relative shrink-0' style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className='overflow-visible'
        >
          {/* Background circle track */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill='none'
            stroke='currentColor'
            strokeWidth={strokeWidth}
            className='text-muted/40'
          />

          {/* Arcs */}
          {arcData.map((seg) => {
            if (seg.units <= 0) return null
            const isHovered = hoveredId === seg.id || selectedSegmentId === seg.id
            const isOtherHovered =
              (hoveredId !== null || selectedSegmentId != null) && !isHovered

            return (
              <circle
                key={seg.id}
                cx={center}
                cy={center}
                r={radius}
                fill='none'
                stroke={seg.color}
                strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                strokeDasharray={seg.strokeDasharray}
                strokeDashoffset={0}
                transform={`rotate(${seg.angle} ${center} ${center})`}
                className='cursor-pointer transition-all duration-200'
                style={{
                  opacity: isOtherHovered ? 0.35 : 1,
                  filter: isHovered
                    ? `drop-shadow(0 2px 8px ${seg.color}55)`
                    : 'none',
                }}
                onMouseEnter={() => setHoveredId(seg.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => onSegmentClick?.(seg.id)}
              />
            )
          })}
        </svg>

        {/* Center label */}
        <div className='pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center'>
          {activeSegment ? (
            <div className='animate-in fade-in-50 duration-150 px-2'>
              <span className='block text-[11px] font-semibold text-muted-foreground truncate max-w-[120px]'>
                {activeSegment.label}
              </span>
              <span className='block text-lg font-bold tabular-nums text-foreground'>
                {nf(activeSegment.units)}
              </span>
              <span className='block text-[10px] font-medium tabular-nums text-muted-foreground'>
                {activeSegment.percentage.toFixed(1)}%
                {(activeSegment.valueCOP !== undefined || activeSegment.valueUSD !== undefined) &&
                  ` · ${cop(activeSegment.valueCOP ?? activeSegment.valueUSD ?? 0)}`}
              </span>
            </div>
          ) : (
            <div className='animate-in fade-in-50 duration-150 px-2'>
              <span className='block text-[10px] uppercase tracking-wider font-semibold text-muted-foreground'>
                Total Físico
              </span>
              <span className='block text-lg font-bold tabular-nums text-foreground'>
                {nf(totalUnits)}
              </span>
              {(totalCOP !== undefined || totalUSD !== undefined) && (
                <span className='block text-[11px] font-medium tabular-nums text-muted-foreground'>
                  {cop(totalCOP ?? totalUSD ?? 0)}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Legend list */}
      <div className='flex flex-1 flex-col gap-1.5 w-full max-w-xs'>
        {arcData.map((seg) => {
          const isSelected = hoveredId === seg.id || selectedSegmentId === seg.id
          return (
            <button
              key={seg.id}
              type='button'
              onClick={() => onSegmentClick?.(seg.id)}
              onMouseEnter={() => setHoveredId(seg.id)}
              onMouseLeave={() => setHoveredId(null)}
              className={`flex items-center justify-between rounded-md px-2.5 py-1.5 text-xs transition-colors text-start ${
                isSelected
                  ? 'bg-muted font-medium'
                  : 'hover:bg-muted/50 text-muted-foreground'
              }`}
            >
              <div className='flex items-center gap-2 min-w-0'>
                <span
                  className='size-2.5 shrink-0 rounded-full'
                  style={{ backgroundColor: seg.color }}
                />
                <span className='truncate text-foreground font-medium'>
                  {seg.label}
                </span>
              </div>
              <div className='flex items-center gap-2 pl-2 text-end tabular-nums'>
                <span className='font-semibold text-foreground'>
                  {nf(seg.units)}
                </span>
                <span className='text-[10px] text-muted-foreground w-10 text-end'>
                  ({seg.percentage.toFixed(0)}%)
                </span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
