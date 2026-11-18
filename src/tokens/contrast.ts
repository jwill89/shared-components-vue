/**
 * The color pairs the default theme holds, and the contrast arithmetic that measures them.
 * contrast.spec.ts checks every pair against tokens.css in both schemes, and the playground
 * shows each one with its ratio in the scheme on screen. Token names are written without
 * their --kit- prefix.
 */

/** A color as its red, green and blue channels, each 0 to 255. */
export type Rgb = readonly [red: number, green: number, blue: number]

export interface TokenPair {
  /** Whether the front color is read as text and icons, or drawn as a control's border. */
  readonly kind: 'text' | 'border'
  /** What sits in front. */
  readonly fg: string
  /** What it sits on. */
  readonly bg: string
  /** The lowest contrast ratio the pair may have. */
  readonly floor: number
}

/** The surfaces text and controls sit on. */
export const SURFACES = ['surface', 'surface-raised', 'surface-sunken'] as const

/** The colors a reader reads, or a control is marked with, on any surface. */
const READ_ON_SURFACES = [
  'text',
  'text-muted',
  'accent',
  'focus-ring',
  'danger',
  'success',
  'warning',
] as const

/**
 * The colors that sit in no pair, each with its reason. A color token missing from both
 * this and TOKEN_PAIRS fails contrast.spec.ts, so a new one can't go unmeasured.
 */
export const UNPAIRED: Readonly<Record<string, string>> = {
  hairline: 'Divides one area from another and never marks text or a control.',
}

/**
 * AAA (7:1) for every color a reader reads or a control is marked with, on every surface; 3:1
 * for a control's border, which WCAG asks of a control's boundary; and AAA for a filled
 * control's words on its fill.
 */
export const TOKEN_PAIRS: readonly TokenPair[] = [
  ...READ_ON_SURFACES.flatMap((fg) =>
    SURFACES.map((bg): TokenPair => ({ kind: 'text', fg, bg, floor: 7 })),
  ),
  ...SURFACES.map((bg): TokenPair => ({ kind: 'border', fg: 'control-border', bg, floor: 3 })),
  { kind: 'text', fg: 'on-accent', bg: 'accent', floor: 7 },
  { kind: 'text', fg: 'on-danger', bg: 'danger', floor: 7 },
]

/** A #rgb or #rrggbb color as its channels. */
export function parseHex(hex: string): Rgb {
  const digits = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex)?.[1]
  if (digits === undefined) {
    throw new Error(`Not a #rgb or #rrggbb color: ${hex}`)
  }
  const long = digits.length === 3 ? Array.from(digits, (d) => d + d).join('') : digits
  const channel = (at: number): number => parseInt(long.slice(at, at + 2), 16)
  return [channel(0), channel(2), channel(4)]
}

/** One channel's share of the light, undoing sRGB's gamma. */
function linear(channel: number): number {
  const v = channel / 255
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
}

/** WCAG 2.2's relative luminance of a color. */
function luminance([red, green, blue]: Rgb): number {
  return 0.2126 * linear(red) + 0.7152 * linear(green) + 0.0722 * linear(blue)
}

/** WCAG 2.2's contrast ratio between two colors, from 1 to 21. */
export function contrastRatio(a: Rgb, b: Rgb): number {
  const [la, lb] = [luminance(a), luminance(b)]
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}
