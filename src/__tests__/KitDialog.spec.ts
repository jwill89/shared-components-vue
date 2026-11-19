import { afterEach, describe, expect, it } from 'vitest'
import { createCommentVNode, defineComponent, h, nextTick, ref, type VNode } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import KitButton from '../components/KitButton.vue'
import KitDialog from '../components/KitDialog.vue'
import KitFormField from '../components/KitFormField.vue'
import type { KitFieldBinding } from '../components/KitFormField.vue'
import KitSegmentedControl from '../components/KitSegmentedControl.vue'
import KitSelect from '../components/KitSelect.vue'
import KitSwitch from '../components/KitSwitch.vue'
import KitTextarea from '../components/KitTextarea.vue'
import { axeFindings, kept, unmountKept } from './helpers'

afterEach(unmountKept)

/** The dialog on screen, as a screen reader finds it: by its role, wherever Reka teleported it. */
function dialog(role = 'dialog'): HTMLElement {
  const found = document.querySelector<HTMLElement>(`[role="${role}"]`)
  if (!found) {
    throw new Error(`No ${role} is open.`)
  }
  return found
}

/** The button a person would press, found by its name. */
function button(name: string): HTMLButtonElement {
  const found = [...document.querySelectorAll('button')].find(
    (candidate) => (candidate.getAttribute('aria-label') ?? candidate.textContent.trim()) === name,
  )
  if (!found) {
    throw new Error(`No "${name}" button.`)
  }
  return found
}

/** A page holding a dialog, its open state and every submit kept, with a button to open it. */
function page(
  props: Record<string, unknown>,
  // A slot that takes the form's id, as the body and `footer-start` do, or none.
  slots: Record<string, (scope: { formId: string }) => unknown> = {},
) {
  const open = ref(false)
  const submits = ref(0)
  const wrapper = kept(
    mount(
      defineComponent({
        setup: () => () =>
          h(
            KitDialog,
            {
              title: 'Add a book',
              ...props,
              open: open.value,
              'onUpdate:open': (next: boolean) => {
                open.value = next
              },
              onSubmit: () => {
                submits.value++
              },
            },
            { trigger: () => h(KitButton, null, () => 'Open'), ...slots },
          ),
      }),
      { attachTo: document.body },
    ),
  )
  return { wrapper, open, submits }
}

async function settle(): Promise<void> {
  await flushPromises()
  await nextTick()
}

describe('KitDialog', () => {
  it('opens from its trigger as a modal dialog named by its title, with nothing axe finds', async () => {
    const { open } = page(
      { description: 'Only the title is needed now.' },
      { default: () => h('p', 'The fields go here.') },
    )
    button('Open').click()
    await settle()
    expect(open.value).toBe(true)

    const panel = dialog()
    expect(panel.getAttribute('aria-modal')).toBe('true')
    const title = document.getElementById(panel.getAttribute('aria-labelledby') ?? '')
    expect(title?.textContent).toBe('Add a book')
    const description = document.getElementById(panel.getAttribute('aria-describedby') ?? '')
    expect(description?.textContent.trim()).toBe('Only the title is needed now.')
    expect(panel.textContent).toContain('The fields go here.')
    expect(await axeFindings(document.body)).toEqual([])
  })

  it('names no description when it has none', async () => {
    page({})
    button('Open').click()
    await settle()
    expect(dialog().hasAttribute('aria-describedby')).toBe(false)
  })

  it('closes on its Close button and gives focus back to what opened it', async () => {
    const { open } = page({})
    const opener = button('Open')
    opener.focus()
    opener.click()
    await settle()
    const close = button('Close')
    expect(close.getAttribute('title')).toBe('Close')
    close.click()
    await settle()
    expect(open.value).toBe(false)
    expect(document.querySelector('[role="dialog"]')).toBeNull()
    expect(document.activeElement).toBe(opener)
  })

  it('closes on Escape', async () => {
    const { open } = page({})
    button('Open').click()
    await settle()
    dialog().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await settle()
    expect(open.value).toBe(false)
  })

  it('closes on a press outside it, unless it is a form', async () => {
    const plain = page({})
    button('Open').click()
    await settle()
    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    await settle()
    expect(plain.open.value).toBe(false)
    unmountKept()

    const form = page({ submitLabel: 'Add' })
    button('Open').click()
    await settle()
    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    await settle()
    expect(form.open.value).toBe(true)
  })

  it('takes its buttons and its Close icon from slots', async () => {
    page(
      {},
      {
        footer: () => h(KitButton, { variant: 'primary' }, () => 'Done'),
        'close-icon': () => h('svg', { 'data-icon': 'xmark' }),
      },
    )
    button('Open').click()
    await settle()
    expect(dialog().querySelector('.kit-dialog__footer')?.textContent.trim()).toBe('Done')
    expect(button('Close').querySelector('[data-icon="xmark"]')).not.toBeNull()
  })

  it('is as wide as a record page when asked', async () => {
    page({ wide: true })
    button('Open').click()
    await settle()
    expect(dialog().classList).toContain('kit-dialog--wide')
  })

  describe('as a form', () => {
    it('submits by its button, stays open, and has Cancel beside it', async () => {
      const { open, submits } = page(
        { submitLabel: 'Add the book' },
        { default: () => h('label', ['Title ', h('input', { name: 'title' })]) },
      )
      button('Open').click()
      await settle()
      const form = dialog().querySelector('form')
      expect(form).not.toBeNull()
      const submit = button('Add the book')
      expect(submit.type).toBe('submit')
      expect(submit.getAttribute('form')).toBe(form?.id)
      expect(submit.classList).toContain('kit-button--primary')

      form?.requestSubmit(submit)
      await settle()
      expect(submits.value).toBe(1)
      expect(open.value).toBe(true)
      expect(await axeFindings(document.body)).toEqual([])

      button('Cancel').click()
      await settle()
      expect(open.value).toBe(false)
      expect(submits.value).toBe(1)
    })

    it('takes other buttons at the footer’s start, an icon on its submit, and gives out its id', async () => {
      const { submits } = page(
        { submitLabel: 'Save the shelf' },
        {
          default: ({ formId }: { formId: string }) => h('p', { 'data-form': formId }, 'Fields'),
          'footer-start': ({ formId }: { formId: string }) =>
            h('button', { type: 'submit', form: formId, 'data-form': formId }, 'Save as new'),
          'submit-icon': () => h('svg', { 'data-icon': 'floppy-disk' }),
        },
      )
      button('Open').click()
      await settle()
      const form = dialog().querySelector('form')
      expect(dialog().querySelector('[data-form] p, p[data-form]')?.getAttribute('data-form')).toBe(
        form?.id,
      )
      const footer = dialog().querySelector('.kit-dialog__footer')
      expect(footer?.firstElementChild?.classList).toContain('kit-dialog__footer-start')
      expect(button('Save the shelf').querySelector('[data-icon="floppy-disk"]')).not.toBeNull()

      // A button of the page's own that names the form sends it, as the submit button does.
      form?.requestSubmit(button('Save as new'))
      await settle()
      expect(submits.value).toBe(1)
    })

    it('puts what the page gives in its submit button’s place, and its own back when that goes', async () => {
      // A save that met a conflict can only be refused again, so the page offers Reload instead.
      const conflict = ref(false)
      const reloads = ref(0)
      page(
        { submitLabel: 'Save the shelf' },
        {
          submit: () =>
            conflict.value
              ? h(KitButton, { variant: 'primary', onClick: () => reloads.value++ }, () => 'Reload')
              : createCommentVNode('v-if', true),
        },
      )
      button('Open').click()
      await settle()
      expect(button('Save the shelf').type).toBe('submit')

      conflict.value = true
      await settle()
      const footer = dialog().querySelector('.kit-dialog__footer')
      expect(
        [...(footer?.querySelectorAll('button') ?? [])].map((b) => b.textContent.trim()),
      ).toEqual(['Cancel', 'Reload'])
      button('Reload').click()
      expect(reloads.value).toBe(1)
      expect(await axeFindings(document.body)).toEqual([])
    })

    it('draws no box at the footer’s start when what the page put there is switched off', async () => {
      page(
        { submitLabel: 'Save the shelf' },
        { 'footer-start': () => [createCommentVNode('v-if', true)] },
      )
      button('Open').click()
      await settle()
      expect(dialog().querySelector('.kit-dialog__footer-start')).toBeNull()
      expect(dialog().querySelector('.kit-dialog__footer')).not.toBeNull()
    })

    describe('opens on its first field', () => {
      /** A form whose first field is `first`, with a text box after it. */
      function form(first: (field: KitFieldBinding) => VNode | VNode[], group = false): void {
        page(
          { submitLabel: 'Save' },
          {
            default: () => [
              h(KitFormField, { label: 'Thread titles', group }, { default: first }),
              h(
                KitFormField,
                { label: 'Opening message' },
                {
                  default: (field: KitFieldBinding) => h(KitTextarea, { ...field, modelValue: '' }),
                },
              ),
            ],
          },
        )
      }
      const options = [
        { value: 'name', label: 'The member’s name' },
        { value: 'count', label: 'A running count' },
      ]

      it('when it is a text box', async () => {
        page(
          { submitLabel: 'Add the book' },
          { default: () => h('label', ['Title ', h('input', { name: 'title' })]) },
        )
        button('Open').click()
        await settle()
        expect(document.activeElement).toBe(dialog().querySelector('input'))
      })

      it('when it is a select, drawn on a button', async () => {
        form((field) => h(KitSelect, { ...field, options, modelValue: 'name' }))
        button('Open').click()
        await settle()
        expect(document.activeElement?.getAttribute('role')).toBe('combobox')
        expect(document.activeElement?.textContent).toContain('The member’s name')
      })

      it('when it is a switch', async () => {
        form((field) => h(KitSwitch, { ...field, modelValue: true }))
        button('Open').click()
        await settle()
        expect(document.activeElement?.getAttribute('role')).toBe('switch')
      })

      it('when it is a segmented control, on its chosen option', async () => {
        form((field) => h(KitSegmentedControl, { ...field, options, modelValue: 'count' }), true)
        button('Open').click()
        await settle()
        expect(document.activeElement?.getAttribute('aria-pressed')).toBe('true')
        expect(document.activeElement?.textContent).toContain('A running count')
      })

      it('passing over a field that is disabled, and a button that is only an action', async () => {
        form((field) => [
          h(KitButton, null, () => 'Fill in for me'),
          h(KitSelect, { ...field, options, modelValue: 'name', disabled: true }),
        ])
        button('Open').click()
        await settle()
        expect(document.activeElement).toBe(dialog().querySelector('textarea'))
      })
    })

    it('waits while its save runs, and says when it can’t be undone', async () => {
      page({ submitLabel: 'Delete the shelf', busy: true, danger: true, cancelLabel: 'Keep it' })
      button('Open').click()
      await settle()
      const submit = button('Delete the shelf')
      expect(submit.classList).toContain('kit-button--danger')
      expect(submit.getAttribute('aria-busy')).toBe('true')
      expect(button('Keep it').disabled).toBe(true)
    })
  })

  describe('in its alert form', () => {
    it('is announced as an alert, with no Close button', async () => {
      page(
        { alert: true, description: 'Its books go back to unshelved.' },
        {
          footer: () => h(KitButton, null, () => 'Cancel'),
        },
      )
      button('Open').click()
      await settle()
      const panel = dialog('alertdialog')
      expect(panel.getAttribute('aria-modal')).toBe('true')
      expect(panel.querySelector('[aria-label="Close"]')).toBeNull()
      expect(await axeFindings(document.body)).toEqual([])
    })
  })
})
