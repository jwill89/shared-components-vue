import { readFile } from 'node:fs/promises'
import { expect, test } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'
import { WCAG_22_AA, axeViolations } from '@jwill89/test-a11y'

// What jsdom can't show: the table as a browser lays it out and a keyboard drives it, axe on each
// of its states in both schemes, and a phone's width, where the table scrolls inside its frame and
// the page never scrolls sideways. The second table has the rest: rows that open, filters, groups,
// a CSV as the browser saves it, columns resized by key and by drag, and rows as cards.

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

  await page.getByRole('searchbox', { name: 'Search', exact: true }).fill('jemisin')
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

/** The second table, with the rest asked for, and the box around it that holds its toolbar. */
function loans(page: Page): { table: Locator; root: Locator } {
  const table = page.getByRole('table', { name: 'Lending' })
  return { table, root: page.locator('.kit-data-table').filter({ has: table }) }
}

for (const colorScheme of ['light', 'dark'] as const) {
  test(`rows open, grouped, with the widths panel open, pass axe in the ${colorScheme} scheme`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme })
    await page.goto('/')
    const { table, root } = loans(page)
    await page
      .getByRole('group', { name: 'Group by' })
      .getByRole('button', { name: 'Room' })
      .click()
    await expect(table.getByRole('rowheader', { name: 'Bedroom' })).toBeVisible()
    await table.getByRole('button', { name: 'Details: Book 4' }).click()
    await root.getByRole('button', { name: 'Column widths' }).click()
    await expect(page.getByRole('button', { name: 'Wider Title' })).toBeVisible()
    expect(await axeViolations(page, { tags: AAA })).toEqual([])
  })
}

test('a row opens by keyboard, its button says so, and its detail sits under it', async ({
  page,
}) => {
  await page.goto('/')
  const { table } = loans(page)
  const opener = table.getByRole('button', { name: 'Details: Book 1' })
  await expect(opener).toHaveAttribute('aria-expanded', 'false')
  await opener.focus()
  await page.keyboard.press('Enter')
  await expect(opener).toHaveAttribute('aria-expanded', 'true')
  const id = String(await opener.getAttribute('aria-controls'))
  const detail = page.locator(`[id="${id}"]`)
  await expect(detail).toHaveText('Book 1, 1970. Lent 1 times; last back on a Monday.')
  // The detail is the row after its own.
  await expect(table.getByRole('row').nth(2)).toHaveAttribute('id', id)
  await page.keyboard.press('Space')
  await expect(opener).toHaveAttribute('aria-expanded', 'false')
  await expect(detail).toHaveCount(0)
})

test('a filter offers each value with how many rows hold it, and narrows the rows to one', async ({
  page,
}) => {
  await page.goto('/')
  const { table, root } = loans(page)
  const room = root.getByRole('combobox', { name: 'Room', exact: true })
  await room.focus()
  await page.keyboard.press('Enter')
  const listbox = page.getByRole('listbox')
  await expect(listbox.getByRole('option')).toHaveText([
    'Any',
    'Bedroom (6)',
    'Hall (5)',
    'Landing (5)',
    'Study (5)',
    'Not put away (3)',
  ])
  await listbox.getByRole('option', { name: 'Hall (5)' }).click()
  await expect(root.getByRole('status')).toHaveText('5 of 24')
  await expect(table.getByRole('row')).toHaveCount(6)
  await expect(table.getByRole('cell', { name: 'Hall', exact: true })).toHaveCount(5)

  // The other filter counts only among the rows this one leaves.
  await root.getByRole('combobox', { name: 'Subjects', exact: true }).click()
  await expect(listbox.getByRole('option')).toHaveText(['Any', 'science fiction (5)'])
  await page.keyboard.press('Escape')
})

test('Download as CSV saves the rows matching, as a spreadsheet reads them', async ({ page }) => {
  await page.goto('/')
  const { root } = loans(page)
  await root.getByRole('searchbox', { name: 'Search lending' }).fill('Butler')
  await expect(root.getByRole('status')).toHaveText('3 of 24')
  const saving = page.waitForEvent('download')
  await root.getByRole('button', { name: 'Download as CSV' }).click()
  const download = await saving
  expect(download.suggestedFilename()).toBe('lending.csv')
  const bytes = await readFile(await download.path())
  // A byte-order mark first, so a spreadsheet reads the file as UTF-8, then RFC 4180's lines.
  expect([...bytes.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf])
  expect(bytes.subarray(3).toString('utf8')).toBe(
    'Title,Author,Room,Subjects,Year\r\n' +
      'Book 4,Butler,Bedroom,essays,2003\r\n' +
      'Book 12,Butler,Bedroom,essays,1991\r\n' +
      'Book 20,Butler,Bedroom,essays,1979\r\n',
  )
})

test('a column widens by its edge, by key and by drag, and the panel puts it back', async ({
  page,
}) => {
  await page.goto('/')
  const { table, root } = loans(page)
  const heading = table.getByRole('columnheader', { name: 'Subjects', exact: true })
  const edge = table.getByRole('separator', { name: 'Width of Subjects' })
  const drawn = async (): Promise<number> => (await heading.boundingBox())?.width ?? 0

  const before = await drawn()
  await edge.focus()
  await page.keyboard.press('ArrowRight')
  await expect(edge).toHaveAttribute('aria-valuenow', String(Math.round(before) + 16))
  expect(await drawn()).toBeCloseTo(Math.round(before) + 16, 0)

  const box = await edge.boundingBox()
  if (!box) {
    throw new Error('The edge isn’t drawn.')
  }
  const held = await drawn()
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2 + 60, box.y + box.height / 2, { steps: 4 })
  await page.mouse.up()
  expect(await drawn()).toBeCloseTo(held + 60, -1)

  // The panel does it by a single press, and puts every width back.
  await root.getByRole('button', { name: 'Column widths' }).click()
  await page.getByRole('button', { name: 'Put the widths back' }).click()
  expect(await drawn()).toBeCloseTo(before, -1)
})

test('at a phone’s width each row is a card, every cell named, and the page never sideways', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 800 })
  await page.goto('/')
  const { table, root } = loans(page)
  await expect(root).toHaveClass(/is-stacked/)
  // The table keeps its roles as cards, so a screen reader still reads each cell with its heading.
  await expect(table.getByRole('columnheader', { name: 'Author' })).toHaveCount(1)
  const first = table.getByRole('row').nth(1)
  await expect(first.getByRole('rowheader', { name: 'Book 1' })).toBeVisible()
  const named = await first
    .locator('[data-label]')
    .evaluateAll((cells) =>
      cells.map((cell) => getComputedStyle(cell, '::before').content.replace(/ \/ ""$/, '')),
    )
  expect(named).toEqual(['"Title"', '"Author"', '"Room"', '"Subjects"', '"Year"'])
  await expect(root.getByRole('separator')).toHaveCount(0)
  const widths = await page.evaluate(() => ({
    page: document.documentElement.scrollWidth,
    screen: document.documentElement.clientWidth,
  }))
  expect(widths.page).toBeLessThanOrEqual(widths.screen)
  expect(await axeViolations(page, { tags: AAA })).toEqual([])
})
