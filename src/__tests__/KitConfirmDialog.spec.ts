import { afterEach, describe, expect, it } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import KitConfirmDialog from '../components/KitConfirmDialog.vue'
import KitConfirmHost from '../components/KitConfirmHost.vue'
import { confirm, registerConfirmHost, useConfirmQueue } from '../composables/useConfirmQueue'
import { axeFindings, kept, unmountKept } from './helpers'

afterEach(unmountKept)

function alertDialog(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[role="alertdialog"]')
}

function button(name: string): HTMLButtonElement {
  const found = [...document.querySelectorAll('button')].find(
    (candidate) => candidate.textContent.trim() === name,
  )
  if (!found) {
    throw new Error(`No "${name}" button.`)
  }
  return found
}

async function settle(): Promise<void> {
  await flushPromises()
  await nextTick()
}

/** A page asking one question with the dialog itself, its answers kept. */
function asking(props: Record<string, unknown> = {}) {
  const open = ref(true)
  const answers: string[] = []
  kept(
    mount(
      defineComponent({
        setup: () => () =>
          h(KitConfirmDialog, {
            title: 'Delete this shelf?',
            message: 'Its 12 books go back to unshelved.',
            confirmLabel: 'Delete',
            danger: true,
            ...props,
            open: open.value,
            'onUpdate:open': (next: boolean) => {
              open.value = next
            },
            onConfirm: () => answers.push('confirm'),
            onCancel: () => answers.push('cancel'),
          }),
      }),
      { attachTo: document.body },
    ),
  )
  return { open, answers }
}

describe('KitConfirmDialog', () => {
  it('asks its question as an alert, focus on Cancel, with nothing axe finds', async () => {
    asking()
    await settle()
    const panel = alertDialog()
    expect(panel).not.toBeNull()
    expect(document.getElementById(panel?.getAttribute('aria-labelledby') ?? '')?.textContent).toBe(
      'Delete this shelf?',
    )
    expect(
      document.getElementById(panel?.getAttribute('aria-describedby') ?? '')?.textContent.trim(),
    ).toBe('Its 12 books go back to unshelved.')
    expect(document.activeElement).toBe(button('Cancel'))
    expect(button('Delete').classList).toContain('kit-button--danger')
    expect(await axeFindings(document.body)).toEqual([])
  })

  it('emits confirm and stays open, so the page can show the action running', async () => {
    const { open, answers } = asking()
    await settle()
    button('Delete').click()
    await settle()
    expect(answers).toEqual(['confirm'])
    expect(open.value).toBe(true)
  })

  it('backs out on Cancel or Escape, and closes', async () => {
    const first = asking()
    await settle()
    button('Cancel').click()
    await settle()
    expect(first.answers).toEqual(['cancel'])
    expect(first.open.value).toBe(false)
    unmountKept()

    const second = asking({ danger: false, cancelLabel: 'Keep it' })
    await settle()
    expect(button('Delete').classList).toContain('kit-button--primary')
    alertDialog()?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await settle()
    expect(second.answers).toEqual(['cancel'])
    expect(second.open.value).toBe(false)
  })

  it('stays open while the action runs, whatever is pressed', async () => {
    const { open, answers } = asking({ busy: true })
    await settle()
    expect(button('Cancel').disabled).toBe(true)
    expect(button('Delete').getAttribute('aria-busy')).toBe('true')
    alertDialog()?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await settle()
    expect(open.value).toBe(true)
    expect(answers).toEqual([])
  })
})

describe('confirm()', () => {
  it('refuses to ask while no KitConfirmHost is mounted', () => {
    expect(() =>
      confirm({ title: 'Delete?', message: 'Gone for good.', confirmLabel: 'Delete' }),
    ).toThrow('confirm() needs a KitConfirmHost')
  })

  it('asks through the host, one question at a time, and resolves each to its answer', async () => {
    kept(mount(KitConfirmHost, { attachTo: document.body }))
    await settle()
    expect(alertDialog()).toBeNull()

    const first = confirm({
      title: 'Delete this shelf?',
      message: 'Its 12 books go back to unshelved.',
      confirmLabel: 'Delete',
      danger: true,
    })
    const second = confirm({
      title: 'Empty the bin?',
      message: 'The 3 books in it are gone for good.',
      confirmLabel: 'Empty it',
      cancelLabel: 'Not now',
    })
    await settle()
    expect(alertDialog()?.textContent).toContain('Delete this shelf?')

    button('Delete').click()
    expect(await first).toBe(true)
    await settle()
    expect(alertDialog()?.textContent).toContain('Empty the bin?')

    button('Not now').click()
    expect(await second).toBe(false)
    await settle()
    expect(alertDialog()).toBeNull()
  })

  it('answers no to what is still waiting when its last host goes', async () => {
    const host = kept(mount(KitConfirmHost, { attachTo: document.body }))
    const waiting = confirm({ title: 'Delete?', message: 'Gone.', confirmLabel: 'Delete' })
    host.unmount()
    expect(await waiting).toBe(false)
    expect(useConfirmQueue().current.value).toBeUndefined()
  })

  it('keeps what is waiting while another host is still mounted', async () => {
    const leaveFirst = registerConfirmHost()
    const leaveSecond = registerConfirmHost()
    let answer: boolean | undefined
    void confirm({ title: 'Delete?', message: 'Gone.', confirmLabel: 'Delete' }).then((yes) => {
      answer = yes
    })
    leaveFirst()
    await flushPromises()
    expect(answer).toBeUndefined()
    expect(useConfirmQueue().current.value?.title).toBe('Delete?')
    leaveSecond()
    await flushPromises()
    expect(answer).toBe(false)
  })

  it('leaves the queue alone when a question is answered with none waiting', () => {
    const { current, answer } = useConfirmQueue()
    answer(true)
    expect(current.value).toBeUndefined()
  })
})
