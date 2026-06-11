import { describe, expect, it } from 'vitest'
import { mulberry32, pickWeightedIndex } from './probability'

describe('mulberry32', () => {
  it('is deterministic for the same seed', () => {
    const a = mulberry32(42)
    const b = mulberry32(42)
    for (let i = 0; i < 100; i++) {
      expect(a()).toBe(b())
    }
  })

  it('produces different sequences for different seeds', () => {
    const a = mulberry32(1)
    const b = mulberry32(2)
    expect(a()).not.toBe(b())
  })

  it('stays in [0, 1)', () => {
    const rng = mulberry32(7)
    for (let i = 0; i < 10_000; i++) {
      const v = rng()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })

  it('is roughly uniform', () => {
    const rng = mulberry32(123)
    let sum = 0
    const n = 50_000
    for (let i = 0; i < n; i++) sum += rng()
    expect(sum / n).toBeCloseTo(0.5, 1)
  })
})

describe('pickWeightedIndex', () => {
  it('picks the only positive-weight entry', () => {
    const rng = mulberry32(1)
    for (let i = 0; i < 50; i++) {
      expect(pickWeightedIndex([0, 5, 0], rng)).toBe(1)
    }
  })

  it('never picks zero-weight entries', () => {
    const rng = mulberry32(9)
    for (let i = 0; i < 2000; i++) {
      const idx = pickWeightedIndex([1, 0, 1, 0], rng)
      expect([0, 2]).toContain(idx)
    }
  })

  it('matches expected ratios — weight 3 among [3,1,1,1] wins ~50%', () => {
    const rng = mulberry32(2024)
    const weights = [3, 1, 1, 1]
    let wins = 0
    const n = 600
    for (let i = 0; i < n; i++) {
      if (pickWeightedIndex(weights, rng) === 0) wins++
    }
    const rate = wins / n
    expect(rate).toBeGreaterThanOrEqual(0.45)
    expect(rate).toBeLessThanOrEqual(0.55)
  })

  it('handles equal weights uniformly', () => {
    const rng = mulberry32(55)
    const counts = [0, 0, 0, 0]
    const n = 8000
    for (let i = 0; i < n; i++) {
      counts[pickWeightedIndex([1, 1, 1, 1], rng)]!++
    }
    for (const c of counts) {
      expect(c / n).toBeGreaterThan(0.22)
      expect(c / n).toBeLessThan(0.28)
    }
  })

  it('returns last positive entry when float round-off exhausts the loop', () => {
    // An rng yielding exactly 1 simulates the round-off edge where the
    // cumulative subtraction never goes negative.
    const edgeRng = () => 1
    expect(pickWeightedIndex([1, 1, 0], edgeRng)).toBe(1)
  })

  it('throws on empty weights', () => {
    expect(() => pickWeightedIndex([], mulberry32(1))).toThrow(/empty/)
  })

  it('throws on negative weight', () => {
    expect(() => pickWeightedIndex([1, -1], mulberry32(1))).toThrow(/invalid/)
  })

  it('throws on non-finite weight', () => {
    expect(() => pickWeightedIndex([1, Infinity], mulberry32(1))).toThrow(
      /invalid/,
    )
  })

  it('throws when all weights are zero', () => {
    expect(() => pickWeightedIndex([0, 0], mulberry32(1))).toThrow(/positive/)
  })
})
