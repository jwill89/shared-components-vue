// @vitest-environment node
// No DOM here, and under jsdom import.meta.url is a page's address rather than this file's.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { TOKEN_PAIRS, UNPAIRED, contrastRatio, parseHex } from '../tokens/contrast'

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

describe('the default theme', () => {
  it('defines the colors it pairs', () => {
    expect(palette.size).toBeGreaterThan(0)
  })

  it('measures every color it defines', () => {
    const paired = new Set(TOKEN_PAIRS.flatMap((pair) => [pair.fg, pair.bg]))
    const unmeasured = [...palette.keys()].filter(
      (name) => !paired.has(name) && !(name in UNPAIRED),
    )
    expect(unmeasured).toEqual([])
  })

  describe.each(['light', 'dark'] as const)('in the %s scheme', (scheme) => {
    it.each(TOKEN_PAIRS)('--kit-$fg holds $floor:1 on --kit-$bg', ({ fg, bg, floor }) => {
      const front = palette.get(fg)?.[scheme]
      const back = palette.get(bg)?.[scheme]
      expect(front, `--kit-${fg} is defined`).toBeDefined()
      expect(back, `--kit-${bg} is defined`).toBeDefined()
      expect(contrastRatio(parseHex(front ?? ''), parseHex(back ?? ''))).toBeGreaterThanOrEqual(
        floor,
      )
    })
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

  it('reads three hex digits as six', () => {
    expect(parseHex('#fa0')).toEqual(parseHex('#ffaa00'))
    expect(parseHex('#1A449A')).toEqual([26, 68, 154])
  })

  it('refuses what is not a hex color', () => {
    expect(() => parseHex('rgb(0 0 0)')).toThrow('Not a #rgb or #rrggbb color')
    expect(() => parseHex('#abcd')).toThrow()
  })
})
