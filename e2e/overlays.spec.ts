import { expect, test } from '@playwright/test'
import { WCAG_22_AA, axeViolations } from '@jwill89/test-a11y'

// What jsdom can't show: the tooltip, the loading cover, the lightbox and the tag input as a
// browser runs them. A tooltip opens on hover and on focus; a cover makes its content truly out
// of reach and gives focus back after; the lightbox fits the screen, moves by the arrow keys and
// gives focus back on Escape; and each passes axe, in both schemes, with the AAA rules on.

const AAA = [...WCAG_22_AA, 'wcag2aaa']

test.use({ reducedMotion: 'reduce' })

for (const colorScheme of ['light', 'dark'] as const) {
  test(`an open tooltip and lightbox pass axe in the ${colorScheme} scheme`, async ({ page }) => {
    await page.emulateMedia({ colorScheme })
    await page.goto('/')

    await page.getByRole('button', { name: 'Copy the link' }).hover()
    await expect(page.getByRole('tooltip')).toHaveText('Copies the link to this shelf')
    expect(await axeViolations(page, { tags: AAA })).toEqual([])
    await page.keyboard.press('Escape')

    await page.getByRole('button', { name: 'The oak shelf by the window' }).click()
    await expect(page.getByRole('dialog', { name: 'The oak shelf by the window' })).toBeVisible()
    expect(await axeViolations(page, { tags: AAA })).toEqual([])
  })
}

test('a tooltip opens on focus too, and describes its control', async ({ page }) => {
  await page.goto('/')
  const button = page.getByRole('button', { name: 'Open the shelf' })
  // Reka closes a tooltip when the page scrolls, as focus scrolls a control below the fold into
  // view; a person tabs to a control they can see.
  await button.scrollIntoViewIfNeeded()
  await button.focus()
  const tooltip = page.getByRole('tooltip')
  await expect(tooltip).toHaveText('Opens the shelf on a page of its own')
  await expect(button).toHaveAccessibleDescription('Opens the shelf on a page of its own')
  await page.keyboard.press('Escape')
  await expect(tooltip).toBeHidden()
})

test('a loading cover puts its content out of reach, then gives focus back', async ({ page }) => {
  await page.goto('/')
  const save = page.getByRole('button', { name: 'Save the shelf' })
  await save.click()
  await expect(page.getByRole('status').filter({ hasText: 'Saving the shelf…' })).toBeVisible()
  // Inert: the field under the cover can be neither focused nor pressed.
  const name = page.getByLabel('Shelf name')
  await name.focus()
  await expect(name).not.toBeFocused()
  await expect(save).not.toBeFocused()

  await expect(page.getByRole('status').filter({ hasText: 'Saving the shelf…' })).toBeHidden()
  await expect(save).toBeFocused()
})

test('the lightbox fits the screen, moves by the arrow keys, and gives focus back', async ({
  page,
}) => {
  await page.goto('/')
  const opener = page.getByRole('button', { name: 'The paperbacks, two deep' })
  await opener.click()
  const viewer = page.getByRole('dialog', { name: 'The paperbacks, two deep' })
  await expect(viewer).toBeVisible()
  await expect(viewer.getByRole('button', { name: 'Close' })).toBeFocused()

  // The picture is held inside the screen, above the bar.
  const fits = await viewer.locator('img').evaluate((image) => {
    const box = image.getBoundingClientRect()
    return box.top >= 0 && box.bottom <= window.innerHeight && box.right <= window.innerWidth
  })
  expect(fits).toBe(true)

  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('dialog', { name: 'The atlas on its side' })).toBeVisible()
  await expect(page.getByText('3 of 3')).toBeVisible()
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('dialog', { name: 'The oak shelf by the window' })).toBeVisible()

  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(opener).toBeFocused()
})

test('a tag input adds what is typed, offers its suggestions, and removes by its chips', async ({
  page,
}) => {
  await page.goto('/')
  const box = page.getByRole('textbox', { name: 'Tags', exact: true })
  const field = page.locator('.kit-tag-input').filter({ has: box })
  const chips = field.locator('.kit-chip__label')
  await expect(chips).toHaveText(['fiction', 'signed'])

  await box.fill('Rare, Gift')
  await box.press('Enter')
  await expect(chips).toHaveText(['fiction', 'signed', 'rare', 'gift'])

  await field.getByRole('button', { name: 'Add poetry' }).click()
  await expect(chips).toHaveText(['fiction', 'signed', 'rare', 'gift', 'poetry'])
  await expect(box).toBeFocused()
  // Five is its most: it offers nothing more.
  await expect(field.getByRole('group', { name: 'Suggestions' })).toBeHidden()

  await field.getByRole('button', { name: 'Remove signed' }).click()
  await expect(chips).toHaveText(['fiction', 'rare', 'gift', 'poetry'])
})
