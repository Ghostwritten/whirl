/** Spin engine: pure state machine + physics. Zero DOM dependencies.
 *
 * Result-first design: the winner is chosen the instant a spin starts,
 * then the total rotation is derived so the animation lands exactly on
 * the chosen sector. The animation is just a performance of a decision
 * already made — fully testable and reproducible with an injected seed.
 *
 * Geometry convention: the pointer sits at 12 o'clock. With rotation 0,
 * sector i occupies the clockwise arc [i·step, (i+1)·step) measured from
 * the pointer, where step = 360 / sectorCount. A positive rotation turns
 * the wheel clockwise.
 */

import { pickWeightedIndex, type Rng } from './probability'

export type SpinState =
  | 'idle'
  | 'accelerating'
  | 'cruising'
  | 'decelerating'
  | 'landed'
  | 'celebrating'

export type SpinEvent = 'SPIN' | 'CRUISE' | 'BRAKE' | 'LAND' | 'CELEBRATE' | 'RESET'

const TRANSITIONS: Record<SpinState, Partial<Record<SpinEvent, SpinState>>> = {
  idle: { SPIN: 'accelerating' },
  accelerating: { CRUISE: 'cruising', RESET: 'idle' },
  cruising: { BRAKE: 'decelerating', RESET: 'idle' },
  decelerating: { LAND: 'landed', RESET: 'idle' },
  landed: { CELEBRATE: 'celebrating', RESET: 'idle' },
  celebrating: { RESET: 'idle' },
}

/** Pure FSM transition. Unknown events leave the state unchanged. */
export function transition(state: SpinState, event: SpinEvent): SpinState {
  return TRANSITIONS[state][event] ?? state
}

export const easeInQuad = (x: number): number => x * x

export const easeOutQuart = (x: number): number => 1 - Math.pow(1 - x, 4)

/** Index of the sector currently under the pointer for a given wheel
 * rotation (degrees, clockwise-positive). */
export function sectorAtPointer(rotation: number, sectorCount: number): number {
  const step = 360 / sectorCount
  const local = (((-rotation) % 360) + 360) % 360
  return Math.floor(local / step) % sectorCount
}

export interface SpinPlanOptions {
  weights: readonly number[]
  rng: Rng
  /** Wheel rotation when the spin starts (degrees). Default 0. */
  startAngle?: number
  /** Whole revolutions before landing. Defaults: 5 to 8. */
  minTurns?: number
  maxTurns?: number
}

export interface SpinPlan {
  winnerIndex: number
  startAngle: number
  /** Total degrees travelled over the whole spin (always > 0). */
  totalRotation: number
  /** Absolute final rotation: startAngle + totalRotation. */
  finalAngle: number
  accelDuration: number
  cruiseDuration: number
  decelDuration: number
  totalDuration: number
}

const ACCEL_MS = 1200
const CRUISE_MS = 1000

/**
 * Picks the winner by weight, then derives the exact rotation needed to
 * land the pointer inside the winner sector (with a random offset kept
 * away from the edges so the result is visually unambiguous).
 *
 * Phase math: with cruise velocity v, easeInQuad acceleration covers
 * v·Ta/2, the cruise covers v·Tc, and easeOutQuart deceleration covers
 * v·Td/4 (its initial slope is 4/Td). Velocity is continuous across all
 * phase boundaries, and v is solved from the required total rotation.
 */
export function planSpin(options: SpinPlanOptions): SpinPlan {
  const { weights, rng, startAngle = 0, minTurns = 5, maxTurns = 8 } = options
  const winnerIndex = pickWeightedIndex(weights, rng)
  const n = weights.length
  const step = 360 / n

  // Land 15%–85% into the sector, never on a boundary.
  const offset = 0.15 + rng() * 0.7
  const targetRotation = ((360 - (winnerIndex + offset) * step) % 360 + 360) % 360

  const turns = minTurns + Math.floor(rng() * (maxTurns - minTurns + 1))
  const startMod = ((startAngle % 360) + 360) % 360
  const delta = (targetRotation - startMod + 360) % 360
  const totalRotation = turns * 360 + delta

  const decelDuration = 3000 + rng() * 1000
  const accelDuration = ACCEL_MS
  const cruiseDuration = CRUISE_MS

  return {
    winnerIndex,
    startAngle,
    totalRotation,
    finalAngle: startAngle + totalRotation,
    accelDuration,
    cruiseDuration,
    decelDuration,
    totalDuration: accelDuration + cruiseDuration + decelDuration,
  }
}

export type SpinPhase = 'accelerating' | 'cruising' | 'decelerating' | 'landed'

export interface SpinFrame {
  /** Absolute wheel rotation in degrees at time t. */
  angle: number
  phase: SpinPhase
  done: boolean
}

/** Angle of the wheel at elapsed time `tMs` since the spin started. */
export function frameAt(plan: SpinPlan, tMs: number): SpinFrame {
  const { accelDuration: ta, cruiseDuration: tc, decelDuration: td } = plan
  // Distances derived from the cruise velocity v (deg/ms):
  // accel = v·ta/2, cruise = v·tc, decel = v·td/4.
  const v = plan.totalRotation / (ta / 2 + tc + td / 4)
  const accelDist = (v * ta) / 2
  const cruiseDist = v * tc

  if (tMs <= 0) {
    return { angle: plan.startAngle, phase: 'accelerating', done: false }
  }
  if (tMs < ta) {
    const angle = plan.startAngle + accelDist * easeInQuad(tMs / ta)
    return { angle, phase: 'accelerating', done: false }
  }
  if (tMs < ta + tc) {
    const angle = plan.startAngle + accelDist + v * (tMs - ta)
    return { angle, phase: 'cruising', done: false }
  }
  if (tMs < plan.totalDuration) {
    const decelDist = plan.totalRotation - accelDist - cruiseDist
    const progress = easeOutQuart((tMs - ta - tc) / td)
    const angle = plan.startAngle + accelDist + cruiseDist + decelDist * progress
    return { angle, phase: 'decelerating', done: false }
  }
  return { angle: plan.finalAngle, phase: 'landed', done: true }
}

/** Number of sector boundaries swept between two rotations. Used to
 * fire tick sounds and pointer kicks. */
export function boundaryCrossings(
  prevAngle: number,
  angle: number,
  sectorCount: number,
): number {
  const step = 360 / sectorCount
  return Math.floor(angle / step) - Math.floor(prevAngle / step)
}
