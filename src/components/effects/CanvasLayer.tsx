import { useEffect, useRef } from 'react'
import { usePrefsStore } from '@/stores/prefsStore'
import { useSessionStore } from '@/stores/sessionStore'
import type { SpinState } from '@/core/spin-engine'

// ── Types ─────────────────────────────────────────────────────────────────

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number // 0→1, decreasing
  maxLife: number
  color: string
  size: number
  rotation: number
  rotationSpeed: number
}

interface TrailPoint {
  x: number
  y: number
  life: number
}

// ── Helpers ───────────────────────────────────────────────────────────────

function rand(a: number, b: number) {
  return a + Math.random() * (b - a)
}

const CONFETTI_COLORS = [
  '#f97316', '#a855f7', '#22c55e', '#3b82f6',
  '#ec4899', '#facc15', '#06b6d4', '#ef4444',
  '#84cc16', '#f43f5e',
]

const MAX_BG = 70

// ── Component ─────────────────────────────────────────────────────────────

export function CanvasLayer() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const reduced = usePrefsStore((s) => s.reducedMotion)
  const spinState = useSessionStore((s) => s.spinState)

  const particlesRef = useRef<Particle[]>([])
  const confettiRef = useRef<Particle[]>([])
  const trailRef = useRef<TrailPoint[]>([])
  const mouseRef = useRef({ x: -999, y: -999 })
  const rafRef = useRef<number | null>(null)
  const prevStateRef = useRef<SpinState>('idle')
  const spotlightRef = useRef(0) // 0→1 opacity of spotlight
  const rimPhaseRef = useRef(0) // for rim glow animation
  const spinStateRef = useRef<SpinState>(spinState)
  spinStateRef.current = spinState

  // Confetti burst on entering 'celebrating'
  useEffect(() => {
    if (reduced) return
    if (spinState === 'celebrating' && prevStateRef.current !== 'celebrating') {
      const canvas = canvasRef.current
      if (!canvas) return
      const cx = canvas.width / 2
      const cy = canvas.height / 2
      for (let i = 0; i < 200; i++) {
        const angle = Math.random() * Math.PI * 2
        const speed = rand(4, 14)
        confettiRef.current.push({
          x: cx,
          y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - rand(3, 8),
          life: 1,
          maxLife: rand(100, 220),
          color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)] ?? '#fff',
          size: rand(5, 12),
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: rand(-0.18, 0.18),
        })
      }
    }
    // Fade in spotlight during 'decelerating' → fade out after 'celebrating'
    if (spinState === 'decelerating') {
      spotlightRef.current = 0
    }
    if (spinState === 'idle') {
      spotlightRef.current = 0
    }
    prevStateRef.current = spinState
  }, [spinState, reduced])

  // Mouse move tracker
  useEffect(() => {
    if (reduced) return
    const onMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY }
    }
    window.addEventListener('mousemove', onMove, { passive: true })
    return () => window.removeEventListener('mousemove', onMove)
  }, [reduced])

  // Main rAF loop
  useEffect(() => {
    if (reduced) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const onResize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    onResize()
    window.addEventListener('resize', onResize, { passive: true })

    // Seed background particles
    particlesRef.current = Array.from({ length: MAX_BG }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: rand(-0.4, 0.4),
      vy: rand(-0.7, -0.15),
      life: Math.random(),
      maxLife: rand(120, 320),
      color: '#7c3aed',
      size: rand(1.2, 3.5),
      rotation: 0,
      rotationSpeed: 0,
    }))

    let frame = 0

    const loop = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const state = spinStateRef.current
      const isCruising = state === 'cruising'
      const isAccel = state === 'accelerating'
      const isDecel = state === 'decelerating'
      const isCelebrating = state === 'celebrating'

      // Speed multiplier for particles
      const speedMult = isCruising ? 3.5 : isAccel ? 2 : isDecel ? 0.7 : 1

      // ── Lv1: Rim glow strip at top (accelerating+) ─────────────────────
      if (isAccel || isCruising || isDecel) {
        rimPhaseRef.current += 0.04
        const rimAlpha = isAccel ? 0.35 : isCruising ? 0.6 : 0.25
        const rimGrad = ctx.createLinearGradient(0, 0, canvas.width, 0)
        const phase = rimPhaseRef.current
        rimGrad.addColorStop(0, 'transparent')
        rimGrad.addColorStop((Math.sin(phase) * 0.5 + 0.5) * 0.4, `rgba(124,58,237,${rimAlpha})`)
        rimGrad.addColorStop((Math.sin(phase + 1) * 0.5 + 0.5) * 0.6 + 0.2, `rgba(6,182,212,${rimAlpha})`)
        rimGrad.addColorStop(1, 'transparent')
        ctx.fillStyle = rimGrad
        ctx.fillRect(0, 0, canvas.width, 4)
        ctx.fillRect(0, canvas.height - 4, canvas.width, 4)
      }

      // ── Lv3: Spotlight — fades in during decel, out after reset ────────
      if (isDecel || isCelebrating) {
        const targetAlpha = isDecel ? 0.55 : isCelebrating ? 0.4 : 0
        spotlightRef.current += (targetAlpha - spotlightRef.current) * 0.04
        if (spotlightRef.current > 0.01) {
          const cx = canvas.width / 2
          const cy = canvas.height / 2
          // Dim everything except center
          ctx.save()
          ctx.fillStyle = `rgba(0,0,0,${spotlightRef.current})`
          ctx.fillRect(0, 0, canvas.width, canvas.height)
          // Punch out a radial gradient "spotlight"
          const spotlight = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(canvas.width, canvas.height) * 0.38)
          spotlight.addColorStop(0, 'rgba(0,0,0,1)')
          spotlight.addColorStop(1, 'rgba(0,0,0,0)')
          ctx.globalCompositeOperation = 'destination-out'
          ctx.fillStyle = spotlight
          ctx.fillRect(0, 0, canvas.width, canvas.height)
          ctx.globalCompositeOperation = 'source-over'
          ctx.restore()
        }
      } else if (spotlightRef.current > 0.005) {
        spotlightRef.current *= 0.88
      }

      // ── Background floating particles ───────────────────────────────────
      for (const p of particlesRef.current) {
        p.x += p.vx * speedMult
        p.y += p.vy * speedMult
        p.life -= 1 / p.maxLife

        if (p.life <= 0 || p.y < -10) {
          p.x = Math.random() * canvas.width
          p.y = canvas.height + 10
          p.life = 1
          p.maxLife = rand(120, 320)
          p.vx = rand(-0.4, 0.4)
          p.vy = rand(-0.7, -0.15)
        }

        const baseAlpha = state === 'idle' ? 0.25 : 0.55
        const alpha = p.life * baseAlpha
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(124,58,237,${alpha.toFixed(3)})`
        ctx.fill()
      }

      // ── Lv2: Extra speed-burst particles during cruise ──────────────────
      if (isCruising && frame % 3 === 0) {
        const cx = canvas.width / 2
        const cy = canvas.height / 2
        for (let i = 0; i < 3; i++) {
          const angle = Math.random() * Math.PI * 2
          const r = rand(60, 160)
          particlesRef.current.push({
            x: cx + Math.cos(angle) * r,
            y: cy + Math.sin(angle) * r,
            vx: Math.cos(angle) * rand(1.5, 4),
            vy: Math.sin(angle) * rand(1.5, 4) - 1,
            life: 1,
            maxLife: rand(25, 55),
            color: '#06b6d4',
            size: rand(1.5, 4),
            rotation: 0,
            rotationSpeed: 0,
          })
          if (particlesRef.current.length > MAX_BG + 60) {
            particlesRef.current.splice(MAX_BG, 30)
          }
        }
      }

      // ── Confetti ────────────────────────────────────────────────────────
      confettiRef.current = confettiRef.current.filter((p) => {
        p.x += p.vx
        p.y += p.vy
        p.vy += 0.2
        p.vx *= 0.99
        p.life -= 1 / p.maxLife
        p.rotation += p.rotationSpeed
        if (p.life <= 0) return false

        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rotation)
        ctx.globalAlpha = Math.min(1, p.life * 3)
        ctx.fillStyle = p.color
        // Alternate between rect and circle for variety
        if ((confettiRef.current.indexOf(p) & 1) === 0) {
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2)
        } else {
          ctx.beginPath()
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.restore()
        return true
      })

      // ── Pointer trail ────────────────────────────────────────────────────
      if (frame % 2 === 0 && mouseRef.current.x > 0) {
        trailRef.current.push({ x: mouseRef.current.x, y: mouseRef.current.y, life: 1 })
        if (trailRef.current.length > 30) trailRef.current.shift()
      }
      ctx.save()
      for (let i = 0; i < trailRef.current.length; i++) {
        const p = trailRef.current[i]!
        p.life -= 0.06
        if (p.life <= 0) continue
        ctx.beginPath()
        ctx.arc(p.x, p.y, 3.5 * p.life, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(124,58,237,${(p.life * 0.45).toFixed(3)})`
        ctx.fill()
      }
      trailRef.current = trailRef.current.filter((p) => p.life > 0)
      ctx.restore()

      frame++
      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', onResize)
    }
  }, [reduced])

  if (reduced) return null

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}
      aria-hidden="true"
    />
  )
}
