import { expect, test, type Page } from '@playwright/test'
import { WCAG_22_AA, axeViolations } from '@jwill89/test-a11y'

// What jsdom can't show: the embed editor and the message preview as a browser runs them. A part
// changed in the editor shows in the preview and in what it posts, the color picker opens beside
// its field and passes axe with the page, and nothing sends the page sideways on a phone.

const AAA = [...WCAG_22_AA, 'wcag2aaa']

test.use({ reducedMotion: 'reduce' })

function posted(page: Page) {
  return page.getByTestId('embed-json')
}

const embeds = (page: Page) => page.locator('#embeds')

for (const colorScheme of ['light', 'dark'] as const) {
  test(`the embed editor, its preview and an open color picker pass axe in the ${colorScheme} scheme`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme })
    await page.goto('/#embeds')
    await expect(embeds(page).getByRole('textbox', { name: 'Title', exact: true })).toBeVisible()
    expect(await axeViolations(page, { tags: AAA })).toEqual([])

    await embeds(page).getByLabel('Color', { exact: true }).click()
    await expect(page.getByRole('dialog', { name: /Color/ })).toBeVisible()
    expect(await axeViolations(page, { tags: AAA })).toEqual([])
  })
}

test('a color picked from Discord’s shows on the bar and in what it posts', async ({ page }) => {
  await page.goto('/#embeds')
  await embeds(page).getByLabel('Color', { exact: true }).click()
  await page.getByRole('dialog', { name: /Color/ }).getByRole('option', { name: 'Pink' }).click()
  await expect(posted(page)).toContainText(`"color": ${String(0xe91e63)}`)
  const bar = await embeds(page)
    .locator('.kit-discord-embed')
    .evaluate((embed) => getComputedStyle(embed).borderInlineStartColor)
  expect(bar).toBe('rgb(233, 30, 99)')
})

test('a title typed and a field added show in the preview as Discord sets them', async ({
  page,
}) => {
  await page.goto('/#embeds')
  const title = embeds(page).getByRole('textbox', { name: 'Title', exact: true })
  await title.click()
  // The end of the title, not of the line on screen: the title wraps where the fonts make it.
  await page.keyboard.press('Control+End')
  await page.keyboard.type(' tonight', { delay: 10 })
  await expect(embeds(page).locator('.kit-discord-embed__title')).toContainText('Darkness tonight')

  await embeds(page).getByRole('button', { name: 'Add a field to the embed' }).click()
  const name = embeds(page).getByRole('textbox', { name: /Field 3’s name/ })
  await name.click()
  await page.keyboard.type('Bring', { delay: 10 })
  await expect(posted(page)).toContainText('"name": "Bring"')
  await expect(embeds(page).locator('.kit-discord-embed__field-name').last()).toHaveText('Bring')
})

test('at a phone’s width the editor and the preview never send the page sideways', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 800 })
  await page.goto('/#embeds')
  await expect(embeds(page).getByRole('textbox', { name: 'Title', exact: true })).toBeVisible()
  const widths = await page.evaluate(() => ({
    page: document.documentElement.scrollWidth,
    screen: window.innerWidth,
  }))
  expect(widths.page).toBeLessThanOrEqual(widths.screen)
})

test('a link button added in the editor shows under the message and in what it posts', async ({
  page,
}) => {
  await page.goto('/#embeds')
  const preview = embeds(page).locator('.kit-discord-message')
  await expect(preview.getByRole('link', { name: '📚 Join the club' })).toHaveAttribute(
    'href',
    'https://example.com/club',
  )
  await embeds(page).getByRole('button', { name: 'Add a button' }).click()
  await embeds(page).getByLabel('Button 2’s words').fill('The reading list')
  await embeds(page).getByLabel('Button 2’s link').fill('https://example.com/list')
  await embeds(page).getByLabel('Button 2’s emoji').fill('📖')
  const link = preview.getByRole('link', { name: '📖 The reading list' })
  await expect(link).toHaveAttribute('target', '_blank')
  await expect(page.getByTestId('buttons-json')).toContainText('"label": "The reading list"')
  expect(await axeViolations(page, { tags: AAA })).toEqual([])
})
