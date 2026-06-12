import React, { useCallback, useId, useMemo } from 'react'
import { readableTextColor } from '@/core/palette'
import type { Sector } from '@/core/types'
import type { SpinState } from '@/core/spin-engine'

interface Props {
  sectors: Sector[]
  rotation: number
  highlightIndex: number | null
  onSectorHover: (index: number | null) => void
  reducedMotion: boolean
  spinState: SpinState
}

const R = 200
const CX = 220
const CY = 220
const VIEWBOX = `0 0 ${CX * 2} ${CY * 2}`
// When sector has emoji: avatar at R*0.76, label smaller at R*0.46
// When no emoji: label at mid-radius R*0.63
const LABEL_R_DEFAULT = R * 0.63
const LABEL_R_WITH_AVATAR = R * 0.46
const AVATAR_R = R * 0.76

function polarToXY(angle: number, r: number, cx: number, cy: number) {
  const rad = ((angle - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function sectorPath(
  startAngle: number,
  endAngle: number,
  r: number,
  cx: number,
  cy: number,
) {
  const s = polarToXY(startAngle, r, cx, cy)
  const e = polarToXY(endAngle, r, cx, cy)
  const largeArc = endAngle - startAngle > 180 ? 1 : 0
  return [
    `M ${cx} ${cy}`,
    `L ${s.x.toFixed(2)} ${s.y.toFixed(2)}`,
    `A ${r} ${r} 0 ${largeArc} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`,
    'Z',
  ].join(' ')
}

function clampFontSize(label: string, maxPx: number): number {
  if (label.length <= 4) return Math.min(maxPx, 16)
  if (label.length <= 8) return Math.max(10, Math.min(maxPx, 14))
  if (label.length <= 14) return Math.max(9, Math.min(maxPx, 11))
  return 8
}

export const WheelSvg = React.memo(function WheelSvg({
  sectors,
  rotation,
  highlightIndex,
  onSectorHover,
  reducedMotion,
  spinState,
}: Props) {
  const n = sectors.length
  const step = 360 / n
  const gradientId = useId()

  const isSpin = spinState !== 'idle' && spinState !== 'celebrating'

  const paths = useMemo(
    () =>
      sectors.map((sector, i) => {
        const start = i * step
        const end = (i + 1) * step
        const mid = start + step / 2
        const textColor = readableTextColor(sector.color)
        const hasEmoji = Boolean(sector.emoji)
        const labelR = hasEmoji ? LABEL_R_WITH_AVATAR : LABEL_R_DEFAULT
        const labelPos = polarToXY(mid, labelR, CX, CY)
        const avatarPos = polarToXY(mid, AVATAR_R, CX, CY)
        const path = sectorPath(start, end, R, CX, CY)
        const fontSize = hasEmoji
          ? Math.min(12, 200 / n)
          : clampFontSize(sector.label, 15)
        const avatarFontSize = Math.min(28, 320 / n)
        const isHighlighted = highlightIndex === i
        const scale = isHighlighted ? 1.045 : 1
        const textRotate = mid - 90
        return { i, path, sector, textColor, labelPos, avatarPos, fontSize, avatarFontSize, scale, isHighlighted, textRotate, hasEmoji }
      }),
    [sectors, step, highlightIndex, n],
  )

  const handleMouseEnter = useCallback(
    (i: number) => onSectorHover(i),
    [onSectorHover],
  )
  const handleMouseLeave = useCallback(() => onSectorHover(null), [onSectorHover])

  // Lv1: animate rim stroke-dashoffset to create a chasing light effect
  const rimStroke = spinState === 'cruising'
    ? 'var(--accent-2)'
    : spinState === 'accelerating'
      ? 'var(--accent)'
      : 'var(--wheel-rim)'

  return (
    <svg
      viewBox={VIEWBOX}
      aria-hidden="true"
      style={{
        width: '100%',
        height: '100%',
        transform: `rotate(${rotation}deg)`,
        transformOrigin: 'center',
        willChange: reducedMotion ? 'auto' : 'transform',
      }}
    >
      <defs>
        <radialGradient id={`${gradientId}-rim`} cx="50%" cy="50%" r="50%">
          <stop offset="80%" stopColor="transparent" />
          <stop offset="100%" stopColor="var(--wheel-rim)" stopOpacity="0.7" />
        </radialGradient>

        {/* Lv3: spotlight cutout — a dark ring that vignettes the wheel */}
        <radialGradient id={`${gradientId}-vignette`} cx="50%" cy="50%" r="50%">
          <stop offset="60%" stopColor="transparent" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.35)" />
        </radialGradient>

        <filter id={`${gradientId}-glow`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id={`${gradientId}-highlight`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Sectors */}
      {paths.map(({ i, path, sector, textColor, labelPos, avatarPos, fontSize, avatarFontSize, scale, isHighlighted, textRotate, hasEmoji }) => (
        <g
          key={sector.id}
          style={{
            transform: `scale(${scale})`,
            transformOrigin: `${CX}px ${CY}px`,
            transition: reducedMotion ? 'none' : 'transform 0.18s cubic-bezier(0.34,1.56,0.64,1)',
            cursor: isSpin ? 'default' : 'pointer',
          }}
          onMouseEnter={() => !isSpin && handleMouseEnter(i)}
          onMouseLeave={handleMouseLeave}
          role="presentation"
        >
          <path
            d={path}
            fill={sector.color}
            stroke="var(--bg-primary)"
            strokeWidth={isHighlighted ? 3 : 1.5}
            filter={isHighlighted && !reducedMotion ? `url(#${gradientId}-highlight)` : undefined}
          />

          {/* Sector inner shine for highlighted */}
          {isHighlighted && !reducedMotion && (
            <path
              d={path}
              fill={`url(#${gradientId}-rim)`}
              opacity={0.4}
              pointerEvents="none"
            />
          )}

          {hasEmoji && (
            <text
              x={avatarPos.x}
              y={avatarPos.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={avatarFontSize}
              style={{ userSelect: 'none' }}
              transform={`rotate(${textRotate}, ${avatarPos.x}, ${avatarPos.y})`}
            >
              {sector.emoji}
            </text>
          )}

          <text
            x={labelPos.x}
            y={labelPos.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={fontSize}
            fontWeight={700}
            fill={textColor}
            opacity={isHighlighted ? 1 : 0.95}
            style={{ userSelect: 'none', fontFamily: 'var(--font-body)' }}
            transform={`rotate(${textRotate}, ${labelPos.x}, ${labelPos.y})`}
          >
            {sector.label}
          </text>
        </g>
      ))}

      {/* Rim overlay */}
      <circle
        cx={CX}
        cy={CY}
        r={R}
        fill={`url(#${gradientId}-rim)`}
        stroke={rimStroke}
        strokeWidth={spinState === 'cruising' ? 4 : 2.5}
        pointerEvents="none"
        style={{
          transition: reducedMotion ? 'none' : 'stroke 0.4s ease, stroke-width 0.3s ease',
        }}
      />

      {/* Lv1: chasing light arc on rim during acceleration */}
      {!reducedMotion && (spinState === 'accelerating' || spinState === 'cruising') && (
        <circle
          cx={CX}
          cy={CY}
          r={R}
          fill="none"
          stroke="var(--accent-2)"
          strokeWidth={6}
          strokeDasharray={`${R * 0.4} ${R * (2 * Math.PI - 0.4)}`}
          strokeLinecap="round"
          opacity={0.7}
          pointerEvents="none"
        >
          <animateTransform
            attributeName="transform"
            type="rotate"
            from={`0 ${CX} ${CY}`}
            to={`360 ${CX} ${CY}`}
            dur={spinState === 'cruising' ? '0.7s' : '1.2s'}
            repeatCount="indefinite"
          />
        </circle>
      )}

      {/* Center hub */}
      <circle
        cx={CX}
        cy={CY}
        r={36}
        fill="var(--bg-primary)"
        stroke="var(--wheel-rim)"
        strokeWidth={2}
        pointerEvents="none"
      />
    </svg>
  )
})
