// @vitest-environment node
// No DOM here, and under jsdom import.meta.url is a page's address rather than this file's.
import { readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// Every style the kit ships sits in `@layer kit`, so an app's own unlayered rules beat it
// without a heavier selector. One rule left outside the layer would beat the app instead, and
// nothing else would show it, so each stylesheet and each component's style block is read here.

const src = fileURLToPath(new URL('..', import.meta.url))

/** The stylesheets and components under src, the specs left out. */
function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      return entry.name === '__tests__' ? [] : sources(path)
    }
    return /\.(css|vue)$/.test(entry.name) ? [path] : []
  })
}

/** A file's CSS: the whole of a stylesheet, or each style block of a component. */
function styles(path: string): string[] {
  const text = readFileSync(path, 'utf8')
  if (path.endsWith('.css')) {
    return [text]
  }
  return [...text.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1] ?? '')
}

/** Whether the CSS, comments aside, is one `@layer kit { ... }` block and nothing else. */
function inKitLayer(css: string): boolean {
  const body = css.replace(/\/\*[\s\S]*?\*\//g, '').trim()
  if (!body.startsWith('@layer kit {') || !body.endsWith('}')) {
    return false
  }
  let depth = 0
  for (const [at, char] of Array.from(body).entries()) {
    if (char === '{') {
      depth++
    } else if (char === '}') {
      depth--
      if (depth === 0 && at < body.length - 1) {
        return false
      }
    }
  }
  return depth === 0
}

const blocks = sources(src).flatMap((path) =>
  styles(path).map((css, index) => ({
    file: relative(src, path).replaceAll('\\', '/'),
    index,
    css,
  })),
)

describe('the kit stylesheet', () => {
  it('has styles to check', () => {
    expect(blocks.length).toBeGreaterThan(0)
  })

  it.each(blocks)('$file (block $index) sits wholly in @layer kit', ({ css }) => {
    expect(inKitLayer(css)).toBe(true)
  })

  it.each([
    ['a rule before the layer', '.a { color: red; }\n@layer kit { .b { color: red; } }'],
    ['a rule after the layer', '@layer kit { .b { color: red; } }\n.a { color: red; }'],
    ['another layer', '@layer app { .a { color: red; } }'],
    ['an unclosed layer', '@layer kit { .a { color: red; }'],
  ])('refuses %s', (_, css) => {
    expect(inKitLayer(css)).toBe(false)
  })

  it('takes nested rules and comments around the layer', () => {
    expect(
      inKitLayer(
        '/* note */\n@layer kit {\n  .a { color: red; }\n  @media (x) { .b { c: d; } }\n}\n',
      ),
    ).toBe(true)
  })
})
