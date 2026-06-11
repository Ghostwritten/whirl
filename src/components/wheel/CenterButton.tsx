import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { usePrefsStore } from '@/stores/prefsStore'
import type { SpinState } from '@/core/spin-engine'

interface Props {
  spinState: SpinState
  onClick: () => void
}

const IDLE_STATES: SpinState[] = ['idle', 'landed', 'celebrating']

export function CenterButton({ spinState, onClick }: Props) {
  const { t } = useTranslation()
  const reduced = usePrefsStore((s) => s.reducedMotion)
  const isActive = IDLE_STATES.includes(spinState)
  const isSpinning = !isActive

  return (
    <motion.button
      onClick={onClick}
      disabled={isSpinning}
      aria-label={isSpinning ? t('wheel.spinning') : t('wheel.spin')}
      whileHover={!isSpinning && !reduced ? { scale: 1.08 } : undefined}
      whileTap={!isSpinning && !reduced ? { scale: 0.95 } : undefined}
      animate={
        !reduced && spinState === 'accelerating'
          ? { scale: [1, 1.06, 1], opacity: [1, 0.9, 1] }
          : { scale: 1, opacity: 1 }
      }
      transition={
        spinState === 'accelerating'
          ? { duration: 0.6, repeat: Infinity }
          : { duration: 0.1 }
      }
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 72,
        height: 72,
        borderRadius: '50%',
        border: '3px solid var(--bg-primary)',
        background: isSpinning
          ? 'var(--center-btn-hover)'
          : 'var(--center-btn)',
        color: '#fff',
        fontWeight: 700,
        fontSize: 13,
        letterSpacing: '0.05em',
        cursor: isSpinning ? 'not-allowed' : 'pointer',
        boxShadow: isSpinning
          ? '0 0 0 3px var(--accent-glow)'
          : '0 2px 12px var(--accent-glow), 0 0 0 3px var(--wheel-rim)',
        zIndex: 5,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'background 0.2s, box-shadow 0.2s',
      }}
    >
      {isSpinning ? (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="2.5" />
          <path d="M12 2 a10 10 0 0 1 10 10" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      ) : (
        t('wheel.spin')
      )}
    </motion.button>
  )
}
