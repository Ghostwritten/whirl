import { useEffect, useRef } from 'react'
import { usePrefsStore } from '@/stores/prefsStore'
import { useSessionStore } from '@/stores/sessionStore'
import type { SpinState } from '@/core/spin-engine'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  color: string
  size: number
  rotation: number
  rotationSpeed: number
}

function randomBetween(a: number, b: number) {
  return a + Math.random() * (b - a)
}

const CONFETTI_COLORS = [
  '#f97316', '#a855f7', '#22c55e', '#3b82f6',
  '#ec4899', '#facc15', '#06b6d4', '#ef4444',
]

const MAX_BG_PARTICLES = 60

export function CanvasLayer() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const reduced = usePrefsStore((s) => s.reducedMotion)
  const spinState = useSessionStore((s) => s.spinState)
  const particlesRef = useRef<Particle[]>([])
  const confettiRef = useRef<Particle[]>([])
  const trailRef = useRef<{ x: number; y: number; life: number }[]>([])
  const mouseRef = useRef({ x: -999, y: -999 })
  const rafRef = useRef<number | null>(null)
  const prevStateRef = useRef<SpinState>('idle')

  const spinStateRef = useRef<SpinState>(spinState)
  spinStateRef.current = spinState

  // Trigger confetti burst on landing
  useEffect(() => {
    if (reduced) return
    if (spinState === 'celebrating' && prevStateRef.current !== 'celebrating') {
      const canvas = canvasRef.current
      if (!canvas) return
      const cx = canvas.width / 2
      const cy = canvas.height / 2
      for (let i = 0; i < 180; i++) {
        const angle = Math.random() * Math.PI * 2
        const speed = randomBetween(3, 12)
        confettiRef.current.push({
          x: cx,
          y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - randomBetween(2, 6),
          life: 1,
          maxLife: randomBetween(100, 200),
          color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)] ?? '#fff',
          size: randomBetween(4, 10),
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: randomBetween(-0.15, 0.15),
        })
      }
    }
    prevStateRef.current = spinState
  }, [spinState, reduced])

  // Mouse tracker for pointer trail
  useEffect(() => {
    if (reduced) return
    const move = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY }
    }
    window.addEventListener('mousemove', move, { passive: true })
    return () => window.removeEventListener('mousemove', move)
  }, [reduced])

  useEffect(() => {
    if (reduced) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize, { passive: true })

    // Initialize background particles
    particlesRef.current = Array.from({ length: MAX_BG_PARTICLES }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: randomBetween(-0.3, 0.3),
      vy: randomBetween(-0.6, -0.1),
      life: Math.random(),
      maxLife: randomBetween(120, 300),
      color: '#7c3aed',
      size: randomBetween(1, 3),
      rotation: 0,
      rotationSpeed: 0,
    }))

    let frame = 0

    const loop = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const state = spinStateRef.current
      const speedMult =
        state === 'cruising' ? 3 : state === 'accelerating' ? 2 : 1

      // Background particles
      for (const p of particlesRef.current) {
        p.x += p.vx * speedMult
        p.y += p.vy * speedMult
        p.life -= 1 / p.maxLife

        if (p.life <= 0 || p.y < -10) {
          p.x = Math.random() * canvas.width
          p.y = canvas.height + 10
          p.life = 1
          p.maxLife = randomBetween(120, 300)
          p.vx = randomBetween(-0.3, 0.3)
          p.vy = randomBetween(-0.6, -0.1)
        }

        const alpha = p.life * (state === 'idle' ? 0.3 : 0.6)
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(124, 58, 237, ${alpha})`
        ctx.fill()
      }

      // Confetti
      confettiRef.current = confettiRef.current.filter((p) => {
        p.x += p.vx
        p.y += p.vy
        p.vy += 0.18 // gravity
        p.vx *= 0.99
        p.life -= 1 / p.maxLife
        p.rotation += p.rotationSpeed

        if (p.life <= 0) return false
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rotation)
        ctx.globalAlpha = Math.min(1, p.life * 3)
        ctx.fillStyle = p.color
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2)
        ctx.restore()
        return true
      })

      // Pointer trail
      const mouse = mouseRef.current
      if (frame % 2 === 0 && mouse.x > 0) {
        trailRef.current.push({ x: mouse.x, y: mouse.y, life: 1 })
      }
      trailRef.current = trailRef.current.filter((p) => {
        p.life -= 0.06
        if (p.life <= 0) return false
        ctx.beginPath()
        ctx.arc(p.x, p.y, 3 * p.life, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(124, 58, 237, ${p.life * 0.5})`
        ctx.fill()
        return true
      })

      frame++
      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [reduced])

  if (reduced) return null

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 0,
      }}
      aria-hidden="true"
    />
  )
}
