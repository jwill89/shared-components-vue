// @vitest-environment node
// No DOM here, and under jsdom import.meta.url is a page's address rather than this file's.
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  COLOR_TOKENS,
  TOKEN_PAIRS,
  UNPAIRED,
  backgroundCss,
  backgroundTokens,
  contrastRatio,
  describePair,
  mixRgb,
  pairRatio,
  parseComputedColor,
  parseHex,
} from '../tokens/contrast'
import type { Rgb, TokenPair } from '../tokens/contrast'

// Read as files: Vitest hands a stylesheet import to its CSS pipeline, which gives none of the
// text back.
const src = fileURLToPath(new URL('..', import.meta.url))

/** The components and stylesheets under src, the specs left out. */
function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      return entry.name === '__tests__' ? [] : sources(path)
    }
    return /\.(css|vue)$/.test(entry.name) ? [path] : []
  })
}

/** Every --kit- name the kit's code declares (`--kit-x:`) and reads (`var(--kit-x)`). */
function kitNames(): { declared: Set<string>; read: Set<string> } {
  const declared = new Set<string>()
  const read = new Set<string>()
  for (const path of sources(src)) {
    const text = readFileSync(path, 'utf8').replace(/\/\*[\s\S]*?\*\/|<!--[\s\S]*?-->/g, '')
    for (const m of text.matchAll(/(--kit-[a-z0-9-]+)\s*:/g)) {
      declared.add(m[1] ?? '')
    }
    for (const m of text.matchAll(/var\(\s*(--kit-[a-z0-9-]+)/g)) {
      read.add(m[1] ?? '')
    }
  }
  return { declared, read }
}

// The playground's colors, standing in for an app's.
const tokens = readFileSync(
  fileURLToPath(new URL('../../playground/palette.css', import.meta.url)),
  'utf8',
)

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

describe('the colors an app sets', () => {
  const { declared, read } = kitNames()

  it('are every token the components draw with that the kit leaves unset, and the page’s own', () => {
    const unset = [...read].filter((name) => !declared.has(name)).map((name) => name.slice(6))
    // The page's background is the app's to draw: the components sit on it and never draw it.
    expect([...unset, 'surface'].sort()).toEqual([...COLOR_TOKENS])
  })

  it('are none of them set by the kit', () => {
    expect(COLOR_TOKENS.filter((name) => declared.has(`--kit-${name}`))).toEqual([])
  })

  it('are each in a pair, or unpaired with a reason', () => {
    const paired = new Set(TOKEN_PAIRS.flatMap((pair) => [pair.fg, ...backgroundTokens(pair.bg)]))
    expect(COLOR_TOKENS.filter((name) => !paired.has(name) && !(name in UNPAIRED))).toEqual([])
    expect(Object.values(UNPAIRED).every((reason) => reason.length > 0)).toBe(true)
  })
})

describe('the playground’s colors', () => {
  it('set every color token, and nothing else', () => {
    expect([...palette.keys()].sort()).toEqual([...COLOR_TOKENS])
  })

  describe.each(['light', 'dark'] as const)('in the %s scheme', (scheme) => {
    it.each(TOKEN_PAIRS.map((pair) => [describePair(pair), pair] as const))(
      '%s holds its floor',
      (_, pair) => {
        expect(pairRatio(pair, (name) => token(name, scheme))).toBeGreaterThanOrEqual(pair.floor)
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
  it('measures a pair in the colors it is given, a wash over a wash from the one underneath up', () => {
    // An app's own palette: black words, a white surface, and a mid-grey to wash toward.
    const palette: Record<string, Rgb> = {
      ink: [0, 0, 0],
      paper: [255, 255, 255],
      grey: [100, 100, 100],
    }
    const colorOf = (name: string): Rgb => palette[name] ?? [255, 0, 0]
    const plain: TokenPair = { kind: 'text', fg: 'ink', bg: 'paper', floor: 7 }
    expect(pairRatio(plain, colorOf)).toBeCloseTo(21, 5)

    const twice: TokenPair = {
      kind: 'text',
      fg: 'ink',
      bg: { base: { base: 'paper', toward: 'grey', weight: 0.5 }, toward: 'grey', weight: 0.5 },
      floor: 7,
    }
    // White halfway to 100 is 178 (177.5, rounded); 178 halfway to 100 is 139.
    expect(pairRatio(twice, colorOf)).toBe(contrastRatio([0, 0, 0], [139, 139, 139]))
  })

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
