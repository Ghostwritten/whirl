import { describe, expect, it } from 'vitest'
import { mulberry32 } from './probability'
import {
  boundaryCrossings,
  easeInQuad,
  easeOutQuart,
  frameAt,
  planSpin,
  sectorAtPointer,
  transition,
  type SpinEvent,
  type SpinState,
} from './spin-engine'

describe('transition (FSM)', () => {
  it('walks the full happy path', () => {
    let s: SpinState = 'idle'
    s = transition(s, 'SPIN')
    expect(s).toBe('accelerating')
    s = transition(s, 'CRUISE')
    expect(s).toBe('cruising')
    s = transition(s, 'BRAKE')
    expect(s).toBe('decelerating')
    s = transition(s, 'LAND')
    expect(s).toBe('landed')
    s = transition(s, 'CELEBRATE')
    expect(s).toBe('celebrating')
    s = transition(s, 'RESET')
    expect(s).toBe('idle')
  })

  it('ignores invalid events', () => {
    expect(transition('idle', 'LAND')).toBe('idle')
    expect(transition('accelerating', 'SPIN')).toBe('accelerating')
    expect(transition('cruising', 'CELEBRATE')).toBe('cruising')
  })

  it('allows RESET from every non-idle state', () => {
    const states: SpinState[] = [
      'accelerating',
      'cruising',
      'decelerating',
      'landed',
      'celebrating',
    ]
    for (const s of states) {
      expect(transition(s, 'RESET' as SpinEvent)).toBe('idle')
    }
  })
})

describe('easing', () => {
  it('easeInQuad endpoints and shape', () => {
    expect(easeInQuad(0)).toBe(0)
    expect(easeInQuad(1)).toBe(1)
    expect(easeInQuad(0.5)).toBe(0.25)
  })

  it('easeOutQuart endpoints and shape', () => {
    expect(easeOutQuart(0)).toBe(0)
    expect(easeOutQuart(1)).toBe(1)
    expect(easeOutQuart(0.5)).toBeCloseTo(0.9375, 5)
  })
})

describe('sectorAtPointer', () => {
  it('maps rotation 0 to sector 0', () => {
    expect(sectorAtPointer(0, 4)).toBe(0)
  })

  it('rotating clockwise brings earlier sectors past the pointer', () => {
    // 4 sectors of 90°. Rotating +90° puts sector 3 under the pointer.
    expect(sectorAtPointer(90, 4)).toBe(3)
    expect(sectorAtPointer(180, 4)).toBe(2)
    expect(sectorAtPointer(270, 4)).toBe(1)
    expect(sectorAtPointer(360, 4)).toBe(0)
  })

  it('handles negative and large rotations', () => {
    expect(sectorAtPointer(-90, 4)).toBe(1)
    expect(sectorAtPointer(360 * 10 + 90, 4)).toBe(3)
  })
})

describe('planSpin', () => {
  it('is reproducible with the same seed', () => {
    const weights = [1, 1, 1, 1]
    const a = planSpin({ weights, rng: mulberry32(99) })
    const b = planSpin({ weights, rng: mulberry32(99) })
    expect(a).toEqual(b)
  })

  it('always lands the pointer inside the winner sector', () => {
    for (let seed = 0; seed < 300; seed++) {
      const rng = mulberry32(seed)
      const n = 2 + Math.floor(rng() * 23)
      const weights = Array.from({ length: n }, () => 1 + rng() * 9)
      const startAngle = rng() * 720 - 360
      const plan = planSpin({ weights, rng, startAngle })
      expect(sectorAtPointer(plan.finalAngle, n)).toBe(plan.winnerIndex)
    }
  })

  it('respects the configured number of turns', () => {
    const plan = planSpin({
      weights: [1, 1],
      rng: mulberry32(3),
      minTurns: 5,
      maxTurns: 8,
    })
    expect(plan.totalRotation).toBeGreaterThanOrEqual(5 * 360)
    expect(plan.totalRotation).toBeLessThan(9 * 360 + 360)
  })

  it('decel duration falls within 3–4s and total within expectations', () => {
    for (let seed = 0; seed < 50; seed++) {
      const plan = planSpin({ weights: [1, 1, 1], rng: mulberry32(seed) })
      expect(plan.decelDuration).toBeGreaterThanOrEqual(3000)
      expect(plan.decelDuration).toBeLessThanOrEqual(4000)
      expect(plan.totalDuration).toBe(
        plan.accelDuration + plan.cruiseDuration + plan.decelDuration,
      )
    }
  })

  it('weighted winner distribution: weight 3 of [3,1,1,1] wins 50%±5% over 600 spins', () => {
    const rng = mulberry32(777)
    let wins = 0
    const n = 600
    for (let i = 0; i < n; i++) {
      const plan = planSpin({ weights: [3, 1, 1, 1], rng })
      if (plan.winnerIndex === 0) wins++
    }
    expect(wins / n).toBeGreaterThanOrEqual(0.45)
    expect(wins / n).toBeLessThanOrEqual(0.55)
  })
})

describe('frameAt', () => {
  const plan = planSpin({ weights: [1, 1, 1, 1], rng: mulberry32(5) })

  it('starts at startAngle in accelerating phase', () => {
    const f = frameAt(plan, 0)
    expect(f.angle).toBe(plan.startAngle)
    expect(f.phase).toBe('accelerating')
    expect(f.done).toBe(false)
  })

  it('clamps negative time to the start', () => {
    expect(frameAt(plan, -100).angle).toBe(plan.startAngle)
  })

  it('reports each phase at the right time', () => {
    expect(frameAt(plan, plan.accelDuration / 2).phase).toBe('accelerating')
    expect(frameAt(plan, plan.accelDuration + 1).phase).toBe('cruising')
    expect(
      frameAt(plan, plan.accelDuration + plan.cruiseDuration + 1).phase,
    ).toBe('decelerating')
    expect(frameAt(plan, plan.totalDuration).phase).toBe('landed')
  })

  it('lands exactly on finalAngle and stays there', () => {
    expect(frameAt(plan, plan.totalDuration).angle).toBe(plan.finalAngle)
    expect(frameAt(plan, plan.totalDuration + 5000).angle).toBe(plan.finalAngle)
    expect(frameAt(plan, plan.totalDuration).done).toBe(true)
  })

  it('angle is monotonically non-decreasing', () => {
    let prev = plan.startAngle
    for (let t = 0; t <= plan.totalDuration + 100; t += 16) {
      const { angle } = frameAt(plan, t)
      expect(angle).toBeGreaterThanOrEqual(prev - 1e-9)
      prev = angle
    }
  })

  it('is continuous across phase boundaries (no angle jumps)', () => {
    const boundaries = [
      plan.accelDuration,
      plan.accelDuration + plan.cruiseDuration,
      plan.totalDuration,
    ]
    for (const b of boundaries) {
      const before = frameAt(plan, b - 0.5).angle
      const after = frameAt(plan, b + 0.5).angle
      expect(Math.abs(after - before)).toBeLessThan(2)
    }
  })

  it('velocity is continuous across phase boundaries', () => {
    const dt = 1
    const velocityAt = (t: number) =>
      (frameAt(plan, t + dt).angle - frameAt(plan, t - dt).angle) / (2 * dt)
    const vEndAccel = velocityAt(plan.accelDuration - 2)
    const vStartCruise = velocityAt(plan.accelDuration + 2)
    const vEndCruise = velocityAt(plan.accelDuration + plan.cruiseDuration - 2)
    const vStartDecel = velocityAt(plan.accelDuration + plan.cruiseDuration + 2)
    expect(vStartCruise).toBeCloseTo(vEndAccel, 2)
    expect(vStartDecel).toBeCloseTo(vEndCruise, 1)
  })
})

describe('boundaryCrossings', () => {
  it('counts sweeps over sector boundaries', () => {
    // 4 sectors → boundary every 90°
    expect(boundaryCrossings(0, 89, 4)).toBe(0)
    expect(boundaryCrossings(89, 91, 4)).toBe(1)
    expect(boundaryCrossings(0, 360, 4)).toBe(4)
    expect(boundaryCrossings(85, 275, 4)).toBe(3)
  })

  it('returns 0 when no boundary is crossed', () => {
    expect(boundaryCrossings(100, 100, 6)).toBe(0)
  })
})
