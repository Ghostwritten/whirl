import React, { useCallback, useId, useMemo } from 'react'
import { readableTextColor } from '@/core/palette'
import type { Sector } from '@/core/types'

interface Props {
  sectors: Sector[]
  rotation: number
  highlightIndex: number | null
  onSectorHover: (index: number | null) => void
  reducedMotion: boolean
}

const R = 200
const CX = 220
const CY = 220
const VIEWBOX = `0 0 ${CX * 2} ${CY * 2}`
const LABEL_R = R * 0.65
const EMOJI_R = R * 0.88

function polarToXY(angle: number, r: number, cx: number, cy: number) {
  const rad = ((angle - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function sectorPath(startAngle: number, endAngle: number, r: number, cx: number, cy: number) {
  const s = polarToXY(startAngle, r, cx, cy)
  const e = polarToXY(endAngle, r, cx, cy)
  const largeArc = endAngle - startAngle > 180 ? 1 : 0
  return [
    `M ${cx} ${cy}`,
    `L ${s.x} ${s.y}`,
    `A ${r} ${r} 0 ${largeArc} 1 ${e.x} ${e.y}`,
    'Z',
  ].join(' ')
}

function clampFontSize(label: string, maxPx: number): number {
  const baseSize = Math.min(maxPx, 16)
  if (label.length <= 4) return baseSize
  if (label.length <= 8) return Math.max(10, baseSize - 2)
  return Math.max(8, baseSize - 4)
}

export const WheelSvg = React.memo(function WheelSvg({
  sectors,
  rotation,
  highlightIndex,
  onSectorHover,
  reducedMotion,
}: Props) {
  const n = sectors.length
  const step = 360 / n
  const gradientId = useId()

  const paths = useMemo(
    () =>
      sectors.map((sector, i) => {
        const start = i * step
        const end = (i + 1) * step
        const mid = start + step / 2
        const label = sector.label
        const emoji = sector.emoji
        const textColor = readableTextColor(sector.color)
        const labelPos = polarToXY(mid, LABEL_R, CX, CY)
        const emojiPos = polarToXY(mid, EMOJI_R, CX, CY)
        const path = sectorPath(start, end, R, CX, CY)
        const fontSize = clampFontSize(label, 14)
        const isHighlighted = highlightIndex === i
        const scale = isHighlighted ? 1.04 : 1
        const textRotate = mid - 90

        return {
          i,
          path,
          color: sector.color,
          textColor,
          label,
          emoji,
          labelPos,
          emojiPos,
          fontSize,
          scale,
          isHighlighted,
          textRotate,
          sectorId: sector.id,
        }
      }),
    [sectors, step, highlightIndex],
  )

  const handleMouseEnter = useCallback(
    (i: number) => onSectorHover(i),
    [onSectorHover],
  )
  const handleMouseLeave = useCallback(
    () => onSectorHover(null),
    [onSectorHover],
  )

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
          <stop offset="85%" stopColor="transparent" />
          <stop offset="100%" stopColor="var(--wheel-rim)" stopOpacity="0.8" />
        </radialGradient>
        <filter id={`${gradientId}-glow`}>
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {paths.map(({ i, path, color, textColor, label, emoji, labelPos, emojiPos, fontSize, scale, isHighlighted, textRotate, sectorId }) => (
        <g
          key={sectorId}
          style={{
            transform: `scale(${scale})`,
            transformOrigin: `${CX}px ${CY}px`,
            transition: reducedMotion ? 'none' : 'transform 0.15s ease',
          }}
          onMouseEnter={() => handleMouseEnter(i)}
          onMouseLeave={handleMouseLeave}
          role="presentation"
        >
          <path
            d={path}
            fill={color}
            stroke="var(--bg-primary)"
            strokeWidth={isHighlighted ? 3 : 1.5}
            filter={isHighlighted && !reducedMotion ? `url(#${gradientId}-glow)` : undefined}
          />
          {emoji && (
            <text
              x={emojiPos.x}
              y={emojiPos.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={12}
              style={{ userSelect: 'none' }}
              transform={`rotate(${textRotate}, ${emojiPos.x}, ${emojiPos.y})`}
            >
              {emoji}
            </text>
          )}
          <text
            x={labelPos.x}
            y={labelPos.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={fontSize}
            fontWeight={600}
            fill={textColor}
            style={{ userSelect: 'none', fontFamily: 'var(--font-body)' }}
            transform={`rotate(${textRotate}, ${labelPos.x}, ${labelPos.y})`}
          >
            {label}
          </text>
        </g>
      ))}

      {/* Rim overlay */}
      <circle
        cx={CX}
        cy={CY}
        r={R}
        fill={`url(#${gradientId}-rim)`}
        stroke="var(--wheel-rim)"
        strokeWidth={3}
        pointerEvents="none"
      />

      {/* Sector dividers */}
      {paths.map(({ i }) => {
        const angle = i * step
        const pt = polarToXY(angle, R, CX, CY)
        return (
          <line
            key={i}
            x1={CX}
            y1={CY}
            x2={pt.x}
            y2={pt.y}
            stroke="var(--bg-primary)"
            strokeWidth={1.5}
            opacity={0.5}
            pointerEvents="none"
          />
        )
      })}
    </svg>
  )
})
