import { expect, test } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'
import { WCAG_22_AA, axeViolations } from '@jwill89/test-a11y'

// What jsdom can't show of the third wave's larger pieces: a time and a moment typed in their
// parts, a run of days picked from its calendar, a list put in order by key and by drag, a form's
// save bar through a save and a conflict, the guard that asks before unsaved work is left, and a
// passkey renamed and removed, with axe on each in both schemes. The moments are shown in
// London's time, so what the parts say is the same on every machine.

const AAA = [...WCAG_22_AA, 'wcag2aaa']

test.use({ reducedMotion: 'reduce', timezoneId: 'Europe/London', locale: 'en-GB' })

/** The section of the playground that holds them. */
function work(page: Page): Locator {
  return page.locator('#work')
}

/** What the time and date fields store. */
async function stored(page: Page): Promise<Record<string, unknown>> {
  return JSON.parse((await page.getByTestId('times-json').textContent()) ?? '{}') as Record<
    string,
    unknown
  >
}

/** A field's parts, by its caption. */
function parts(page: Page, caption: string): Locator {
  return work(page).getByRole('group', { name: caption, exact: true }).getByRole('spinbutton')
}

for (const colorScheme of ['light', 'dark'] as const) {
  test(`the times, the list, the save bar and the passkeys pass axe in the ${colorScheme} scheme`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme })
    await page.goto('/#work')
    await work(page).getByLabel('Branch name').fill('Riverside North')
    await expect(work(page).getByText('You have unsaved changes.')).toBeVisible()
    expect(await axeViolations(page, { tags: AAA })).toEqual([])

    await work(page).getByRole('button', { name: 'Choose the dates' }).first().click()
    await expect(work(page).locator('.kit-calendar')).toBeVisible()
    expect(await axeViolations(page, { tags: AAA })).toEqual([])
  })
}

test('a time of day and a moment are typed in their parts, the moment kept in UTC', async ({
  page,
}) => {
  await page.goto('/#work')
  const doors = parts(page, 'Doors open')
  await expect(doors).toHaveText(['09', '30'])
  await doors.first().click()
  await page.keyboard.type('11')
  await expect.poll(async () => (await stored(page)).doorsOpen).toBe('11:30')

  // 19:00 UTC on 3 December is 19:00 in London, whose winter time is UTC's.
  const reading = parts(page, 'Reading starts')
  await expect(reading).toHaveText(['03', '12', '2026', '19', '00'])
  await expect(
    work(page)
      .getByRole('group', { name: 'Reading starts', exact: true })
      .locator('.kit-date-field__zone'),
  ).toHaveText(/^GMT(\+0)?$/)
  await reading.nth(3).focus()
  await page.keyboard.press('ArrowUp')
  await expect.poll(async () => (await stored(page)).readingStarts).toBe('2026-12-03T20:00:00Z')
})

test('a run of days is picked from its calendar, a first press and a second', async ({ page }) => {
  await page.goto('/#work')
  const field = work(page).getByRole('group', { name: 'Exhibition dates', exact: true })
  await expect(field.getByRole('group', { name: 'From' }).getByRole('spinbutton')).toHaveText([
    '01',
    '12',
    '2026',
  ])
  await field.getByRole('button', { name: 'Choose the dates' }).click()
  const calendar = work(page).locator('.kit-calendar')
  await calendar.getByRole('button', { name: /\b3 December/ }).click()
  await calendar.getByRole('button', { name: /\b9 December/ }).click()
  await expect
    .poll(async () => (await stored(page)).exhibition)
    .toEqual(['2026-12-03', '2026-12-09'])

  // A start and an end with their times are two moments, each in its own zone, here New York's.
  const signing = work(page).getByRole('group', { name: 'Signing starts', exact: true })
  await expect(signing.getByRole('spinbutton')).toHaveText(['05', '12', '2026', '10', '00'])
  await expect(signing.locator('.kit-date-field__zone')).toHaveText(/^(EST|GMT-5)$/)
})

test('a row moves by the arrow keys on its handle, keeping the focus, and by a drag', async ({
  page,
}) => {
  await page.goto('/#work')
  const list = work(page).getByRole('list', { name: 'Shelves, in the order they show' })
  const rows = list.getByRole('listitem')
  const handle = list.getByRole('button', { name: /^Move New arrivals:/ })
  await handle.focus()
  await page.keyboard.press('ArrowDown')
  await expect(rows.first()).toContainText('Staff picks')
  await expect(rows.nth(1)).toContainText('New arrivals')
  await expect(list.getByRole('button', { name: /^Move New arrivals:/ })).toBeFocused()

  // Poetry, dragged by its handle to the top.
  const poetry = list.getByRole('button', { name: /^Move Poetry:/ })
  await poetry.scrollIntoViewIfNeeded()
  const from = await poetry.boundingBox()
  const to = await rows.first().boundingBox()
  if (!from || !to) {
    throw new Error('The rows aren’t laid out.')
  }
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
  await page.mouse.down()
  await page.mouse.move(from.x + from.width / 2, to.y + 4, { steps: 8 })
  // The row in hand is drawn where it is carried, and the first row moves down to make room.
  await expect(rows.nth(3)).toHaveClass(/kit-reorder-list__row--held/)
  await expect(rows.first()).toHaveAttribute('style', /translateY\(\d+(\.\d+)?px\)/)
  await page.mouse.up()
  await expect(rows.first()).toContainText('Poetry')
})

test('the save bar saves, then meets a change made elsewhere, and Reload takes it', async ({
  page,
}) => {
  await page.goto('/#work')
  const name = work(page).getByLabel('Branch name')
  await name.fill('Riverside North')
  const bar = work(page).locator('.kit-save-bar')
  await expect(bar).toContainText('You have unsaved changes.')
  await bar.getByRole('button', { name: 'Save' }).click()
  await expect(bar).toContainText('Saved.')
  await expect(bar).toBeHidden()

  await work(page).getByRole('checkbox', { name: 'Someone else changed it meanwhile' }).check()
  await name.fill('Riverside South')
  await bar.getByRole('button', { name: 'Save' }).click()
  await expect(bar).toContainText('changed somewhere else')
  expect(await axeViolations(page, { tags: AAA })).toEqual([])
  await bar.getByRole('button', { name: 'Reload' }).click()
  await expect(name).toHaveValue('Riverside East')
  await expect(bar).toBeHidden()
})

test('leaving the page asks first only while the form holds unsaved work', async ({ page }) => {
  await page.goto('/#work')
  const leaving = (): Promise<boolean> =>
    page.evaluate(() => {
      const event = new Event('beforeunload', { cancelable: true })
      window.dispatchEvent(event)
      return event.defaultPrevented
    })
  expect(await leaving()).toBe(false)
  await work(page).getByLabel('Branch name').fill('Riverside North')
  expect(await leaving()).toBe(true)
  await work(page).locator('.kit-save-bar').getByRole('button', { name: 'Discard' }).click()
  expect(await leaving()).toBe(false)
})

test('a passkey is renamed in a dialog and removed once the person says so', async ({ page }) => {
  await page.goto('/#work')
  const keys = work(page).getByRole('list', { name: 'Your passkeys' })
  await keys.getByRole('button', { name: 'Rename Phone' }).click()
  const dialog = page.getByRole('dialog', { name: 'Rename this passkey' })
  const box = dialog.getByLabel('Name')
  await expect(box).toBeFocused()
  await expect(box).toHaveValue('Phone')
  expect(await axeViolations(page, { tags: AAA })).toEqual([])
  await box.fill('Pocket phone')
  await box.press('Enter')
  await expect(dialog).toBeHidden()
  await expect(keys).toContainText('Pocket phone')

  await keys.getByRole('button', { name: 'Remove Pocket phone' }).click()
  const question = page.getByRole('alertdialog', { name: 'Remove “Pocket phone”?' })
  await question.getByRole('button', { name: 'Remove', exact: true }).click()
  await expect(keys.getByRole('listitem')).toHaveCount(1)

  await work(page).getByRole('button', { name: 'Add a passkey' }).click()
  await expect(keys.getByRole('listitem')).toHaveCount(2)
})

test('the third wave’s pieces never send the page sideways on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 })
  await page.goto('/#work')
  await expect(work(page).getByRole('group', { name: 'Signing ends', exact: true })).toBeVisible()
  const widths = await page.evaluate(() => ({
    page: document.documentElement.scrollWidth,
    view: document.documentElement.clientWidth,
  }))
  expect(widths.page).toBeLessThanOrEqual(widths.view)
})
