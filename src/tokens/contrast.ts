/**
 * The color pairs the default theme holds, and the contrast arithmetic that measures them.
 * contrast.spec.ts checks every pair against tokens.css in both schemes, and the playground
 * shows each one with its ratio in the scheme on screen. Token names are written without
 * their --kit- prefix.
 */

/** A color as its red, green and blue channels, each 0 to 255. */
export type Rgb = readonly [red: number, green: number, blue: number]

/**
 * A color made where it is used rather than stored as a token, as a hover is:
 * `color-mix(in srgb, var(--kit-<base>) <100 - weight * 100>%, var(--kit-<toward>))`.
 */
export interface Mix {
  readonly base: string
  readonly toward: string
  /** How far it moves toward `toward`, from 0 to 1. */
  readonly weight: number
}

export interface TokenPair {
  /**
   * What the front color draws: text, read at AAA; an icon or a mark that means something,
   * which WCAG asks 3:1 of; or a control's border.
   */
  readonly kind: 'text' | 'icon' | 'border'
  /** What sits in front. */
  readonly fg: string
  /** What it sits on: a token, or a color mixed from two. */
  readonly bg: string | Mix
  /** The lowest contrast ratio the pair may have. */
  readonly floor: number
  /** Where a mixed pair is used: "a primary button's hover". */
  readonly state?: string
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
 * How far a button's hover moves from its rest. KitButton.vue writes the same numbers into
 * its color-mix() calls, so the two change together. A filled button's fill moves toward the
 * page's text color, which takes it away from its own words in either scheme; a quiet button
 * takes a faint wash of the accent over whatever surface it sits on, and a plain one the same of
 * the text color.
 */
export const BUTTON_HOVER = { filled: 0.15, quiet: 0.06 } as const

/**
 * How much of its tone a toast is washed with, over the raised surface. KitToastList.vue writes
 * the same number. Each tone's toast holds its words at AAA on the wash, and its icon and its
 * Dismiss button's at 3:1.
 */
export const TOAST_TINT = 0.1

/**
 * How much of its tone an alert, or a failed load's state, is washed with, over the raised
 * surface. KitAlert.vue and KitErrorState.vue write the same number. It is fainter than a
 * toast's, since an alert may hold muted words and links, which it keeps at AAA, and a button,
 * whose border it keeps at 3:1.
 */
export const ALERT_TINT = 0.07

/**
 * How much of the accent the option under the keyboard or pointer, in an open list, is washed
 * with. option-list.css writes the same number.
 */
export const OPTION_HIGHLIGHT = 0.12

/** The tone each kind of toast or alert is washed and marked with. */
const TOAST_TONES = [
  ['success', 'a success toast'],
  ['danger', 'an error toast'],
  ['warning', 'a warning toast'],
  ['text-muted', 'an info toast'],
] as const

/**
 * AAA (7:1) for every color a reader reads or a control is marked with, on every surface; 3:1
 * for a control's border, which WCAG asks of a control's boundary; AAA for a filled control's
 * words on its fill, at rest and on hover; and each toast's words and marks on its wash.
 */
export const TOKEN_PAIRS: readonly TokenPair[] = [
  ...READ_ON_SURFACES.flatMap((fg) =>
    SURFACES.map((bg): TokenPair => ({ kind: 'text', fg, bg, floor: 7 })),
  ),
  ...SURFACES.map((bg): TokenPair => ({ kind: 'border', fg: 'control-border', bg, floor: 3 })),
  { kind: 'text', fg: 'on-accent', bg: 'accent', floor: 7 },
  { kind: 'text', fg: 'on-danger', bg: 'danger', floor: 7 },
  {
    kind: 'text',
    fg: 'text',
    bg: { base: 'surface-raised', toward: 'text', weight: BUTTON_HOVER.filled },
    floor: 7,
    state: 'a secondary button’s hover',
  },
  {
    kind: 'text',
    fg: 'on-accent',
    bg: { base: 'accent', toward: 'text', weight: BUTTON_HOVER.filled },
    floor: 7,
    state: 'a primary button’s hover',
  },
  {
    kind: 'text',
    fg: 'on-danger',
    bg: { base: 'danger', toward: 'text', weight: BUTTON_HOVER.filled },
    floor: 7,
    state: 'a danger button’s hover',
  },
  ...SURFACES.map((base): TokenPair => ({
    kind: 'text',
    fg: 'accent',
    bg: { base, toward: 'accent', weight: BUTTON_HOVER.quiet },
    floor: 7,
    state: 'a quiet button’s hover',
  })),
  ...SURFACES.map((base): TokenPair => ({
    kind: 'text',
    fg: 'text',
    bg: { base, toward: 'text', weight: BUTTON_HOVER.quiet },
    floor: 7,
    state: 'a plain button’s hover',
  })),
  {
    kind: 'text',
    fg: 'text',
    bg: { base: 'surface-raised', toward: 'accent', weight: OPTION_HIGHLIGHT },
    floor: 7,
    state: 'the highlighted option in an open list',
  },
  ...TOAST_TONES.flatMap(([tone, state]): TokenPair[] => {
    const bg: Mix = { base: 'surface-raised', toward: tone, weight: TOAST_TINT }
    return [
      { kind: 'text', fg: 'text', bg, floor: 7, state },
      { kind: 'icon', fg: tone, bg, floor: 3, state: `${state}’s icon` },
      { kind: 'icon', fg: 'accent', bg, floor: 3, state: `${state}’s Dismiss button` },
    ]
  }),
  ...TOAST_TONES.flatMap(([tone, toastState]): TokenPair[] => {
    const bg: Mix = { base: 'surface-raised', toward: tone, weight: ALERT_TINT }
    const state = toastState.replace('toast', 'alert')
    return [
      { kind: 'text', fg: 'text', bg, floor: 7, state },
      { kind: 'text', fg: 'text-muted', bg, floor: 7, state },
      { kind: 'text', fg: 'accent', bg, floor: 7, state: `a link in ${state}` },
      { kind: 'icon', fg: tone, bg, floor: 3, state: `${state}’s icon` },
      { kind: 'border', fg: 'control-border', bg, floor: 3, state: `a button in ${state}` },
    ]
  }),
]

/** The tokens a pair's background is made from: one, or the two a mix takes. */
export function backgroundTokens(bg: TokenPair['bg']): string[] {
  return typeof bg === 'string' ? [bg] : [bg.base, bg.toward]
}

/** A pair in words: "--kit-on-accent on --kit-accent, 15% toward --kit-text". */
export function describePair({ fg, bg, state }: TokenPair): string {
  const back =
    typeof bg === 'string'
      ? `--kit-${bg}`
      : `--kit-${bg.base}, ${String(Math.round(bg.weight * 100))}% toward --kit-${bg.toward}`
  return `--kit-${fg} on ${back}${state ? ` (${state})` : ''}`
}

/** A pair's background as CSS, through the tokens, as the component that uses it writes it. */
export function backgroundCss(bg: TokenPair['bg']): string {
  if (typeof bg === 'string') {
    return `var(--kit-${bg})`
  }
  const rest = String(Math.round((1 - bg.weight) * 100))
  return `color-mix(in srgb, var(--kit-${bg.base}) ${rest}%, var(--kit-${bg.toward}))`
}

/**
 * Two colors mixed in sRGB, `weight` of the way from `a` to `b`, as color-mix() mixes them,
 * each channel rounded to a whole value as a browser rounds the color it draws. Unrounded, a
 * pair can measure 7.01 here and 6.98 on screen.
 */
export function mixRgb(a: Rgb, b: Rgb, weight: number): Rgb {
  const channel = (at: 0 | 1 | 2): number => Math.round(a[at] * (1 - weight) + b[at] * weight)
  return [channel(0), channel(1), channel(2)]
}

/**
 * A color as a browser computes it, as its channels and its alpha: `rgb(r, g, b)` or
 * `rgba(r, g, b, a)` with channels from 0 to 255, or `color(srgb r g b / a)` with channels from
 * 0 to 1, which is how a browser gives back a color-mix(). Undefined for anything else.
 */
export function parseComputedColor(css: string): { rgb: Rgb; alpha: number } | undefined {
  const num = '([\\d.]+)'
  const rgb = new RegExp(`^rgba?\\(${num},\\s*${num},\\s*${num}(?:,\\s*${num})?\\)$`).exec(css)
  if (rgb) {
    return { rgb: [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])], alpha: Number(rgb[4] ?? 1) }
  }
  const srgb = new RegExp(`^color\\(srgb ${num} ${num} ${num}(?: / ${num})?\\)$`).exec(css)
  if (srgb) {
    const channel = (value: string | undefined): number => Number(value) * 255
    return {
      rgb: [channel(srgb[1]), channel(srgb[2]), channel(srgb[3])],
      alpha: Number(srgb[4] ?? 1),
    }
  }
  return undefined
}

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
