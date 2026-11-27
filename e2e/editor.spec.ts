import { expect, test, type Locator, type Page } from '@playwright/test'
import { WCAG_22_AA, axeViolations } from '@jwill89/test-a11y'

// What jsdom can't show: the Markdown editor as a browser runs it, loaded on first use from its
// own entry. Markdown typed straight in takes its form, a key at a time; the Discord dialect's
// toolbar writes bold and underline each its own way; its suggestions open under the cursor and
// put in the one chosen; its link popover opens from text that has the focus; and the editors,
// a suggestion list open among them, pass axe in both schemes with the AAA rules on.

const AAA = [...WCAG_22_AA, 'wcag2aaa']

test.use({ reducedMotion: 'reduce' })

/** An editor's text box, by its field's caption. */
function editorBox(page: Page, caption: string): Locator {
  return page.getByRole('textbox', { name: caption, exact: true })
}

function stored(page: Page, which: 'about' | 'announcement' | 'notes'): Locator {
  return page.getByTestId(`${which}-markdown`)
}

/** Types as a person does, a key at a time, so each typing rule runs. */
async function typeKeys(page: Page, words: string): Promise<void> {
  await page.keyboard.type(words, { delay: 10 })
}

for (const colorScheme of ['light', 'dark'] as const) {
  test(`the editors pass axe in the ${colorScheme} scheme, a suggestion list open`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme })
    await page.goto('/#editor')
    const box = editorBox(page, 'Announcement')
    await expect(box).toBeVisible()
    expect(await axeViolations(page, { tags: AAA })).toEqual([])

    await box.click()
    await page.keyboard.press('Control+End')
    await typeKeys(page, ' @Sa')
    await expect(page.getByRole('listbox', { name: 'Suggestions' })).toBeVisible()
    expect(await axeViolations(page, { tags: AAA })).toEqual([])
  })
}

test('Markdown typed in CommonMark takes its form as it is typed', async ({ page }) => {
  await page.goto('/#editor')
  const box = editorBox(page, 'About the shelf')
  await box.click()
  await page.keyboard.press('Control+End')
  await page.keyboard.press('Enter')
  await typeKeys(page, '## Hours')
  await page.keyboard.press('Enter')
  await typeKeys(page, 'Open **daily** ')
  await expect(box.locator('h2', { hasText: 'Hours' })).toBeVisible()
  await expect(box.locator('strong', { hasText: 'daily' })).toBeVisible()
  await expect(stored(page, 'about')).toContainText('## Hours\n\nOpen **daily**')
})

test('Discord’s toolbar writes bold with stars and underline with underscores', async ({
  page,
}) => {
  await page.goto('/#editor')
  const box = editorBox(page, 'Announcement')
  // The announcement's toolbar: the second on the section, after the CommonMark editor's.
  const toolbar = page.locator('#editor').getByRole('toolbar').nth(1)
  // A new line under the heading, where no mark carries on from the words before.
  await box.getByText('Book club').click()
  await page.keyboard.press('End')
  await page.keyboard.press('Enter')
  await typeKeys(page, 'loud')
  await page.keyboard.press('Shift+Home')
  await toolbar.getByRole('button', { name: 'Bold' }).click()
  await expect(stored(page, 'announcement')).toContainText('\n**loud**\n')
  await toolbar.getByRole('button', { name: 'Bold' }).click()
  await toolbar.getByRole('button', { name: 'Underline' }).click()
  await expect(stored(page, 'announcement')).toContainText('\n__loud__\n')
  await expect(toolbar.getByRole('button', { name: 'Underline' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )

  // Typed, `__` is underline as well, and `**` bold. The underline stops at the end of its word.
  await page.keyboard.press('End')
  await toolbar.getByRole('button', { name: 'Underline' }).click()
  await typeKeys(page, ' __low__ **high** ')
  await expect(stored(page, 'announcement')).toContainText('__loud__ __low__ **high**')
})

test('a suggestion chosen by keyboard goes in as its token, shown by name', async ({ page }) => {
  await page.goto('/#editor')
  const box = editorBox(page, 'Announcement')
  await box.click()
  await page.keyboard.press('Control+End')
  await typeKeys(page, ' @Sa')
  const list = page.getByRole('listbox', { name: 'Suggestions' })
  await expect(list.getByRole('option')).toHaveText(['@Sam', '@Sasha'])
  await expect(box).toHaveAttribute('aria-activedescendant', /.+/)
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  await expect(list).toBeHidden()
  await expect(stored(page, 'announcement')).toContainText('<@2>')
  await expect(box.getByText('@Sasha')).toBeVisible()
  await expect(page.locator('.kit-discord-preview').getByText('@Sasha')).toBeVisible()
})

test('the link popover opens on one press from focused text, and again after a removal', async ({
  page,
}) => {
  await page.goto('/#editor')
  const box = editorBox(page, 'About the shelf')
  const link = page.getByRole('toolbar').first().getByRole('button', { name: 'Link', exact: true })
  await box.getByText('atlases').dblclick()
  await link.click()
  const address = page.getByRole('textbox', { name: 'Link address' })
  await expect(address).toBeFocused()
  await address.fill('example.com/atlases')
  await address.press('Enter')
  await expect(stored(page, 'about')).toContainText('(https://example.com/atlases)')

  // Focus is back in the text once the link is in; the word chosen again shows its link.
  await expect(box).toBeFocused()
  await box.getByText('atlases').dblclick()
  await expect(link).toHaveAttribute('aria-pressed', 'true')
  await link.click()
  await page.getByRole('button', { name: 'Remove the link' }).click()
  await expect(stored(page, 'about')).toContainText('**atlases**')
  await expect(stored(page, 'about')).not.toContainText('example.com/atlases')
  await link.click()
  await expect(page.getByRole('textbox', { name: 'Link address' })).toBeVisible()
})

test('at a phone’s width the toolbars wrap and the page never scrolls sideways', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 800 })
  await page.goto('/#editor')
  await expect(editorBox(page, 'Announcement')).toBeVisible()
  const widths = await page.evaluate(() => ({
    page: document.documentElement.scrollWidth,
    screen: window.innerWidth,
  }))
  expect(widths.page).toBeLessThanOrEqual(widths.screen)
})

test('an extension’s tool shows only where it applies, and a menu tool’s item goes in where the cursor was', async ({
  page,
}) => {
  await page.goto('/#editor')
  const box = editorBox(page, 'Shelf notes')
  const toolbar = page.locator('#editor').getByRole('toolbar').last()
  await box.getByText('Ask at the desk.').click()
  await expect(toolbar.getByRole('button', { name: 'Leave the list' })).toHaveCount(0)
  await box.getByText('Signed copies on the left').click()
  await expect(toolbar.getByRole('button', { name: 'Leave the list' })).toBeVisible()

  await box.getByText('Ask at the desk.').click()
  await page.keyboard.press('End')
  await toolbar.getByRole('button', { name: 'Insert a snippet' }).click()
  const menu = page.getByRole('menu', { name: 'Insert a snippet' })
  await expect(menu.getByRole('menuitem')).toHaveText(['Opening hours', 'Lending rules'])
  expect(await axeViolations(page, { tags: AAA })).toEqual([])
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  await expect(menu).toBeHidden()
  await expect(stored(page, 'notes')).toContainText('Ask at the desk.Three weeks a loan')
  await expect(box).toBeFocused()
})
