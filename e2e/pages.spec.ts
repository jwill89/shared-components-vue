import { expect, test } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'
import { WCAG_22_AA, axeViolations } from '@jwill89/test-a11y'

// What jsdom can't show of what the kit's own components gained: a small button's press area, a
// search the page runs, a list of links on a phone, a dialog only its own buttons close, a
// question with more answers, a toast's Undo, the viewer opened from anywhere with the app's own
// button in it, and a table's choice of page size, with axe on each in both schemes.

const AAA = [...WCAG_22_AA, 'wcag2aaa']

test.use({ reducedMotion: 'reduce' })

/** The section of the playground that holds them. */
function layout(page: Page): Locator {
  return page.locator('#layout')
}

for (const colorScheme of ['light', 'dark'] as const) {
  test(`the pages and overlays pass axe, folded open, in the ${colorScheme} scheme`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme })
    await page.goto('/')
    await layout(page).getByRole('button', { name: 'The library' }).click()
    await layout(page).getByRole('tab', { name: 'Drafts' }).click()
    expect(await axeViolations(page, { tags: AAA })).toEqual([])
  })
}

test('a small button is drawn smaller but pressed over 44 px', async ({ page }) => {
  await page.goto('/')
  const button = page.getByRole('button', { name: 'Edit the loan' })
  const box = await button.boundingBox()
  expect(box?.height).toBeGreaterThanOrEqual(44)
  const drawn = await button.evaluate(
    (element) => parseFloat(getComputedStyle(element, '::before').height) || 0,
  )
  expect(drawn).toBeLessThan(40)
})

test('a combobox the page searches shows what the page finds, and one with a most counts', async ({
  page,
}) => {
  await page.goto('/')
  const box = page.getByRole('combobox', { name: 'Books to borrow' })
  await box.fill('dun')
  await expect(page.getByRole('option', { name: 'Dune' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByText('1 of 3 chosen')).toBeVisible()
})

test('a list of links folds behind its button on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 })
  await page.goto('/')
  const nav = page.getByRole('navigation', { name: 'Settings' })
  const toggle = nav.getByRole('button', { name: 'Settings' })
  await expect(nav.getByRole('link', { name: 'Profile' })).toBeHidden()
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')
  await expect(nav.getByRole('link', { name: 'Passkeys' })).toHaveAttribute('aria-current', 'page')
})

test('a persistent dialog stays through Escape, and its own button closes it', async ({ page }) => {
  await page.goto('/')
  await layout(page).getByRole('button', { name: 'Check my age' }).click()
  const dialog = page.getByRole('dialog', { name: 'Are you old enough?' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Close' })).toHaveCount(0)
  await page.keyboard.press('Escape')
  await expect(dialog).toBeVisible()
  expect(await axeViolations(page, { tags: AAA })).toEqual([])
  await dialog.getByRole('button', { name: 'Yes' }).click()
  await expect(dialog).toBeHidden()
})

test('a question with more answers offers each after Cancel, and says which was chosen', async ({
  page,
}) => {
  await page.goto('/')
  await layout(page).getByRole('button', { name: 'Save over a change' }).click()
  const question = page.getByRole('alertdialog')
  await expect(question.getByRole('button')).toHaveText(['Cancel', 'Load theirs', 'Keep mine'])
  await expect(question.getByRole('button', { name: 'Cancel' })).toBeFocused()
  await question.getByRole('button', { name: 'Keep mine' }).click()
  await expect(layout(page).getByText('Chose “mine”.')).toBeVisible()
})

test('a toast with Undo stays until it is used, and undoes', async ({ page }) => {
  await page.goto('/')
  const take = layout(page).getByRole('button', { name: 'Take “Beloved” off the shelf' })
  await take.click()
  await expect(take).toBeDisabled()
  const undo = page.locator('.kit-toast').getByRole('button', { name: 'Undo' })
  await expect(undo).toBeVisible()
  await undo.click()
  await expect(take).toBeEnabled()
})

test('the viewer opens from anywhere, with the app’s own button in its bar', async ({ page }) => {
  await page.goto('/')
  await layout(page).getByRole('button', { name: 'See the floor plans' }).click()
  const viewer = page.getByRole('dialog', { name: 'The reading room, from the door' })
  await expect(viewer).toBeVisible()
  await viewer.getByRole('button', { name: 'Report it' }).click()
  await expect(page.locator('.kit-toast')).toContainText('Reported “The reading room')
  await page.keyboard.press('Escape')
  await expect(viewer).toBeHidden()
})

test('a table offers a choice of page size, its pages over and under the rows', async ({
  page,
}) => {
  await page.goto('/')
  const table = page.getByRole('table', { name: 'Visitors' })
  await expect(table.getByRole('row')).toHaveCount(6)
  await expect(
    page.getByRole('navigation', { name: 'Pages of Visitors', exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole('navigation', { name: 'Pages of Visitors, under the rows' }),
  ).toBeVisible()
  await layout(page).getByRole('combobox', { name: 'Rows on a page' }).click()
  await page.getByRole('option', { name: '10' }).click()
  await expect(table.getByRole('row')).toHaveCount(11)
  await expect(layout(page).getByRole('button', { name: 'Sign a visitor in' })).toBeVisible()
})

test('a see-through color says how opaque it is', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('#controls').getByText('#5865f2, 80% opaque')).toBeVisible()
})
