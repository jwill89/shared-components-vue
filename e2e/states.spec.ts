import { expect, test } from '@playwright/test'
import { contrastRatio, parseComputedColor } from '../src/tokens/contrast'

// What jsdom can't show: the page header, panels, alerts and states as a browser draws them.

for (const colorScheme of ['light', 'dark'] as const) {
  test(`every alert and the failed state hold their words at 7:1 in the ${colorScheme} scheme`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme })
    await page.goto('/')
    // contrast.spec.ts measures the washes from the tokens; this measures what the browser
    // makes of the components' own color-mix(), so the two can't drift apart.
    const pairs = await page.locator('.kit-alert, .kit-error-state').evaluateAll((washed) =>
      washed.map((element) => ({
        ink: getComputedStyle(element).color,
        wash: getComputedStyle(element).backgroundColor,
      })),
    )
    expect(pairs.length).toBeGreaterThanOrEqual(5)
    for (const { ink, wash } of pairs) {
      const front = parseComputedColor(ink)
      const back = parseComputedColor(wash)
      expect(front && back, `${ink} on ${wash}`).toBeTruthy()
      if (front && back) {
        expect(contrastRatio(front.rgb, back.rgb)).toBeGreaterThanOrEqual(7)
      }
    }
  })
}

test('the page opens with one h1 and a trail of the pages above it', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
  const trail = page.getByRole('navigation', { name: 'Breadcrumb' })
  // A screen reader hears the link and no separator.
  await expect(trail).toMatchAriaSnapshot(`
    - navigation "Breadcrumb":
      - list:
        - listitem:
          - link "shared-components-vue"
  `)
  // Each panel is a region named by its heading.
  await expect(page.getByRole('region', { name: 'Buttons' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Alerts and states' })).toBeVisible()
})

test('an alert that appears while the page is open is read out at once', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Show a live alert' }).click()
  await expect(
    page.getByRole('alert').filter({ hasText: 'The shelf was deleted elsewhere' }),
  ).toBeVisible()
})

test('a failed load tries again, and waits while it does', async ({ page }) => {
  await page.goto('/')
  const failed = page.getByRole('alert').filter({ hasText: 'Couldn’t load the shelves' })
  const again = failed.getByRole('button', { name: 'Try again' })
  await again.click()
  await expect(again).toHaveAttribute('aria-busy', 'true')
  await expect(failed).toContainText('Still failing (1).')
})

test('a loading state draws its ring large and its words at the size around them', async ({
  page,
}) => {
  await page.goto('/')
  const loading = page.locator('.kit-loading-state')
  const sizes = await loading.evaluate((element) => {
    const size = (selector: string): number =>
      parseFloat(getComputedStyle(element.querySelector(selector) ?? element).fontSize)
    return {
      around: parseFloat(getComputedStyle(element).fontSize),
      ring: size('.kit-spinner__ring'),
      words: size('.kit-spinner__label'),
    }
  })
  expect(sizes.words).toBe(sizes.around)
  expect(sizes.ring).toBeGreaterThan(sizes.around)
})
