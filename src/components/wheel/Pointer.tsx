import { motion } from 'framer-motion'
import { usePrefsStore } from '@/stores/prefsStore'
import { useId } from 'react'

interface Props {
  kick: number
  spinning?: boolean
}

export function Pointer({ kick, spinning = false }: Props) {
  const reduced = usePrefsStore((s) => s.reducedMotion)
  const id = useId()

  return (
    <div
      aria-label="Pointer"
      style={{
        position: 'absolute',
        top: '-20px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 10,
        pointerEvents: 'none',
      }}
    >
      <motion.div
        key={kick}
        initial={reduced ? false : { rotate: -12, y: -2 }}
        animate={{ rotate: 0, y: 0 }}
        transition={{ type: 'spring', stiffness: 800, damping: 18 }}
        style={{
          originX: 0.5,
          originY: 0,
          filter: spinning && !reduced
            ? `drop-shadow(0 0 5px var(--accent))`
            : `drop-shadow(0 2px 4px rgba(0,0,0,0.45))`,
        }}
      >
        <svg
          width="20"
          height="44"
          viewBox="0 0 20 44"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id={`${id}-g`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="rgba(255,255,255,0.28)" />
              <stop offset="55%" stopColor="rgba(255,255,255,0.08)" />
              <stop offset="100%" stopColor="rgba(0,0,0,0.12)" />
            </linearGradient>
          </defs>

          {/* Main dart body: kite from pivot circle down to sharp tip */}
          <path
            d="M 4 11 Q 10 1 16 11 L 10 43 Z"
            fill="var(--accent)"
          />
          {/* Highlight overlay */}
          <path
            d="M 4 11 Q 10 1 16 11 L 10 43 Z"
            fill={`url(#${id}-g)`}
          />

          {/* Pivot ball */}
          <circle
            cx="10"
            cy="7"
            r="6"
            fill="var(--accent)"
            stroke="rgba(255,255,255,0.55)"
            strokeWidth="1.5"
          />
          {/* Specular dot */}
          <circle cx="8.5" cy="5.5" r="2" fill="rgba(255,255,255,0.55)" />
        </svg>
      </motion.div>
    </div>
  )
}
