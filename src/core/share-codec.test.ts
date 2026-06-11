import { describe, expect, it } from 'vitest'
import { compressToEncodedURIComponent } from 'lz-string'
import { decodeShare, encodeShare, type SharedWheel } from './share-codec'

const sample: SharedWheel = {
  title: '打扫房间',
  themeId: 'neon',
  sectors: [
    { label: '爸爸', color: '#ff5533', emoji: '👨', weight: 1 },
    { label: '妈妈', color: '#33bb88', emoji: '👩', weight: 1 },
    { label: '儿子', color: '#3355ff', emoji: '👦', weight: 3 },
    { label: '女儿', color: '#ffaa00', emoji: '👧', weight: 1 },
  ],
}

describe('encodeShare / decodeShare round-trip', () => {
  it('restores title, theme, sectors, colors, emoji and weights', () => {
    const decoded = decodeShare(encodeShare(sample))
    expect(decoded).toEqual(sample)
  })

  it('produces URL-safe output', () => {
    const encoded = encodeShare(sample)
    expect(encoded).toMatch(/^[A-Za-z0-9+\-$]+$/)
  })

  it('truncates over-long titles and labels on encode', () => {
    const decoded = decodeShare(
      encodeShare({
        title: 'x'.repeat(300),
        themeId: 'dark',
        sectors: [
          { label: 'y'.repeat(50), color: '#abcdef', emoji: '', weight: 1 },
          { label: 'b', color: '#123456', emoji: '', weight: 2 },
        ],
      }),
    )
    expect(decoded?.title).toHaveLength(100)
    expect(decoded?.sectors[0]?.label).toHaveLength(20)
  })

  it('handles 24 sectors (max)', () => {
    const wheel: SharedWheel = {
      title: 'big',
      themeId: 'candy',
      sectors: Array.from({ length: 24 }, (_, i) => ({
        label: `s${i}`,
        color: '#112233',
        emoji: '',
        weight: 1,
      })),
    }
    expect(decodeShare(encodeShare(wheel))?.sectors).toHaveLength(24)
  })
})

describe('decodeShare validation', () => {
  const encode = (value: unknown) =>
    compressToEncodedURIComponent(JSON.stringify(value))

  it('rejects empty input', () => {
    expect(decodeShare('')).toBeNull()
  })

  it('rejects garbage input', () => {
    expect(decodeShare('not-a-valid-payload!!!')).toBeNull()
  })

  it('rejects non-JSON decompressed content', () => {
    expect(decodeShare(compressToEncodedURIComponent('{broken'))).toBeNull()
  })

  it('rejects non-object payloads', () => {
    expect(decodeShare(encode('hello'))).toBeNull()
    expect(decodeShare(encode(null))).toBeNull()
    expect(decodeShare(encode(42))).toBeNull()
  })

  it('rejects unknown versions', () => {
    expect(decodeShare(encode({ v: 2, t: 'x', k: 'y', s: [] }))).toBeNull()
  })

  it('rejects missing or mistyped fields', () => {
    expect(decodeShare(encode({ v: 1, k: 'y', s: [] }))).toBeNull()
    expect(decodeShare(encode({ v: 1, t: 1, k: 'y', s: [] }))).toBeNull()
    expect(decodeShare(encode({ v: 1, t: 'x', k: 2, s: [] }))).toBeNull()
    expect(decodeShare(encode({ v: 1, t: 'x', k: 'y', s: 'nope' }))).toBeNull()
  })

  it('rejects sector counts outside 2–24', () => {
    const tuple = ['a', '#112233', '', 1]
    expect(decodeShare(encode({ v: 1, t: 'x', k: 'y', s: [tuple] }))).toBeNull()
    expect(
      decodeShare(
        encode({ v: 1, t: 'x', k: 'y', s: Array(25).fill(tuple) }),
      ),
    ).toBeNull()
  })

  it('rejects malformed sector tuples', () => {
    const valid = ['a', '#112233', '', 1]
    const bad = [
      'not-an-array',
      ['a', '#112233', ''],
      [1, '#112233', '', 1],
      ['a', 'red', '', 1],
      ['a', '#112233', 7, 1],
      ['a', '#112233', '', 'heavy'],
      ['a', '#112233', '', NaN],
    ]
    for (const tuple of bad) {
      expect(
        decodeShare(encode({ v: 1, t: 'x', k: 'y', s: [valid, tuple] })),
      ).toBeNull()
    }
  })

  it('clamps weights into [0, 10] and normalizes colors to lowercase', () => {
    const decoded = decodeShare(
      encode({
        v: 1,
        t: 'x',
        k: 'y',
        s: [
          ['a', '#AABBCC', '', 99],
          ['b', '#112233', '', -5],
        ],
      }),
    )
    expect(decoded?.sectors[0]?.weight).toBe(10)
    expect(decoded?.sectors[0]?.color).toBe('#aabbcc')
    expect(decoded?.sectors[1]?.weight).toBe(0)
  })

  it('truncates over-long decoded labels and emoji', () => {
    const decoded = decodeShare(
      encode({
        v: 1,
        t: 'z'.repeat(500),
        k: 'y',
        s: [
          ['a'.repeat(99), '#112233', 'e'.repeat(99), 1],
          ['b', '#112233', '', 1],
        ],
      }),
    )
    expect(decoded?.title).toHaveLength(100)
    expect(decoded?.sectors[0]?.label).toHaveLength(20)
    expect(decoded?.sectors[0]?.emoji).toHaveLength(8)
  })
})
