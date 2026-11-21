import { expect, test } from '@playwright/test'
import { WCAG_22_AA, axeViolations } from '@jwill89/test-a11y'

// What jsdom can't show: the table as a browser lays it out and a keyboard drives it, axe on each
// of its states in both schemes, and a phone's width, where the table scrolls inside its frame and
// the page never scrolls sideways.

const AAA = [...WCAG_22_AA, 'wcag2aaa']

test.use({ reducedMotion: 'reduce' })

for (const colorScheme of ['light', 'dark'] as const) {
  test(`the table passes axe in each state in the ${colorScheme} scheme`, async ({ page }) => {
    await page.emulateMedia({ colorScheme })
    await page.goto('/')
    const show = page.getByRole('group', { name: 'Show' })
    for (const state of ['Rows', 'Loading', 'Failed', 'Empty']) {
      await show.getByRole('button', { name: state }).click()
      expect(await axeViolations(page, { tags: AAA }), state).toEqual([])
    }
  })
}

test('a heading sorts by keyboard, says which way, and a search narrows the rows', async ({
  page,
}) => {
  await page.goto('/')
  const table = page.getByRole('table', { name: 'Books' })
  const year = table.getByRole('columnheader', { name: 'Year' })
  await expect(year).toHaveAttribute('aria-sort', 'none')
  await year.getByRole('button').focus()
  await page.keyboard.press('Enter')
  await expect(year).toHaveAttribute('aria-sort', 'ascending')
  await expect(table.getByRole('row').nth(1)).toContainText('1960')
  await page.keyboard.press('Enter')
  await expect(year).toHaveAttribute('aria-sort', 'descending')
  await expect(table.getByRole('row').nth(1)).toContainText('2019')

  await page.getByRole('searchbox', { name: 'Search' }).fill('jemisin')
  await expect(page.getByRole('status').filter({ hasText: 'of 40' })).toHaveText('5 of 40')
  await expect(table.getByRole('row')).toHaveCount(6)
})

test('at a phone’s width the table scrolls in its frame, and the page never sideways', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 800 })
  await page.goto('/')
  const frame = page.getByRole('region', { name: 'Books' })
  await expect(frame).toHaveAttribute('tabindex', '0')
  const widths = await page.evaluate(() => ({
    page: document.documentElement.scrollWidth,
    screen: document.documentElement.clientWidth,
  }))
  expect(widths.page).toBeLessThanOrEqual(widths.screen)
})
