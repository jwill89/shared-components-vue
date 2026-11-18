import { expect, test } from '@playwright/test'
import { WCAG_22_AA, axeViolations } from '@jwill89/test-a11y'
import { contrastRatio, parseComputedColor } from '../src/tokens/contrast'

// What jsdom can't show: toasts as a browser draws them, over the page and over a dialog.

const AAA = [...WCAG_22_AA, 'wcag2aaa']

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`in the ${colorScheme} scheme`, () => {
    test.use({ colorScheme, reducedMotion: 'reduce' })

    test('every tone of toast holds its words at 7:1 and passes axe', async ({ page }) => {
      await page.goto('/')
      for (const name of ['Show a success', 'Show an error', 'Show a warning', 'Show a note']) {
        await page.getByRole('button', { name }).click()
      }
      const shown = page.locator('.kit-toast')
      await expect(shown).toHaveCount(4)

      // contrast.spec.ts measures the wash from the tokens; this measures what the browser
      // makes of the toast's own color-mix(), so the two can't drift apart.
      const ratios = await shown.evaluateAll((toasts) =>
        toasts.map((toast) => ({
          ink: getComputedStyle(toast).color,
          wash: getComputedStyle(toast).backgroundColor,
        })),
      )
      for (const { ink, wash } of ratios) {
        const front = parseComputedColor(ink)
        const back = parseComputedColor(wash)
        expect(front && back, `${ink} on ${wash}`).toBeTruthy()
        if (front && back) {
          expect(contrastRatio(front.rgb, back.rgb)).toBeGreaterThanOrEqual(7)
        }
      }
      expect(await axeViolations(page, { tags: AAA })).toEqual([])
    })
  })
}

test('a toast is read out from the page, an error at once', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Show a note' }).click()
  await expect(
    page.getByRole('status').filter({ hasText: 'The shelf is shared with Sam' }),
  ).toHaveCount(1)
  await page.getByRole('button', { name: 'Show an error' }).click()
  await expect(
    page
      .getByRole('alert')
      .filter({ hasText: 'That didn’t save. The server said: the shelf was deleted.' }),
  ).toHaveCount(1)
})

test('a toast raised in a dialog is read out from the dialog, and shows above it', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'About this shelf' }).click()
  const dialog = page.getByRole('dialog', { name: 'About this shelf' })
  await dialog.getByRole('button', { name: 'Copy the shelf’s link' }).click()

  // Everything behind a modal dialog is hidden from screen readers, toasts included, so the
  // words are read from the dialog's own live region.
  await expect(dialog.getByRole('status')).toHaveText('Copied the shelf’s link')

  const toast = page.locator('.kit-toast', { hasText: 'Copied the shelf’s link' })
  await expect(toast).toBeVisible()
  // Nothing covers it: the topmost thing at its middle is the toast itself.
  const onTop = await toast.evaluate((element) => {
    const box = element.getBoundingClientRect()
    const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2)
    return hit !== null && element.contains(hit)
  })
  expect(onTop).toBe(true)

  // Hidden from screen readers behind the modal, it is still there for the pointer.
  await toast.locator('button[aria-label="Dismiss"]').click()
  await expect(toast).toBeHidden()
  await expect(dialog).toBeVisible()
})
