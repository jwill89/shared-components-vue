// @vitest-environment node
// No DOM here, and under jsdom import.meta.url is a page's address rather than this file's.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  TOKEN_PAIRS,
  UNPAIRED,
  backgroundCss,
  backgroundTokens,
  contrastRatio,
  describePair,
  mixRgb,
  parseComputedColor,
  parseHex,
} from '../tokens/contrast'
import type { Rgb, TokenPair } from '../tokens/contrast'

// Read as a file: Vitest hands a stylesheet import to its CSS pipeline, which gives none of the
// text back.
const tokens = readFileSync(fileURLToPath(new URL('../tokens/tokens.css', import.meta.url)), 'utf8')

/** Each color token's light and dark values, by its name without the --kit- prefix. */
function colors(css: string): Map<string, { light: string; dark: string }> {
  const found = new Map<string, { light: string; dark: string }>()
  const hex = '#[0-9a-f]{3}(?:[0-9a-f]{3})?'
  for (const m of css.matchAll(
    new RegExp(`--kit-([a-z0-9-]+):\\s*light-dark\\(\\s*(${hex})\\s*,\\s*(${hex})\\s*\\)`, 'gi'),
  )) {
    found.set(m[1] ?? '', { light: m[2] ?? '', dark: m[3] ?? '' })
  }
  for (const m of css.matchAll(new RegExp(`--kit-([a-z0-9-]+):\\s*(${hex})\\s*;`, 'gi'))) {
    found.set(m[1] ?? '', { light: m[2] ?? '', dark: m[2] ?? '' })
  }
  return found
}

const palette = colors(tokens)

/** A token's color in one scheme, failing the test where the token isn't defined. */
function token(name: string, scheme: 'light' | 'dark'): Rgb {
  const value = palette.get(name)?.[scheme]
  expect(value, `--kit-${name} is defined`).toBeDefined()
  return parseHex(value ?? '')
}

/**
 * A pair's background in one scheme: its token's color, or its mix, worked out from the wash
 * underneath up, each rounded to whole channels as a browser draws it.
 */
function background(bg: TokenPair['bg'], scheme: 'light' | 'dark'): Rgb {
  return typeof bg === 'string'
    ? token(bg, scheme)
    : mixRgb(background(bg.base, scheme), token(bg.toward, scheme), bg.weight)
}

describe('the default theme', () => {
  it('defines the colors it pairs', () => {
    expect(palette.size).toBeGreaterThan(0)
  })

  it('measures every color it defines', () => {
    const paired = new Set(TOKEN_PAIRS.flatMap((pair) => [pair.fg, ...backgroundTokens(pair.bg)]))
    const unmeasured = [...palette.keys()].filter(
      (name) => !paired.has(name) && !(name in UNPAIRED),
    )
    expect(unmeasured).toEqual([])
  })

  describe.each(['light', 'dark'] as const)('in the %s scheme', (scheme) => {
    it.each(TOKEN_PAIRS.map((pair) => [describePair(pair), pair] as const))(
      '%s holds its floor',
      (_, { fg, bg, floor }) => {
        expect(contrastRatio(token(fg, scheme), background(bg, scheme))).toBeGreaterThanOrEqual(
          floor,
        )
      },
    )
  })
})

describe('a pair in words and in CSS', () => {
  const hover: TokenPair = {
    kind: 'text',
    fg: 'on-accent',
    bg: { base: 'accent', toward: 'text', weight: 0.15 },
    floor: 7,
    state: 'a primary button’s hover',
  }

  it('names a plain pair by its tokens', () => {
    const plain: TokenPair = { kind: 'text', fg: 'text', bg: 'surface', floor: 7 }
    expect(describePair(plain)).toBe('--kit-text on --kit-surface')
    expect(backgroundCss(plain.bg)).toBe('var(--kit-surface)')
    expect(backgroundTokens(plain.bg)).toEqual(['surface'])
  })

  it('names a mixed pair by its mix and where it is used', () => {
    expect(describePair(hover)).toBe(
      '--kit-on-accent on --kit-accent, 15% toward --kit-text (a primary button’s hover)',
    )
    expect(backgroundCss(hover.bg)).toBe(
      'color-mix(in srgb, var(--kit-accent) 85%, var(--kit-text))',
    )
    expect(backgroundTokens(hover.bg)).toEqual(['accent', 'text'])
  })

  it('names a wash over a wash from the one underneath up', () => {
    const overAlert: TokenPair = {
      kind: 'text',
      fg: 'accent',
      bg: {
        base: { base: 'surface-raised', toward: 'warning', weight: 0.06 },
        toward: 'accent',
        weight: 0.06,
      },
      floor: 7,
      state: 'a quiet button’s hover in a warning alert',
    }
    expect(describePair(overAlert)).toBe(
      '--kit-accent on --kit-surface-raised, 6% toward --kit-warning, 6% toward --kit-accent (a quiet button’s hover in a warning alert)',
    )
    expect(backgroundCss(overAlert.bg)).toBe(
      'color-mix(in srgb, color-mix(in srgb, var(--kit-surface-raised) 94%, var(--kit-warning)) 94%, var(--kit-accent))',
    )
    expect(backgroundTokens(overAlert.bg)).toEqual(['surface-raised', 'warning', 'accent'])
  })
})

describe('the contrast arithmetic', () => {
  it('gives black on white 21:1 and a color on itself 1:1', () => {
    expect(contrastRatio([0, 0, 0], [255, 255, 255])).toBeCloseTo(21, 5)
    expect(contrastRatio([26, 68, 154], [26, 68, 154])).toBe(1)
  })

  it('reads the same either way round', () => {
    expect(contrastRatio([255, 255, 255], [26, 68, 154])).toBe(
      contrastRatio([26, 68, 154], [255, 255, 255]),
    )
  })

  it('mixes two colors in sRGB, as color-mix() does, to whole channels as a browser draws them', () => {
    expect(mixRgb([0, 0, 0], [255, 255, 255], 0.5)).toEqual([128, 128, 128])
    expect(mixRgb([10, 20, 30], [110, 120, 130], 0)).toEqual([10, 20, 30])
    expect(mixRgb([10, 20, 30], [110, 120, 130], 1)).toEqual([110, 120, 130])
  })

  it('reads a computed color in either of the forms a browser gives', () => {
    expect(parseComputedColor('rgb(26, 68, 154)')).toEqual({ rgb: [26, 68, 154], alpha: 1 })
    expect(parseComputedColor('rgba(0, 0, 0, 0)')).toEqual({ rgb: [0, 0, 0], alpha: 0 })
    expect(parseComputedColor('color(srgb 1 0.5 0)')).toEqual({ rgb: [255, 127.5, 0], alpha: 1 })
    expect(parseComputedColor('color(srgb 0.1 0.2 0.6 / 0.06)')).toEqual({
      rgb: [25.5, 51, 153],
      alpha: 0.06,
    })
    expect(parseComputedColor('transparent')).toBeUndefined()
    expect(parseComputedColor('oklch(0.5 0.1 200)')).toBeUndefined()
  })

  it('reads three hex digits as six', () => {
    expect(parseHex('#fa0')).toEqual(parseHex('#ffaa00'))
    expect(parseHex('#1A449A')).toEqual([26, 68, 154])
  })

  it('refuses what is not a hex color', () => {
    expect(() => parseHex('rgb(0 0 0)')).toThrow('Not a #rgb or #rrggbb color')
    expect(() => parseHex('#abcd')).toThrow()
  })
})
