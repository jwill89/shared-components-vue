import { expect, test } from '@playwright/test'
import { AxeBuilder } from '@axe-core/playwright'
import { WCAG_22_AA } from '@jwill89/test-a11y'
import { contrastRatio, parseComputedColor } from '../src/tokens/contrast'

// What jsdom can't show: the choice controls as a person uses them, by keyboard, with their
// lists drawn over the page where axe can reach them.

const AAA = [...WCAG_22_AA, 'wcag2aaa']

test.use({ reducedMotion: 'reduce' })

for (const colorScheme of ['light', 'dark'] as const) {
  test(`an open list passes axe, its highlighted option at 7:1, in the ${colorScheme} scheme`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme })
    await page.goto('/')
    const shelf = page.getByRole('combobox', { name: 'Shelf', exact: true })
    const listbox = page.getByRole('listbox')
    await shelf.focus()
    await page.keyboard.press('Enter')
    // The list takes focus a moment after it opens, on its first option.
    await expect(listbox.getByRole('option', { name: 'Hall' })).toBeFocused()
    await page.keyboard.press('ArrowDown')
    const study = listbox.getByRole('option', { name: 'Study' })
    await expect(study).toHaveAttribute('data-highlighted', '')

    const { ink, wash } = await study.evaluate((element) => ({
      ink: getComputedStyle(element).color,
      wash: getComputedStyle(element).backgroundColor,
    }))
    const front = parseComputedColor(ink)
    const back = parseComputedColor(wash)
    expect(back?.alpha, `the highlight is drawn: ${wash}`).toBe(1)
    if (front && back) {
      expect(contrastRatio(front.rgb, back.rgb)).toBeGreaterThanOrEqual(7)
    }

    // While a list is open, Reka hides the page behind it from screen readers and holds focus in
    // the list, as a native select's popup does, so axe would find the hidden page's buttons
    // "focusable but hidden" and no h1. The list is all a person can reach, so it is what axe
    // checks here; the page itself is checked with every list closed (playground.spec.ts).
    const results = await new AxeBuilder({ page })
      .include('[role="listbox"]')
      .withTags(AAA)
      .analyze()
    expect(results.violations.map((violation) => violation.id)).toEqual([])
  })
}

test('a select is chosen from by keyboard alone, and keeps its value on Escape', async ({
  page,
}) => {
  await page.goto('/')
  const shelf = page.getByRole('combobox', { name: 'Shelf', exact: true })
  const listbox = page.getByRole('listbox')
  await shelf.focus()
  await page.keyboard.press('Enter')
  await expect(listbox.getByRole('option', { name: 'Hall' })).toBeFocused()
  await page.keyboard.press('ArrowDown')
  await expect(listbox.getByRole('option', { name: 'Study' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(shelf).toHaveText('Study')
  await expect(shelf).toBeFocused()

  await page.keyboard.press('Enter')
  await expect(listbox.getByRole('option', { name: 'Study' })).toBeFocused()
  await page.keyboard.press('ArrowUp')
  await page.keyboard.press('Escape')
  await expect(listbox).toBeHidden()
  await expect(shelf).toHaveText('Study')
})

test('a combobox narrows as the person types, and keeps several choices as chips', async ({
  page,
}) => {
  await page.goto('/')
  const genre = page.getByRole('combobox', { name: 'Genre' })
  // The list's options only: the page's own scheme picker is a native select with options too.
  const options = page.getByRole('listbox').getByRole('option')
  await genre.fill('hist')
  await expect(options).toHaveText(['History'])
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  await expect(genre).toHaveValue('History')
  await page.getByRole('button', { name: 'Clear' }).click()
  await expect(genre).toHaveValue('')

  const tags = page.getByRole('combobox', { name: 'Tags' })
  const chips = page.locator('.kit-combobox__chip')
  await expect(chips).toHaveText(['Fantasy', 'Travel'])
  await page.getByRole('button', { name: 'Remove Fantasy' }).click()
  await expect(chips).toHaveText(['Travel'])
  await tags.fill('mys')
  await expect(options).toHaveText(['Mystery'])
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  await expect(chips).toHaveText(['Travel', 'Mystery'])
})

test('a switch flips by Space and by its label, and says its state', async ({ page }) => {
  await page.goto('/')
  const covers = page.getByRole('switch', { name: 'Show covers' })
  await expect(covers).toBeChecked()
  await covers.focus()
  await page.keyboard.press('Space')
  await expect(covers).not.toBeChecked()
  await page.getByText('Show covers', { exact: true }).click()
  await expect(covers).toBeChecked()
  await expect(page.getByRole('switch', { name: 'Lend to friends' })).toBeDisabled()
})

test('a segmented control moves by arrow keys and is named by its caption', async ({ page }) => {
  await page.goto('/')
  const view = page.getByRole('group', { name: 'View' })
  const grid = view.getByRole('button', { name: 'Grid' })
  await expect(grid).toHaveAttribute('aria-pressed', 'true')
  await grid.focus()
  await page.keyboard.press('ArrowRight')
  const list = view.getByRole('button', { name: 'List' })
  await expect(list).toBeFocused()
  await page.keyboard.press('Space')
  await expect(list).toHaveAttribute('aria-pressed', 'true')
  await expect(grid).toHaveAttribute('aria-pressed', 'false')
})
