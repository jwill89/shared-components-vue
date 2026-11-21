import { expect, test, type Page } from '@playwright/test'
import { AxeBuilder } from '@axe-core/playwright'
import { WCAG_22_AA, axeViolations } from '@jwill89/test-a11y'

// What jsdom can't show: the second wave's components as a browser runs them, by keyboard, and
// axe on each while it is open, in both schemes, with the AAA rules on. An open menu hides the
// page behind it from screen readers, as an open list does, so axe runs on the menu alone.

const AAA = [...WCAG_22_AA, 'wcag2aaa']

test.use({ reducedMotion: 'reduce' })

/** Each open part, as a person opens it, and what to wait for before axe runs. */
const OPENS = [
  {
    what: 'a popover',
    open: async (page: Page) => {
      await page.getByRole('button', { name: 'Who can see this shelf?' }).click()
      await expect(page.getByRole('dialog', { name: 'Who can see this shelf?' })).toBeVisible()
    },
  },
  {
    what: 'a date picker’s calendar',
    open: async (page: Page) => {
      await page.getByRole('button', { name: 'Choose a date' }).first().click()
      await expect(page.locator('.kit-calendar')).toBeVisible()
    },
  },
  {
    what: 'a drawer',
    open: async (page: Page) => {
      await page.getByRole('button', { name: 'Show the history' }).click()
      await expect(page.getByRole('dialog', { name: 'History' })).toBeVisible()
    },
  },
] as const

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`in the ${colorScheme} scheme`, () => {
    test.use({ colorScheme })

    test('an open menu passes axe', async ({ page }) => {
      await page.goto('/')
      await page.getByRole('button', { name: 'Shelf actions' }).click()
      await expect(page.getByRole('menu', { name: 'Shelf actions' })).toBeVisible()
      const found = await new AxeBuilder({ page }).include('[role="menu"]').withTags(AAA).analyze()
      expect(found.violations.map((v) => v.id)).toEqual([])
    })

    for (const { what, open } of OPENS) {
      test(`${what}, open, passes axe`, async ({ page }) => {
        await page.goto('/')
        await open(page)
        expect(await axeViolations(page, { tags: AAA })).toEqual([])
      })
    }
  })
}

test('tabs move by the arrow keys and choose on Enter', async ({ page }) => {
  await page.goto('/')
  const books = page.getByRole('tab', { name: 'Books' })
  await books.focus()
  await page.keyboard.press('ArrowRight')
  const loans = page.getByRole('tab', { name: 'Loans' })
  await expect(loans).toBeFocused()
  await expect(books).toHaveAttribute('aria-selected', 'true')
  await page.keyboard.press('Enter')
  await expect(loans).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('tabpanel')).toHaveText('Two out on loan, one overdue.')
})

test('a menu runs its item by keyboard and gives focus back', async ({ page }) => {
  await page.goto('/')
  const button = page.getByRole('button', { name: 'Shelf actions' })
  await button.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('menuitem', { name: 'Rename' })).toBeFocused()
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  await expect(page.locator('.kit-toast', { hasText: 'Shelf copied' })).toBeVisible()
  await expect(button).toBeFocused()
})

test('pagination moves by its buttons and goes straight to a page typed', async ({ page }) => {
  await page.goto('/')
  const pages = page.getByRole('navigation', { name: 'Pages of the catalogue' })
  await expect(pages.getByRole('button', { name: 'Page 5' })).toHaveAttribute(
    'aria-current',
    'page',
  )
  await pages.getByRole('button', { name: 'Next' }).click()
  await expect(pages.getByRole('button', { name: 'Page 6' })).toHaveAttribute(
    'aria-current',
    'page',
  )
  const box = pages.getByLabel('Go to page')
  await box.fill('33')
  await box.press('Enter')
  await expect(pages.getByRole('button', { name: 'Page 33' })).toHaveAttribute(
    'aria-current',
    'page',
  )
})

test('a date is typed in its parts, and the due date can’t come before the lending date', async ({
  page,
}) => {
  await page.goto('/')
  const due = page.getByRole('group', { name: 'Due by' })
  await due.getByRole('spinbutton').first().click()
  await page.keyboard.type('11152026')
  await expect(due.getByRole('spinbutton')).toHaveText(['11', '15', '2026'])

  await due.getByRole('button', { name: 'Choose a date' }).click()
  const calendar = page.locator('.kit-calendar')
  await expect(calendar.getByRole('button', { name: /November 1, 2026/ })).toHaveAttribute(
    'data-disabled',
    '',
  )
})
