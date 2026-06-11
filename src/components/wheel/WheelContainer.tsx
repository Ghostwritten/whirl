import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { WheelSvg } from './WheelSvg'
import { Pointer } from './Pointer'
import { CenterButton } from './CenterButton'
import { useWheelStore } from '@/stores/wheelStore'
import { useSessionStore } from '@/stores/sessionStore'
import { useHistoryStore } from '@/stores/historyStore'
import { usePrefsStore } from '@/stores/prefsStore'
import { mulberry32 } from '@/core/probability'
import { planSpin, frameAt, transition, boundaryCrossings, sectorAtPointer } from '@/core/spin-engine'
import { audioEngine } from '@/audio/audioEngine'
import type { SpinState } from '@/core/spin-engine'

let seedCounter = Date.now()

export function WheelContainer() {
  const { t } = useTranslation()
  const wheel = useWheelStore((s) => s.getActiveWheel())
  const excludeWinner = useWheelStore((s) => s.excludeWinner)
  const addRecord = useHistoryStore((s) => s.addRecord)
  const reduced = usePrefsStore((s) => s.reducedMotion)
  const { volumeBgm, volumeSfx } = usePrefsStore()

  const spinState = useSessionStore((s) => s.spinState)
  const currentAngle = useSessionStore((s) => s.currentAngle)
  const pendingResult = useSessionStore((s) => s.pendingResult)
  const setSpinState = useSessionStore((s) => s.setSpinState)
  const setAngle = useSessionStore((s) => s.setAngle)
  const setPendingResult = useSessionStore((s) => s.setPendingResult)
  const reset = useSessionStore((s) => s.reset)

  const [hoveredSector, setHoveredSector] = useState<number | null>(null)
  const [kickCount, setKickCount] = useState(0)
  const [shake, setShake] = useState(false)

  const rafRef = useRef<number | null>(null)
  const planRef = useRef<ReturnType<typeof planSpin> | null>(null)
  const startTimeRef = useRef<number>(0)
  const prevAngleRef = useRef<number>(0)
  const stateRef = useRef<SpinState>('idle')

  useEffect(() => {
    stateRef.current = spinState
  }, [spinState])

  // Sync audio volumes
  useEffect(() => { audioEngine.setBgmVolume(volumeBgm) }, [volumeBgm])
  useEffect(() => { audioEngine.setSfxVolume(volumeSfx) }, [volumeSfx])

  const cancelAnimation = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [])

  const handleSpin = useCallback(async () => {
    if (stateRef.current !== 'idle') return
    await audioEngine.unlock()
    audioEngine.playWhoosh()
    audioEngine.startBgm()

    const rng = mulberry32(seedCounter++)
    const weights = wheel.sectors.map((s) => s.weight)
    const plan = planSpin({ weights, rng, startAngle: currentAngle })
    planRef.current = plan
    prevAngleRef.current = currentAngle

    const winner = wheel.sectors[plan.winnerIndex]
    if (winner) {
      setPendingResult({ sector: winner, plan })
    }

    setSpinState(transition('idle', 'SPIN'))

    let cruiseTriggered = false
    let brakeTriggered = false
    let heartbeatTriggered = false

    startTimeRef.current = performance.now()

    const tick = (now: number) => {
      const elapsed = now - startTimeRef.current
      const p = planRef.current
      if (!p) return

      const { angle, phase, done } = frameAt(p, elapsed)
      setAngle(angle)

      // Phase transitions
      if (!cruiseTriggered && phase === 'cruising') {
        cruiseTriggered = true
        setSpinState(transition(stateRef.current, 'CRUISE'))
      }
      if (!brakeTriggered && phase === 'decelerating') {
        brakeTriggered = true
        setSpinState(transition(stateRef.current, 'BRAKE'))
        if (!reduced) setShake(true)
      }

      // Heartbeat cue in the last second
      if (!heartbeatTriggered && elapsed > p.totalDuration - 1000 && phase === 'decelerating') {
        heartbeatTriggered = true
        audioEngine.playHeartbeat()
      }

      // Tick sounds & pointer kicks at sector crossings
      const crossings = boundaryCrossings(prevAngleRef.current, angle, wheel.sectors.length)
      if (crossings > 0) {
        const speed = (angle - prevAngleRef.current) / 16
        const normalizedSpeed = Math.min(1, speed / 5)
        audioEngine.playTick(normalizedSpeed)
        setKickCount((k) => k + 1)
      }
      prevAngleRef.current = angle

      if (done) {
        setSpinState(transition(stateRef.current, 'LAND'))
        audioEngine.stopBgm()
        audioEngine.playFanfare()
        setShake(false)

        const winnerId = sectorAtPointer(p.finalAngle, wheel.sectors.length)
        const winnerSector = wheel.sectors[winnerId]
        if (winnerSector) {
          addRecord({
            wheelId: wheel.id,
            wheelTitle: wheel.title,
            sectorLabel: winnerSector.label,
            sectorColor: winnerSector.color,
            timestamp: Date.now(),
          })
          if (wheel.excludeMode) {
            setTimeout(() => excludeWinner(winnerSector.id), 1200)
          }
        }

        setTimeout(() => {
          setSpinState(transition(stateRef.current, 'CELEBRATE'))
        }, 300)
        return
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
  }, [wheel, currentAngle, reduced, setAngle, setSpinState, setPendingResult, addRecord, excludeWinner])

  const handleClose = useCallback(() => {
    cancelAnimation()
    reset()
    setPendingResult(null)
  }, [cancelAnimation, reset, setPendingResult])

  // Space bar to spin
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'Space' && e.target === document.body) {
        e.preventDefault()
        if (stateRef.current === 'idle') handleSpin()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleSpin])

  const highlightIndex =
    spinState === 'celebrating' && pendingResult
      ? wheel.sectors.findIndex((s) => s.id === pendingResult.sector.id)
      : null

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: 480,
        aspectRatio: '1',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Screen-shake wrapper */}
      <motion.div
        animate={
          shake && !reduced
            ? { x: [0, -2, 2, -1, 1, 0], y: [0, 1, -1, 0] }
            : { x: 0, y: 0 }
        }
        transition={{ duration: 0.3, repeat: shake ? Infinity : 0 }}
        style={{ width: '100%', height: '100%', position: 'relative' }}
        onAnimationComplete={() => {
          if (!shake) return
        }}
      >
        <Pointer kick={kickCount} />
        <WheelSvg
          sectors={wheel.sectors}
          rotation={currentAngle}
          highlightIndex={highlightIndex}
          onSectorHover={setHoveredSector}
          reducedMotion={reduced}
        />
        <CenterButton spinState={spinState} onClick={handleSpin} />
      </motion.div>

      {/* Aria live region */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {spinState === 'celebrating' && pendingResult
          ? t('a11y.spin_result', { label: pendingResult.sector.label })
          : ''}
      </div>

      {/* Sector hover tooltip */}
      <AnimatePresence>
        {hoveredSector !== null && spinState === 'idle' && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'absolute',
              bottom: -36,
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              padding: '4px 10px',
              fontSize: 13,
              color: 'var(--text-secondary)',
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            {wheel.sectors[hoveredSector]?.emoji}{' '}
            {wheel.sectors[hoveredSector]?.label}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Result modal */}
      <AnimatePresence>
        {spinState === 'celebrating' && pendingResult && (
          <ResultModal
            sector={pendingResult.sector}
            title={wheel.title}
            onClose={handleClose}
            onAgain={() => {
              handleClose()
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function ResultModal({
  sector,
  title,
  onClose,
  onAgain,
}: {
  sector: { label: string; color: string; emoji: string }
  title: string
  onClose: () => void
  onAgain: () => void
}) {
  const { t } = useTranslation()

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 22 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 20,
          padding: '40px 48px',
          textAlign: 'center',
          maxWidth: 380,
          width: '90vw',
          boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>
          {t('wheel.result_detail', { title })}
        </div>
        {sector.emoji && (
          <div style={{ fontSize: 48, marginBottom: 8 }}>{sector.emoji}</div>
        )}
        <div
          style={{
            fontSize: 40,
            fontWeight: 800,
            color: sector.color,
            lineHeight: 1.2,
            textShadow: `0 0 24px ${sector.color}55`,
            marginBottom: 28,
          }}
        >
          {sector.label}
        </div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button
            onClick={onAgain}
            style={{
              background: 'var(--accent)',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '10px 24px',
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {t('wheel.again')}
          </button>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '10px 20px',
              fontSize: 15,
              cursor: 'pointer',
            }}
          >
            {t('wheel.close')}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
