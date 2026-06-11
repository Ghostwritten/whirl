/** A pseudo-random number generator returning values in [0, 1). */
export type Rng = () => number

/** Deterministic, seedable PRNG (mulberry32). Good statistical quality
 * for game use, tiny footprint, reproducible across platforms. */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Picks an index according to relative weights.
 * Zero-weight entries are never selected. Throws when the input is empty,
 * contains a negative weight, or sums to zero (no selectable entry).
 */
export function pickWeightedIndex(
  weights: readonly number[],
  rng: Rng,
): number {
  if (weights.length === 0) {
    throw new Error('pickWeightedIndex: weights must not be empty')
  }
  let total = 0
  for (const w of weights) {
    if (w < 0 || !Number.isFinite(w)) {
      throw new Error(`pickWeightedIndex: invalid weight ${w}`)
    }
    total += w
  }
  if (total <= 0) {
    throw new Error('pickWeightedIndex: total weight must be positive')
  }
  let r = rng() * total
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i] as number
    if (r < 0) return i
  }
  // Float round-off can leave r === 0 after the loop; return the last
  // entry with positive weight.
  for (let i = weights.length - 1; i >= 0; i--) {
    if ((weights[i] as number) > 0) return i
  }
  /* v8 ignore next 2 -- unreachable: total > 0 guarantees a positive weight */
  throw new Error('pickWeightedIndex: unreachable')
}
