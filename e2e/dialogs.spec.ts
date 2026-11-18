import { expect, test } from '@playwright/test'
import { WCAG_22_AA, axeViolations } from '@jwill89/test-a11y'

// What jsdom can't show: a dialog as a browser runs it. Focus moves in and is held there,
// the page behind can't scroll, Escape closes it, focus goes back to what opened it, and axe
// passes with it open, in both schemes, with the AAA rules on.

const AAA = [...WCAG_22_AA, 'wcag2aaa']

for (const colorScheme of ['light', 'dark'] as const) {
  test(`an open dialog and confirm pass axe in the ${colorScheme} scheme`, async ({ page }) => {
    await page.emulateMedia({ colorScheme })
    await page.goto('/')

    await page.getByRole('button', { name: 'Add a book' }).click()
    await expect(page.getByRole('dialog', { name: 'Add a book' })).toBeVisible()
    expect(await axeViolations(page, { tags: AAA })).toEqual([])
    await page.keyboard.press('Escape')

    await page.getByRole('button', { name: 'Delete the shelf' }).click()
    await expect(page.getByRole('alertdialog', { name: 'Delete this shelf?' })).toBeVisible()
    expect(await axeViolations(page, { tags: AAA })).toEqual([])
  })
}

test('a dialog holds focus, locks the page, closes on Escape and gives focus back', async ({
  page,
}) => {
  await page.goto('/')
  const scrollY = (): Promise<number> => page.evaluate(() => window.scrollY)
  // With no dialog open, the wheel moves the page, so a still page below means the lock held.
  await page.mouse.move(10, 300)
  await page.mouse.wheel(0, 600)
  await expect.poll(scrollY).toBeGreaterThan(0)

  const opener = page.getByRole('button', { name: 'About this shelf' })
  await opener.focus()
  await page.keyboard.press('Enter')

  const dialog = page.getByRole('dialog', { name: 'About this shelf' })
  await expect(dialog).toBeVisible()
  const close = dialog.getByRole('button', { name: 'Close' })
  await expect(close).toBeFocused()
  // The Close button is its one control, so Tab comes back round to it.
  await page.keyboard.press('Tab')
  await expect(close).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  await expect(close).toBeFocused()

  // The page behind doesn't move under the wheel. (A script can still scroll it; a person can't.)
  // Nothing happening has no event to wait for, so the check waits as long as a scroll takes.
  const before = await scrollY()
  await page.mouse.wheel(0, 600)
  await page.waitForTimeout(400)
  expect(await scrollY()).toBe(before)

  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(opener).toBeFocused()
})

test('a form says what is missing, waits while it saves, and closes once saved', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Add a book' }).click()
  const dialog = page.getByRole('dialog', { name: 'Add a book' })
  const field = dialog.getByLabel('Title')
  await expect(field).toBeFocused()
  // Its body scrolls up and down when it must, never sideways.
  const sideways = await dialog
    .locator('.kit-dialog__body')
    .evaluate((body) => body.scrollWidth - body.clientWidth)
  expect(sideways).toBe(0)

  await field.press('Enter')
  await expect(dialog.getByText('A book needs a title.')).toBeVisible()
  await expect(field).toHaveAttribute('aria-invalid', 'true')

  await field.fill('The Dispossessed')
  await field.press('Enter')
  await expect(dialog.getByRole('button', { name: 'Add the book' })).toHaveAttribute(
    'aria-busy',
    'true',
  )
  await expect(dialog).toBeHidden()
  await expect(page.getByText('Added “The Dispossessed”.')).toBeVisible()
})

test('a form keeps what was typed when the page behind it is pressed', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Add a book' }).click()
  const dialog = page.getByRole('dialog', { name: 'Add a book' })
  await dialog.getByLabel('Title').fill('Half typed')
  await page.mouse.click(5, 5)
  await expect(dialog).toBeVisible()
  await expect(dialog.getByLabel('Title')).toHaveValue('Half typed')
})

test('confirm() starts on Cancel and resolves to the answer', async ({ page }) => {
  await page.goto('/')
  const opener = page.getByRole('button', { name: 'Delete the shelf' })
  await opener.click()
  const question = page.getByRole('alertdialog', { name: 'Delete this shelf?' })
  await expect(question.getByRole('button', { name: 'Cancel' })).toBeFocused()

  // A press outside an alert does nothing.
  await page.mouse.click(5, 5)
  await expect(question).toBeVisible()

  await page.keyboard.press('Enter')
  await expect(question).toBeHidden()
  await expect(page.getByText('The shelf was kept.')).toBeVisible()
  await expect(opener).toBeFocused()

  await opener.click()
  await question.getByRole('button', { name: 'Delete the shelf' }).click()
  await expect(page.getByText('The shelf was deleted.')).toBeVisible()
})

test('a confirm dialog stays while its action runs', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Empty the bin' }).click()
  const question = page.getByRole('alertdialog', { name: 'Empty the bin?' })
  await question.getByRole('button', { name: 'Empty it' }).click()
  await expect(question.getByRole('button', { name: 'Cancel' })).toBeDisabled()
  await page.keyboard.press('Escape')
  await expect(question).toBeVisible()
  await expect(question).toBeHidden()
  await expect(page.getByText('The bin was emptied.')).toBeVisible()
})
