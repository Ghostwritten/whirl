/** Wheel configuration ↔ shareable URL hash.
 *
 * Pipeline: compact tuple JSON → lz-string compressToEncodedURIComponent.
 * The payload is versioned so the format can evolve without breaking
 * existing links. Decoding is defensive: any malformed input yields null.
 */

import {
  compressToEncodedURIComponent,
  decompressFromEncodedURIComponent,
} from 'lz-string'
import {
  MAX_LABEL_LENGTH,
  MAX_SECTORS,
  MAX_WEIGHT,
  MIN_SECTORS,
  MIN_WEIGHT,
} from './types'

export interface SharedSector {
  label: string
  color: string
  emoji: string
  weight: number
}

export interface SharedWheel {
  title: string
  themeId: string
  sectors: SharedSector[]
}

type SectorTuple = [string, string, string, number]

interface Payload {
  v: 1
  t: string
  k: string
  s: SectorTuple[]
}

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/

export function encodeShare(wheel: SharedWheel): string {
  const payload: Payload = {
    v: 1,
    t: wheel.title.slice(0, 100),
    k: wheel.themeId,
    s: wheel.sectors.map((sector) => [
      sector.label.slice(0, MAX_LABEL_LENGTH),
      sector.color,
      sector.emoji,
      sector.weight,
    ]),
  }
  return compressToEncodedURIComponent(JSON.stringify(payload))
}

function isValidTuple(value: unknown): value is SectorTuple {
  return (
    Array.isArray(value) &&
    value.length === 4 &&
    typeof value[0] === 'string' &&
    typeof value[1] === 'string' &&
    HEX_COLOR.test(value[1]) &&
    typeof value[2] === 'string' &&
    typeof value[3] === 'number' &&
    Number.isFinite(value[3])
  )
}

export function decodeShare(encoded: string): SharedWheel | null {
  if (!encoded) return null
  let parsed: unknown
  try {
    const json = decompressFromEncodedURIComponent(encoded)
    if (!json) return null
    parsed = JSON.parse(json)
  } catch {
    return null
  }
  if (typeof parsed !== 'object' || parsed === null) return null
  const p = parsed as Record<string, unknown>
  if (p.v !== 1) return null
  if (typeof p.t !== 'string' || typeof p.k !== 'string') return null
  if (!Array.isArray(p.s)) return null
  if (p.s.length < MIN_SECTORS || p.s.length > MAX_SECTORS) return null
  if (!p.s.every(isValidTuple)) return null

  const clamp = (w: number) => Math.min(MAX_WEIGHT, Math.max(MIN_WEIGHT, w))
  return {
    title: p.t.slice(0, 100),
    themeId: p.k,
    sectors: p.s.map((tuple) => ({
      label: tuple[0].slice(0, MAX_LABEL_LENGTH),
      color: tuple[1].toLowerCase(),
      emoji: tuple[2].slice(0, 8),
      weight: clamp(tuple[3]),
    })),
  }
}
