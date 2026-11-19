import { expect, test } from '@playwright/test'
import { contrastRatio, mixRgb, parseComputedColor } from '../src/tokens/contrast'

// What jsdom can't show: the buttons' hover colors and focus ring as a browser draws them.
// contrast.spec.ts measures the hovers from the tokens; this measures what the browser makes of
// KitButton's own color-mix() calls, so the two can't drift apart.

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`in the ${colorScheme} scheme`, () => {
    test.use({ colorScheme, reducedMotion: 'reduce' })

    for (const name of ['Primary', 'Secondary', 'Danger', 'Quiet', 'Plain']) {
      test(`a ${name.toLowerCase()} button holds 7:1 on hover`, async ({ page }) => {
        await page.goto('/')
        const button = page.getByRole('button', { name, exact: true }).first()
        const colors = (): Promise<{ ink: string; fill: string; page: string }> =>
          button.evaluate((element) => ({
            ink: getComputedStyle(element).color,
            fill: getComputedStyle(element).backgroundColor,
            // What the button sits on: the first background behind it that is drawn at all, a
            // panel's raised surface or the page's.
            page: (() => {
              for (let behind = element.parentElement; behind; behind = behind.parentElement) {
                const color = getComputedStyle(behind).backgroundColor
                if (color !== 'rgba(0, 0, 0, 0)' && color !== 'transparent') {
                  return color
                }
              }
              return getComputedStyle(document.documentElement).backgroundColor
            })(),
          }))

        const atRest = await colors()
        await button.hover()
        const hovered = await colors()
        expect(hovered.fill).not.toBe(atRest.fill)

        const ink = parseComputedColor(hovered.ink)
        const fill = parseComputedColor(hovered.fill)
        const surface = parseComputedColor(hovered.page)
        expect(ink && fill && surface, JSON.stringify(hovered)).toBeTruthy()
        if (ink && fill && surface) {
          // A quiet button's hover is a faint wash, laid over the page behind it.
          const shown = mixRgb(surface.rgb, fill.rgb, fill.alpha)
          expect(contrastRatio(ink.rgb, shown)).toBeGreaterThanOrEqual(7)
        }
      })
    }
  })
}

test('a button drawn as a link keeps its own words’ color, whatever the page sets for links', async ({
  page,
}) => {
  // The page's own `a { color }` sits in a layer under the kit's; unlayered, it would beat the
  // kit's layered rules and draw a primary link-button's words in the accent, on the accent.
  await page.goto('/')
  for (const name of ['Continue', 'Read more']) {
    const link = page.getByRole('link', { name })
    const { ink, fill } = await link.evaluate((element) => ({
      ink: getComputedStyle(element).color,
      fill: getComputedStyle(element).backgroundColor,
    }))
    const front = parseComputedColor(ink)
    const back = parseComputedColor(fill)
    expect(front && back, `${ink} on ${fill}`).toBeTruthy()
    if (front && back) {
      expect(contrastRatio(front.rgb, back.rgb)).toBeGreaterThanOrEqual(7)
    }
  }
})

test('a button reached by the keyboard shows the focus ring', async ({ page }) => {
  await page.goto('/')
  // From the scheme picker in the page's header, Tab reaches the first button.
  await page.getByLabel('Color scheme').focus()
  await page.keyboard.press('Tab')
  const button = page.getByRole('button', { name: 'Primary', exact: true }).first()
  await expect(button).toBeFocused()
  const ring = await button.evaluate((element) => {
    const style = getComputedStyle(element)
    return { style: style.outlineStyle, width: style.outlineWidth }
  })
  expect(ring).toEqual({ style: 'solid', width: '3px' })
})
