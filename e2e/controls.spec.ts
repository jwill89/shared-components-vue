import { expect, test } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'
import { WCAG_22_AA, axeViolations } from '@jwill89/test-a11y'

// What jsdom can't show of the third wave's pieces: the boxes, rings and slider as a keyboard and
// a pointer work them, each control's press area, a text box's ring drawn round its places, a
// box that grows as it is typed in, files chosen through the browser's own picker, a part that
// stays in the page for find in page, a copy that reaches the clipboard, the skip link, and axe
// with each open or chosen in both schemes.

const AAA = [...WCAG_22_AA, 'wcag2aaa']

test.use({ reducedMotion: 'reduce' })

/** The section of the playground that holds the controls. */
function controls(page: Page): Locator {
  return page.locator('#controls')
}

for (const colorScheme of ['light', 'dark'] as const) {
  test(`the controls and content pass axe, chosen and open, in the ${colorScheme} scheme`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme })
    await page.goto('/')
    const section = controls(page)
    await section.getByRole('checkbox', { name: 'Hardback' }).check()
    await section.getByRole('radio', { name: 'Worn' }).check()
    await section.getByRole('button', { name: 'Show password' }).click()
    await section.getByRole('button', { name: 'Favourite' }).click()
    await page.getByRole('button', { name: 'Where the collection came from' }).click()
    await page.getByRole('button', { name: 'Open all' }).click()
    expect(await axeViolations(page, { tags: AAA })).toEqual([])
  })
}

test('a box ticks by a click on its words and by Space, each with a 44 px row', async ({
  page,
}) => {
  await page.goto('/')
  const section = controls(page)
  const box = section.getByRole('checkbox', { name: 'Hardback' })
  await expect(box).not.toBeChecked()
  await section.getByText('Hardback', { exact: true }).click()
  await expect(box).toBeChecked()
  await box.focus()
  await page.keyboard.press('Space')
  await expect(box).not.toBeChecked()

  // Each box is its own stop for Tab.
  await box.focus()
  await page.keyboard.press('Tab')
  await expect(section.getByRole('checkbox', { name: 'Paperback' })).toBeFocused()

  const rows = await section
    .locator('.kit-checkbox')
    .evaluateAll((all) => all.map((row) => row.getBoundingClientRect().height))
  expect(Math.min(...rows)).toBeGreaterThanOrEqual(44)
  // The box's press area reaches 44 px round it, though the box is drawn smaller.
  const area = await box.evaluate((element) => {
    const after = getComputedStyle(element, '::after')
    const drawn = element.getBoundingClientRect()
    return drawn.height - 2 * parseFloat(after.top)
  })
  expect(area).toBeGreaterThanOrEqual(44)
})

test('radio answers are one stop for Tab, and the arrow keys move and choose', async ({ page }) => {
  await page.goto('/')
  const group = controls(page).getByRole('radiogroup', { name: 'Reading pace' })
  const steady = group.getByRole('radio', { name: 'Steady' })
  await steady.focus()
  await page.keyboard.press('ArrowRight')
  const fast = group.getByRole('radio', { name: 'Fast' })
  await expect(fast).toBeFocused()
  await expect(fast).toBeChecked()
  await expect(steady).not.toBeChecked()

  // An answer's hint describes it rather than naming it.
  const worn = controls(page).getByRole('radio', { name: 'Worn' })
  await expect(worn).toHaveAccessibleName('Worn')
  await expect(worn).toHaveAccessibleDescription(
    'Read and loved: a creased spine, a dog-ear or two.',
  )
})

test('the slider moves by key, saying its value in words as it shows it', async ({ page }) => {
  await page.goto('/')
  const slider = controls(page).getByRole('slider', { name: 'Text size' })
  await expect(slider).toHaveAttribute('aria-valuetext', '120%')
  await slider.focus()
  await page.keyboard.press('ArrowRight')
  await expect(slider).toHaveAttribute('aria-valuetext', '130%')
  await expect(controls(page).locator('.kit-slider__value').first()).toHaveText('130%')
  await page.keyboard.press('Home')
  await expect(slider).toHaveAttribute('aria-valuetext', '80%')
})

test('a text box draws its ring round its places, and reads its unit with it', async ({ page }) => {
  await page.goto('/')
  const price = controls(page).getByRole('textbox', { name: 'Price' })
  await expect(price).toHaveAccessibleDescription('gil What a late return costs.')
  await price.focus()
  const edge = price.locator('xpath=..')
  expect(
    await edge.evaluate((element) => {
      const style = getComputedStyle(element)
      return `${style.outlineStyle} ${style.outlineWidth}`
    }),
  ).toBe('solid 3px')
})

test('a password shows while its toggle is on, the toggle named the same either way', async ({
  page,
}) => {
  await page.goto('/')
  const box = controls(page).getByLabel('Password', { exact: true })
  await box.fill('correct horse')
  const toggle = controls(page).getByRole('button', { name: 'Show password' })
  await expect(box).toHaveAttribute('type', 'password')
  await toggle.click()
  await expect(box).toHaveAttribute('type', 'text')
  await expect(toggle).toHaveAttribute('aria-pressed', 'true')
  await expect(toggle).toHaveAccessibleName('Show password')
  await toggle.click()
  await expect(box).toHaveAttribute('type', 'password')
})

test('a box that grows does so as it is typed in, up to its most, then scrolls', async ({
  page,
}) => {
  await page.goto('/')
  const box = controls(page).getByLabel('Letter to the reader')
  const height = (): Promise<number> =>
    box.evaluate((element) => element.getBoundingClientRect().height)
  const empty = await height()
  await box.fill('one\ntwo\nthree\nfour')
  expect(await height()).toBeGreaterThan(empty)
  await box.fill(Array.from({ length: 30 }, (_, at) => `line ${String(at)}`).join('\n'))
  const most = await height()
  await box.fill(Array.from({ length: 40 }, (_, at) => `line ${String(at)}`).join('\n'))
  expect(await height()).toBe(most)
  expect(await box.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(true)
})

test('files chosen in the picker are listed, and one of the wrong kind refused in words', async ({
  page,
}) => {
  await page.goto('/')
  const field = controls(page).getByRole('group', { name: 'Scans of the pages' })
  const picker = field.locator('input[type="file"]')
  await picker.setInputFiles([
    { name: 'page-1.png', mimeType: 'image/png', buffer: Buffer.from('png') },
    { name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('txt') },
  ])
  await expect(field.locator('.kit-file-field__name')).toHaveText(['page-1.png'])
  await expect(field.getByRole('alert')).toHaveText(
    'notes.txt isn’t a PNG, JPEG, WebP, or PDF file.',
  )
  const remove = field.getByRole('button', { name: 'Remove page-1.png' })
  await remove.click()
  await expect(field.locator('.kit-file-field__name')).toHaveCount(0)
  await expect(field.getByRole('button', { name: 'Choose files, or drop them here' })).toBeFocused()
})

test('a closed part stays in the page for find in page, and opens by key', async ({ page }) => {
  await page.goto('/')
  const button = page.getByRole('button', { name: 'Where the collection came from' })
  const part = page.locator(`[id="${String(await button.getAttribute('aria-controls'))}"]`)
  await expect(part).toHaveAttribute('hidden', 'until-found')
  await expect(part).toContainText('a house clearance')
  await button.focus()
  await page.keyboard.press('Enter')
  await expect(button).toHaveAttribute('aria-expanded', 'true')
  await expect(part).toBeVisible()
})

test('the copy button puts its text on the clipboard and says so', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  const button = controls(page).getByRole('button', { name: 'Copy the call number' })
  await button.click()
  await expect(controls(page).getByRole('button', { name: 'Copied' })).toBeVisible()
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('823.7 AUS')
})

test('the skip link shows when tabbed to, and moves focus to the main content', async ({
  page,
}) => {
  await page.goto('/')
  await page.keyboard.press('Tab')
  const skip = page.getByRole('link', { name: 'Skip to main content' })
  await expect(skip).toBeFocused()
  const box = await skip.boundingBox()
  expect(box?.height).toBeGreaterThanOrEqual(44)
  await page.keyboard.press('Enter')
  await expect(page.locator('#main-content')).toBeFocused()
  expect(new URL(page.url()).hash).toBe('')
})

test('a bar that can’t say how far stands still, striped, with less motion', async ({ page }) => {
  await page.goto('/')
  const bar = page.getByRole('progressbar', { name: 'Loading the catalogue' })
  await expect(bar).not.toHaveAttribute('aria-valuenow')
  const drawn = await bar.locator('.kit-progress__bar').evaluate((element) => {
    const style = getComputedStyle(element)
    return { animation: style.animationName, image: style.backgroundImage }
  })
  expect(drawn.animation).toBe('none')
  expect(drawn.image).toContain('repeating-linear-gradient')
})
