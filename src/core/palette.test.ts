import { describe, expect, it } from 'vitest'
import {
  contrastRatio,
  generatePalette,
  hexToRgb,
  hslToHex,
  readableTextColor,
  relativeLuminance,
} from './palette'

describe('hslToHex', () => {
  it('converts primary hues', () => {
    expect(hslToHex(0, 100, 50)).toBe('#ff0000')
    expect(hslToHex(120, 100, 50)).toBe('#00ff00')
    expect(hslToHex(240, 100, 50)).toBe('#0000ff')
  })

  it('covers every 60° hue segment', () => {
    expect(hslToHex(30, 100, 50)).toBe('#ff8000')
    expect(hslToHex(90, 100, 50)).toBe('#80ff00')
    expect(hslToHex(150, 100, 50)).toBe('#00ff80')
    expect(hslToHex(210, 100, 50)).toBe('#0080ff')
    expect(hslToHex(270, 100, 50)).toBe('#8000ff')
    expect(hslToHex(330, 100, 50)).toBe('#ff0080')
  })

  it('handles grayscale and extremes', () => {
    expect(hslToHex(0, 0, 0)).toBe('#000000')
    expect(hslToHex(0, 0, 100)).toBe('#ffffff')
    expect(hslToHex(180, 0, 50)).toBe('#808080')
  })

  it('normalizes out-of-range hues', () => {
    expect(hslToHex(360, 100, 50)).toBe(hslToHex(0, 100, 50))
    expect(hslToHex(-120, 100, 50)).toBe(hslToHex(240, 100, 50))
  })
})

describe('hexToRgb', () => {
  it('parses 6-digit hex with or without #', () => {
    expect(hexToRgb('#ff8000')).toEqual([255, 128, 0])
    expect(hexToRgb('00ff00')).toEqual([0, 255, 0])
  })

  it('parses 3-digit shorthand', () => {
    expect(hexToRgb('#f80')).toEqual([255, 136, 0])
  })
})

describe('relativeLuminance / contrastRatio', () => {
  it('gives 0 for black and 1 for white', () => {
    expect(relativeLuminance('#000000')).toBe(0)
    expect(relativeLuminance('#ffffff')).toBeCloseTo(1, 5)
  })

  it('covers the low-channel linearization branch', () => {
    // channel value 8/255 ≈ 0.031 ≤ 0.03928 → linear branch
    expect(relativeLuminance('#080808')).toBeGreaterThan(0)
    expect(relativeLuminance('#080808')).toBeLessThan(0.01)
  })

  it('black/white contrast is 21', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1)
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 1)
  })

  it('identical colors have ratio 1', () => {
    expect(contrastRatio('#3366cc', '#3366cc')).toBe(1)
  })
})

describe('readableTextColor', () => {
  it('returns white on dark backgrounds', () => {
    expect(readableTextColor('#111111')).toBe('#ffffff')
    expect(readableTextColor('#0000aa')).toBe('#ffffff')
  })

  it('returns black on light backgrounds', () => {
    expect(readableTextColor('#ffff00')).toBe('#000000')
    expect(readableTextColor('#eeeeee')).toBe('#000000')
  })
})

describe('generatePalette', () => {
  it('returns an empty array for count <= 0', () => {
    expect(generatePalette(0)).toEqual([])
    expect(generatePalette(-3)).toEqual([])
  })

  it('returns the requested number of distinct colors', () => {
    for (const n of [2, 4, 7, 12, 24]) {
      const palette = generatePalette(n)
      expect(palette).toHaveLength(n)
      expect(new Set(palette).size).toBe(n)
    }
  })

  it('adjacent sectors differ in lightness (even count, wrap-around too)', () => {
    const palette = generatePalette(6)
    for (let i = 0; i < palette.length; i++) {
      const a = palette[i]!
      const b = palette[(i + 1) % palette.length]!
      expect(contrastRatio(a, b)).toBeGreaterThan(1.15)
    }
  })

  it('odd counts adjust the final color so wrap-around still contrasts', () => {
    const palette = generatePalette(5)
    const last = palette[4]!
    const first = palette[0]!
    expect(contrastRatio(last, first)).toBeGreaterThan(1.15)
  })

  it('honors custom hue and saturation options', () => {
    const a = generatePalette(4, { baseHue: 100, saturation: 40 })
    const b = generatePalette(4)
    expect(a).not.toEqual(b)
  })

  it('every color passes WCAG AA (3:1, large text) with its text color', () => {
    for (const color of generatePalette(24)) {
      expect(contrastRatio(color, readableTextColor(color))).toBeGreaterThanOrEqual(3)
    }
  })
})
