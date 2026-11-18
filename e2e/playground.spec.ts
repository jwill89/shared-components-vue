import { expect, test } from '@playwright/test'
import { WCAG_22_AA, axeViolations } from '@jwill89/test-a11y'

// The kit aims at AAA throughout, so axe's AAA rules run beside the shared AA set: a pair that
// slips below 7:1 fails here as well as in contrast.spec.ts.
const AAA = [...WCAG_22_AA, 'wcag2aaa']

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`on a device in the ${colorScheme} scheme`, () => {
    test.use({ colorScheme })

    test('the playground passes axe with the AAA rules', async ({ page }) => {
      await page.goto('/')
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      // The tokens reach the page: without them every color falls back to the browser's own,
      // which would pass axe while showing nothing of the kit.
      const surface = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
      expect(surface).not.toBe('rgba(0, 0, 0, 0)')
      await expect(page.getByRole('cell', { name: /:1$/ }).first()).toBeVisible()
      expect(await axeViolations(page, { tags: AAA })).toEqual([])
    })
  })
}

test('the kit follows the scheme the page sets, not the device', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await page.goto('/')
  const surface = (): Promise<string> =>
    page.evaluate(() => getComputedStyle(document.body).backgroundColor)

  const deviceLight = await surface()
  await page.getByLabel('Color scheme').selectOption('dark')
  await expect.poll(surface).not.toBe(deviceLight)
  expect(await axeViolations(page, { tags: AAA })).toEqual([])

  await page.getByLabel('Color scheme').selectOption('device')
  await expect.poll(surface).toBe(deviceLight)
})
