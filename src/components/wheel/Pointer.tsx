import { motion } from 'framer-motion'
import { usePrefsStore } from '@/stores/prefsStore'

interface Props {
  kick: number
  spinning?: boolean
}

export function Pointer({ kick, spinning = false }: Props) {
  const reduced = usePrefsStore((s) => s.reducedMotion)

  // 8 radial tick marks around the base circle
  const ticks = Array.from({ length: 8 }, (_, i) => {
    const angle = (i * 360) / 8
    const rad = (angle * Math.PI) / 180
    const cx = 20
    const cy = 14
    const r1 = 9
    const r2 = 12
    return {
      x1: cx + r1 * Math.sin(rad),
      y1: cy - r1 * Math.cos(rad),
      x2: cx + r2 * Math.sin(rad),
      y2: cy - r2 * Math.cos(rad),
    }
  })

  const glowFilter = spinning && !reduced
    ? 'drop-shadow(0 0 6px var(--accent))'
    : undefined

  return (
    <div
      aria-label="Pointer"
      style={{
        position: 'absolute',
        top: '-14px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        pointerEvents: 'none',
      }}
    >
      <motion.div
        key={kick}
        initial={reduced ? false : { rotate: -10 }}
        animate={{ rotate: 0 }}
        transition={{ type: 'spring', stiffness: 700, damping: 16, duration: 0.3 }}
        style={{ originX: 0.5, originY: 0, filter: glowFilter }}
      >
        <svg
          width="40"
          height="90"
          viewBox="0 0 40 90"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Outer ring of base circle */}
          <circle
            cx="20"
            cy="14"
            r="13"
            fill="var(--pointer-color)"
            stroke="var(--bg-primary)"
            strokeWidth="1.5"
          />

          {/* Inner concentric ring */}
          <circle
            cx="20"
            cy="14"
            r="9"
            fill="none"
            stroke="var(--bg-primary)"
            strokeWidth="1"
            opacity="0.5"
          />

          {/* Center jewel */}
          <circle
            cx="20"
            cy="14"
            r="4"
            fill="var(--accent-2)"
            stroke="var(--bg-primary)"
            strokeWidth="0.75"
          />

          {/* Radial tick marks */}
          {ticks.map((tick, i) => (
            <line
              key={i}
              x1={tick.x1}
              y1={tick.y1}
              x2={tick.x2}
              y2={tick.y2}
              stroke="var(--bg-primary)"
              strokeWidth="0.75"
              opacity="0.6"
            />
          ))}

          {/* Tapered body — from ~16px wide at circle bottom to ~8px at shoulder */}
          <path
            d="M 12 24 L 8 56 L 32 56 L 28 24 Z"
            fill="var(--pointer-color)"
            stroke="var(--bg-primary)"
            strokeWidth="1"
            strokeLinejoin="round"
          />

          {/* Decorative engraving lines on body */}
          <line x1="11" y1="32" x2="29" y2="32" stroke="var(--bg-primary)" strokeWidth="0.5" opacity="0.3" />
          <line x1="10" y1="40" x2="30" y2="40" stroke="var(--bg-primary)" strokeWidth="0.5" opacity="0.3" />
          <line x1="9"  y1="48" x2="31" y2="48" stroke="var(--bg-primary)" strokeWidth="0.5" opacity="0.3" />

          {/* Diamond/lozenge arrowhead at bottom (tip at bottom) */}
          <path
            d="M 20 90 L 8 58 L 20 65 L 32 58 Z"
            fill="var(--pointer-color)"
            stroke="var(--bg-primary)"
            strokeWidth="1"
            strokeLinejoin="round"
          />
        </svg>
      </motion.div>
    </div>
  )
}
