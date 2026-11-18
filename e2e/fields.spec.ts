import { expect, test } from '@playwright/test'
import type { Locator } from '@playwright/test'

// What jsdom can't show: the fields' focus rings and their step buttons as a browser draws and
// works them. Each control is found by its label, as a person using a screen reader finds it.

const RING = { style: 'solid', width: '3px' }

/** The outline an element draws, as the browser computes it. */
async function outline(locator: Locator): Promise<{ style: string; width: string }> {
  return locator.evaluate((element) => {
    const style = getComputedStyle(element)
    return { style: style.outlineStyle, width: style.outlineWidth }
  })
}

test('each control fits inside its field, with no reset stylesheet to lean on', async ({
  page,
}) => {
  // The playground sets no box-sizing of its own, as some apps don't, so a control that counts
  // on one spills out of its field here.
  await page.goto('/')
  const spilling = await page.evaluate(() =>
    [...document.querySelectorAll('.kit-form-field')].flatMap((field) => {
      const edge = field.getBoundingClientRect().right
      return [...field.querySelectorAll('input, textarea, .kit-number-field')]
        .filter((control) => control.getBoundingClientRect().right > edge + 0.5)
        .map((control) => control.id || control.className)
    }),
  )
  expect(spilling).toEqual([])
})

test('a text box and a box of several lines show the focus ring', async ({ page }) => {
  await page.goto('/')
  for (const label of ['Title', 'Notes']) {
    const box = page.getByLabel(label, { exact: true })
    await box.focus()
    expect(await outline(box)).toEqual(RING)
  }
})

test('a number box draws its ring round the whole box, and its buttons step it', async ({
  page,
}) => {
  await page.goto('/')
  const copies = page.getByLabel('Copies', { exact: false })
  await expect(copies).toHaveValue('2')
  await copies.focus()
  const box = page.locator('.kit-number-field').filter({ has: copies })
  expect(await outline(box)).toEqual(RING)

  await box.getByRole('button', { name: 'Increase' }).click()
  await expect(copies).toHaveValue('3')
  await copies.press('ArrowDown')
  await copies.press('ArrowDown')
  await expect(copies).toHaveValue('1')
  // The least it takes is one.
  await expect(box.getByRole('button', { name: 'Decrease' })).toBeDisabled()
})

test('a box of several lines counts against its limit, and says when it is over', async ({
  page,
}) => {
  await page.goto('/')
  const blurb = page.getByLabel('Blurb', { exact: true })
  await blurb.fill('a'.repeat(125))
  await expect(page.getByText('125 / 120 (5 over)')).toBeVisible()
  await expect(blurb).toHaveAttribute('aria-invalid', 'true')
})
