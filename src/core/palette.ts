/** Automatic sector color palette.
 *
 * Hues are sampled evenly around the HSL color wheel and lightness
 * alternates between two levels so adjacent sectors always differ in
 * both hue and lightness. For odd counts the last sector would touch
 * the first with the same lightness, so it gets a third level.
 */

export function hslToHex(h: number, s: number, l: number): string {
  const hue = ((h % 360) + 360) % 360
  const sat = s / 100
  const light = l / 100
  const c = (1 - Math.abs(2 * light - 1)) * sat
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1))
  const m = light - c / 2
  let r = 0
  let g = 0
  let b = 0
  if (hue < 60) {
    r = c
    g = x
  } else if (hue < 120) {
    r = x
    g = c
  } else if (hue < 180) {
    g = c
    b = x
  } else if (hue < 240) {
    g = x
    b = c
  } else if (hue < 300) {
    r = x
    b = c
  } else {
    r = c
    b = x
  }
  const toHex = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

export function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '')
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((ch) => ch + ch)
          .join('')
      : clean
  const n = parseInt(full, 16)
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff]
}

/** WCAG relative luminance of a hex color. */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex)
  const lin = (v: number) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

/** WCAG contrast ratio between two hex colors, in [1, 21]. */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a)
  const lb = relativeLuminance(b)
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la]
  return (hi + 0.05) / (lo + 0.05)
}

/** Black or white, whichever reads better on the given background.
 * Both candidates are compared by actual contrast ratio so the result
 * always satisfies WCAG AA for large text on mid-tone palette colors. */
export function readableTextColor(bg: string): '#000000' | '#ffffff' {
  return contrastRatio(bg, '#000000') >= contrastRatio(bg, '#ffffff')
    ? '#000000'
    : '#ffffff'
}

export interface PaletteOptions {
  baseHue?: number
  saturation?: number
}

const LIGHT_A = 68
const LIGHT_B = 42
const LIGHT_ODD = 30

export function generatePalette(
  count: number,
  options: PaletteOptions = {},
): string[] {
  if (count <= 0) return []
  const { baseHue = 8, saturation = 78 } = options
  const colors: string[] = []
  for (let i = 0; i < count; i++) {
    const hue = baseHue + (360 / count) * i
    const isLastOdd = count % 2 === 1 && i === count - 1
    const lightness = isLastOdd ? LIGHT_ODD : i % 2 === 0 ? LIGHT_A : LIGHT_B
    colors.push(hslToHex(hue, saturation, lightness))
  }
  return colors
}
