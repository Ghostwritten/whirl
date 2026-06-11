import { motion } from 'framer-motion'
import { usePrefsStore } from '@/stores/prefsStore'

interface Props {
  kick: number
}

export function Pointer({ kick }: Props) {
  const reduced = usePrefsStore((s) => s.reducedMotion)

  return (
    <div
      aria-label="Pointer"
      style={{
        position: 'absolute',
        top: '-12px',
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
        initial={reduced ? false : { rotate: -12, y: -4 }}
        animate={{ rotate: 0, y: 0 }}
        transition={{ type: 'spring', stiffness: 900, damping: 18, duration: 0.25 }}
        style={{ originX: 0.5, originY: 0 }}
      >
        <svg width="28" height="44" viewBox="0 0 28 44" fill="none">
          <polygon
            points="14,4 26,42 14,36 2,42"
            fill="var(--pointer-color)"
            stroke="var(--bg-primary)"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <circle cx="14" cy="4" r="4" fill="var(--pointer-color)" stroke="var(--bg-primary)" strokeWidth="1.5" />
        </svg>
      </motion.div>
    </div>
  )
}
