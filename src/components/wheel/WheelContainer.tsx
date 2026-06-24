import React, { useCallback, useEffect, useRef, useState } from 'react'
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
import {
  planSpin,
  frameAt,
  transition,
  boundaryCrossings,
  sectorAtPointer,
} from '@/core/spin-engine'
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

  const wheelScale = usePrefsStore((s) => s.wheelScale)
  const setWheelScale = usePrefsStore((s) => s.setWheelScale)

  const [hoveredSector, setHoveredSector] = useState<number | null>(null)
  const [kickCount, setKickCount] = useState(0)
  // shake amplitude: 0=none, 1=light, 2=heavy (cruise)
  const [shakeLevel, setShakeLevel] = useState(0)

  // Drag-to-scale state
  const dragStartXRef = useRef<number | null>(null)
  const dragStartScaleRef = useRef<number>(1.0)

  const rafRef = useRef<number | null>(null)
  const outerWrapperRef = useRef<HTMLDivElement>(null)
  const planRef = useRef<ReturnType<typeof planSpin> | null>(null)
  const startTimeRef = useRef<number>(0)
  const prevAngleRef = useRef<number>(0)
  const stateRef = useRef<SpinState>('idle')
  const heartbeatFiredRef = useRef(false)

  useEffect(() => { stateRef.current = spinState }, [spinState])

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
    heartbeatFiredRef.current = false

    const rng = mulberry32(seedCounter++)
    const weights = wheel.sectors.map((s) => s.weight)
    const plan = planSpin({ weights, rng, startAngle: currentAngle })
    planRef.current = plan
    prevAngleRef.current = currentAngle

    const winnerSector = wheel.sectors[plan.winnerIndex]
    if (winnerSector) {
      setPendingResult({ sector: winnerSector, plan })
    }

    setSpinState(transition('idle', 'SPIN'))
    setShakeLevel(0)

    let cruiseTriggered = false
    let brakeTriggered = false
    startTimeRef.current = performance.now()

    const tick = (now: number) => {
      const elapsed = now - startTimeRef.current
      const p = planRef.current
      if (!p) return

      const { angle, phase, done } = frameAt(p, elapsed)
      setAngle(angle)

      if (!cruiseTriggered && phase === 'cruising') {
        cruiseTriggered = true
        setSpinState(transition(stateRef.current, 'CRUISE'))
        setShakeLevel(1)
      }

      if (!brakeTriggered && phase === 'decelerating') {
        brakeTriggered = true
        setSpinState(transition(stateRef.current, 'BRAKE'))
        setShakeLevel(0)
      }

      // Heartbeat in the last 1.2s
      if (
        !heartbeatFiredRef.current &&
        elapsed > p.totalDuration - 1200 &&
        phase === 'decelerating'
      ) {
        heartbeatFiredRef.current = true
        audioEngine.playHeartbeat()
      }

      const crossings = boundaryCrossings(prevAngleRef.current, angle, wheel.sectors.length)
      if (crossings > 0) {
        const speed = (angle - prevAngleRef.current) / 16
        audioEngine.playTick(Math.min(1, speed / 5))
        setKickCount((k) => k + 1)
      }
      prevAngleRef.current = angle

      if (done) {
        setShakeLevel(0)
        setSpinState(transition(stateRef.current, 'LAND'))
        audioEngine.stopBgm()
        audioEngine.playFanfare()

        const winnerId = sectorAtPointer(p.finalAngle, wheel.sectors.length)
        const ws = wheel.sectors[winnerId]
        if (ws) {
          addRecord({
            wheelId: wheel.id,
            wheelTitle: wheel.title,
            sectorLabel: ws.label,
            sectorColor: ws.color,
            timestamp: Date.now(),
          })
          if (wheel.excludeMode) {
            setTimeout(() => excludeWinner(ws.id), 1400)
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
  }, [
    wheel,
    currentAngle,
    setAngle,
    setSpinState,
    setPendingResult,
    addRecord,
    excludeWinner,
  ])

  const handleClose = useCallback(() => {
    cancelAnimation()
    reset()
    setPendingResult(null)
  }, [cancelAnimation, reset, setPendingResult])

  // Space bar
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

  // Shake variants
  const shakeVariants = {
    0: { x: 0, y: 0 },
    1: { x: [0, -1.5, 1.5, -1, 1, 0], y: [0, 0.5, -0.5, 0] },
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (spinState !== 'idle') return
    dragStartXRef.current = e.clientX
    dragStartScaleRef.current = wheelScale
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (dragStartXRef.current === null) return
    const delta = (e.clientX - dragStartXRef.current) / 300
    setWheelScale(Math.min(1.5, Math.max(0.5, dragStartScaleRef.current + delta)))
  }

  function handlePointerUp() {
    dragStartXRef.current = null
  }

  return (
    <div
      ref={outerWrapperRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        userSelect: 'none',
        touchAction: 'none',
      }}
    >
      {/* Scale wrapper */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 480,
          aspectRatio: '1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transform: `scale(${wheelScale})`,
          transformOrigin: 'center center',
          transition: 'transform 0.15s ease',
        }}
      >
        {/* Lv2 cruise glow ring */}
        <AnimatePresence>
          {(spinState === 'cruising' || spinState === 'accelerating') && !reduced && (
            <motion.div
              key="cruise-glow"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              style={{
                position: 'absolute',
                inset: -8,
                borderRadius: '50%',
                background: 'transparent',
                boxShadow:
                  spinState === 'cruising'
                    ? '0 0 48px 16px var(--accent-glow), 0 0 100px 30px rgba(6,182,212,0.2)'
                    : '0 0 28px 8px var(--accent-glow)',
                pointerEvents: 'none',
                zIndex: 2,
              }}
            />
          )}
        </AnimatePresence>

        {/* Lv3 decel heartbeat ring */}
        <AnimatePresence>
          {spinState === 'decelerating' && !reduced && (
            <motion.div
              key="decel-pulse"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.4, 0.9, 0.4], scale: [1, 1.03, 1] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, repeat: Infinity }}
              style={{
                position: 'absolute',
                inset: -4,
                borderRadius: '50%',
                border: '3px solid var(--accent)',
                pointerEvents: 'none',
                zIndex: 2,
              }}
            />
          )}
        </AnimatePresence>

        {/* Screen-shake wrapper */}
        <motion.div
          animate={
            shakeLevel === 1 && !reduced
              ? { x: shakeVariants[1].x, y: shakeVariants[1].y }
              : { x: 0, y: 0 }
          }
          transition={
            shakeLevel === 1
              ? { duration: 0.35, repeat: Infinity, ease: 'linear' }
              : { duration: 0.1 }
          }
          style={{ width: '100%', height: '100%', position: 'relative' }}
        >
          <Pointer kick={kickCount} spinning={spinState !== 'idle'} />
          <WheelSvg
            sectors={wheel.sectors}
            rotation={currentAngle}
            highlightIndex={highlightIndex}
            onSectorHover={setHoveredSector}
            reducedMotion={reduced}
            spinState={spinState}
          />
          <CenterButton spinState={spinState} onClick={handleSpin} />
        </motion.div>
      </div>

      {/* Aria live region */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {spinState === 'celebrating' && pendingResult
          ? t('a11y.spin_result', { label: pendingResult.sector.label })
          : ''}
      </div>

      {/* Hover tooltip */}
      <AnimatePresence>
        {hoveredSector !== null && spinState === 'idle' && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'absolute',
              bottom: -40,
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '4px 12px',
              fontSize: 13,
              color: 'var(--text-secondary)',
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
              boxShadow: 'var(--shadow)',
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
            onAgain={handleClose}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Result Modal ─────────────────────────────────────────────────────────

function ResultModal({
  sector,
  title,
  onClose,
  onAgain,
}: {
  sector: { id: string; label: string; color: string; emoji: string }
  title: string
  onClose: () => void
  onAgain: () => void
}) {
  const { t } = useTranslation()

  const handleSaveImage = useCallback(async () => {
    const canvas = document.createElement('canvas')
    canvas.width = 600
    canvas.height = 340
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Background
    ctx.fillStyle = '#0f0f23'
    ctx.fillRect(0, 0, 600, 340)

    // Colored strip
    ctx.fillStyle = sector.color
    ctx.fillRect(0, 0, 600, 8)

    // Title
    ctx.fillStyle = '#94a3b8'
    ctx.font = '500 18px system-ui'
    ctx.textAlign = 'center'
    ctx.fillText(title, 300, 60)

    // Emoji
    if (sector.emoji) {
      ctx.font = '72px system-ui'
      ctx.fillText(sector.emoji, 300, 160)
    }

    // Label
    ctx.fillStyle = sector.color
    ctx.font = `800 ${sector.label.length > 10 ? 40 : 56}px system-ui`
    ctx.fillText(sector.label, 300, sector.emoji ? 240 : 200)

    // WHIRL branding
    ctx.fillStyle = 'rgba(148,163,184,0.5)'
    ctx.font = '400 14px system-ui'
    ctx.fillText('WHIRL', 300, 310)

    canvas.toBlob((blob) => {
      if (!blob) return
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `whirl-${sector.label}.png`
      a.click()
      URL.revokeObjectURL(a.href)
    }, 'image/png')
  }, [sector, title])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.65, opacity: 0, y: 40 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 20 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg-card)',
          border: `2px solid ${sector.color}44`,
          borderRadius: 24,
          padding: '44px 52px',
          textAlign: 'center',
          maxWidth: 400,
          width: '90vw',
          boxShadow: `0 0 60px ${sector.color}33, 0 24px 60px rgba(0,0,0,0.6)`,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Top accent line */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            background: sector.color,
          }}
        />

        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          {t('wheel.result_detail', { title })}
        </div>

        {sector.emoji && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.1 }}
            style={{ fontSize: 56, marginBottom: 10, lineHeight: 1 }}
          >
            {sector.emoji}
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
          style={{
            fontSize: sector.label.length > 10 ? 36 : 48,
            fontWeight: 900,
            color: sector.color,
            lineHeight: 1.15,
            textShadow: `0 0 32px ${sector.color}66`,
            marginBottom: 32,
            letterSpacing: '-0.02em',
          }}
        >
          {sector.label}
        </motion.div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={onAgain}
            style={{
              background: sector.color,
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              padding: '11px 26px',
              fontSize: 15,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: `0 4px 20px ${sector.color}44`,
            }}
          >
            {t('wheel.again')}
          </button>
          <button
            onClick={handleSaveImage}
            title={t('share.save_image')}
            style={{
              background: 'var(--bg-secondary)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: '11px 16px',
              fontSize: 15,
              cursor: 'pointer',
            }}
          >
            📷
          </button>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              color: 'var(--text-muted)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: '11px 20px',
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

