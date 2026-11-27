import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import {
  WebAuthnAbortService,
  WebAuthnError,
  browserSupportsWebAuthn,
  startAuthentication,
  startRegistration,
} from '@simplewebauthn/browser'
import type {
  AuthenticationResponseJSON,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
} from '@simplewebauthn/browser'
import KitConfirmHost from '../components/KitConfirmHost.vue'
import KitPasskeyList from '../components/KitPasskeyList.vue'
import { passkeyFailure, usePasskeys } from '../composables/usePasskeys'
import type { KitPasskey } from '../composables/usePasskeys'
import { formatDay } from '../format'
import { axeFindings, kept, unmountKept } from './helpers'

vi.mock(import('@simplewebauthn/browser'), async (original) => ({
  ...(await original()),
  browserSupportsWebAuthn: vi.fn(() => true),
  browserSupportsWebAuthnAutofill: vi.fn(() => Promise.resolve(true)),
  startAuthentication: vi.fn(),
  startRegistration: vi.fn(),
  WebAuthnAbortService: { cancelCeremony: vi.fn(), createNewAbortSignal: vi.fn() },
}))

afterEach(unmountKept)
beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(browserSupportsWebAuthn).mockReturnValue(true)
})

const requestOptions = { challenge: 'abc' } as PublicKeyCredentialRequestOptionsJSON
const creationOptions = { challenge: 'def' } as PublicKeyCredentialCreationOptionsJSON
const signedIn = { id: 'key-1' } as AuthenticationResponseJSON
const made = { id: 'key-2' } as RegistrationResponseJSON

/** The browser's own way of saying the person closed its prompt, as the library passes it on. */
function closedPrompt(): WebAuthnError {
  return new WebAuthnError({
    message: 'The prompt was closed.',
    code: 'ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY',
    cause: new DOMException('Closed', 'NotAllowedError'),
  })
}

describe('usePasskeys', () => {
  it('signs in through the app’s two calls, asking the browser between them', async () => {
    vi.mocked(startAuthentication).mockResolvedValue(signedIn)
    const verify = vi.fn(() => Promise.resolve({ user: 'sam' }))
    const session = await usePasskeys().signIn({
      options: () => Promise.resolve(requestOptions),
      verify,
      autofill: true,
    })
    expect(startAuthentication).toHaveBeenCalledWith({
      optionsJSON: requestOptions,
      useBrowserAutofill: true,
    })
    expect(verify).toHaveBeenCalledWith(signedIn)
    expect(session).toEqual({ user: 'sam' })
  })

  it('resolves to nothing when the prompt is closed, timed out or replaced, and sends nothing', async () => {
    const verify = vi.fn()
    const passkeys = usePasskeys()
    for (const closing of [
      closedPrompt(),
      new DOMException('Replaced', 'AbortError'),
      new WebAuthnError({
        message: 'Cancelled',
        code: 'ERROR_CEREMONY_ABORTED',
        cause: new Error('Cancelled'),
      }),
    ]) {
      vi.mocked(startAuthentication).mockRejectedValueOnce(closing)
      expect(
        await passkeys.signIn({ options: () => Promise.resolve(requestOptions), verify }),
      ).toBeUndefined()
    }
    vi.mocked(startRegistration).mockRejectedValueOnce(closedPrompt())
    expect(
      await passkeys.add({ options: () => Promise.resolve(creationOptions), verify }),
    ).toBeUndefined()
    expect(verify).not.toHaveBeenCalled()
  })

  it('adds a passkey through the app’s two calls', async () => {
    vi.mocked(startRegistration).mockResolvedValue(made)
    const added = await usePasskeys().add({
      options: () => Promise.resolve(creationOptions),
      verify: (answer) => Promise.resolve({ id: 7, name: 'Laptop', from: answer.id }),
    })
    expect(startRegistration).toHaveBeenCalledWith({ optionsJSON: creationOptions })
    expect(added).toEqual({ id: 7, name: 'Laptop', from: 'key-2' })
  })

  it('throws any other failure, the browser’s side told apart from the app’s', async () => {
    const already = new WebAuthnError({
      message: 'Already registered',
      code: 'ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED',
      cause: new Error('InvalidStateError'),
    })
    vi.mocked(startRegistration).mockRejectedValueOnce(already)
    await expect(
      usePasskeys().add({ options: () => Promise.resolve(creationOptions), verify: vi.fn() }),
    ).rejects.toBe(already)
    expect(passkeyFailure(already)).toBe('already-added')
    expect(
      passkeyFailure(
        new WebAuthnError({
          message: 'No',
          code: 'ERROR_INVALID_DOMAIN',
          cause: new Error('SecurityError'),
        }),
      ),
    ).toBe('device')
    expect(passkeyFailure(new Error('The server refused it.'))).toBeUndefined()
    // A DOMException the browser raised for another reason is a failure, not a closed prompt.
    vi.mocked(startAuthentication).mockRejectedValueOnce(new DOMException('Bad', 'SecurityError'))
    await expect(
      usePasskeys().signIn({ options: () => Promise.resolve(requestOptions), verify: vi.fn() }),
    ).rejects.toThrow('Bad')
  })

  it('lets go of a request still waiting when the page that asked closes', () => {
    const page = mount(
      defineComponent({
        setup() {
          const passkeys = usePasskeys()
          return () => h('p', passkeys.supported ? 'Passkeys work here' : 'No passkeys')
        },
      }),
    )
    expect(page.text()).toBe('Passkeys work here')
    page.unmount()
    expect(WebAuthnAbortService.cancelCeremony).toHaveBeenCalledOnce()
  })
})

const keys: KitPasskey[] = [
  {
    id: 1,
    name: 'Work laptop',
    createdAt: '2026-06-13T12:00:00Z',
    lastUsedAt: '2026-11-20T12:00:00Z',
  },
  { id: 2, name: 'Phone', createdAt: '2026-07-01T12:00:00Z', lastUsedAt: null },
]

function list(props: Record<string, unknown> = {}) {
  return kept(
    mount(KitPasskeyList, {
      props: { passkeys: keys, ...props },
      slots: { icon: () => h('svg', { 'data-icon': 'key' }) },
      attachTo: document.body,
    }),
  )
}

function named(name: string): HTMLButtonElement {
  const found = [...document.querySelectorAll<HTMLButtonElement>('button')].find(
    (candidate) =>
      candidate.getAttribute('aria-label') === name || candidate.textContent.trim() === name,
  )
  if (!found) {
    throw new Error(`No button is named “${name}”.`)
  }
  return found
}

async function settle(): Promise<void> {
  await flushPromises()
  await nextTick()
}

describe('KitPasskeyList', () => {
  it('lists each passkey with when it was added and used, with nothing axe finds', async () => {
    const wrapper = list()
    expect(wrapper.get('ul').attributes('aria-label')).toBe('Passkeys')
    const rows = wrapper.findAll('li')
    expect(rows[0]?.get('.kit-passkey-list__name').text()).toBe('Work laptop')
    expect(rows[0]?.get('.kit-passkey-list__used').text()).toBe(
      'Added Jun 13, 2026 · last used Nov 20, 2026',
    )
    expect(rows[1]?.get('.kit-passkey-list__used').text()).toBe(
      'Added Jul 1, 2026 · last used never',
    )
    expect(wrapper.findAll('[data-icon="key"]')).toHaveLength(2)
    expect(named('Rename Work laptop').textContent.trim()).toBe('Rename')
    expect(named('Remove Phone').textContent.trim()).toBe('Remove')
    expect(await axeFindings(wrapper)).toEqual([])

    named('Add a passkey').click()
    expect(wrapper.emitted('add')).toHaveLength(1)
    await wrapper.setProps({ adding: true })
    expect(named('Add a passkey').getAttribute('aria-busy')).toBe('true')
  })

  it('renames a passkey in a dialog, asking again for an empty name', async () => {
    const wrapper = list()
    named('Rename Work laptop').click()
    await settle()
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]')
    expect(dialog?.textContent).toContain('Rename this passkey')
    const box = dialog?.querySelector('input')
    expect(box?.value).toBe('Work laptop')
    expect(box?.maxLength).toBe(64)

    box?.dispatchEvent(new Event('input'))
    if (box) {
      box.value = '   '
      box.dispatchEvent(new Event('input'))
    }
    named('Save').click()
    await settle()
    expect(dialog?.textContent).toContain('Give it a name.')
    expect(wrapper.emitted('rename')).toBeUndefined()

    if (box) {
      box.value = ' Desk laptop '
      box.dispatchEvent(new Event('input'))
    }
    named('Save').click()
    await settle()
    expect(wrapper.emitted('rename')).toEqual([[keys[0], 'Desk laptop']])
    expect(document.querySelector('[role="dialog"]')).toBeNull()

    // Cancel closes the dialog and changes nothing.
    named('Rename Phone').click()
    await settle()
    named('Cancel').click()
    await settle()
    expect(document.querySelector('[role="dialog"]')).toBeNull()

    // The same name again changes nothing, and tells the page nothing.
    named('Rename Phone').click()
    await settle()
    named('Save').click()
    await settle()
    expect(wrapper.emitted('rename')).toHaveLength(1)
  })

  it('asks before a remove, and tells the page only once the person says so', async () => {
    kept(mount(KitConfirmHost, { attachTo: document.body }))
    const wrapper = list()
    named('Remove Phone').click()
    await settle()
    const question = document.querySelector('[role="alertdialog"]')
    expect(question?.textContent).toContain('Remove “Phone”?')
    named('Cancel').click()
    await settle()
    expect(wrapper.emitted('remove')).toBeUndefined()

    named('Remove Phone').click()
    await settle()
    const confirmButton = [
      ...(document.querySelector('[role="alertdialog"]')?.querySelectorAll('button') ?? []),
    ].find((candidate) => candidate.textContent.trim() === 'Remove')
    confirmButton?.click()
    await settle()
    expect(wrapper.emitted('remove')).toEqual([[keys[1]]])
  })

  it('shows a day it can’t read as it came', () => {
    expect(formatDay('soon')).toBe('soon')
  })

  it('says when it is loading, failed or empty, and offers no Add where passkeys can’t work', async () => {
    const wrapper = list({ loading: true })
    expect(wrapper.text()).toContain('Loading your passkeys…')
    await wrapper.setProps({ loading: false, error: 'The server is down.' })
    expect(wrapper.text()).toContain('Couldn’t load your passkeys')
    expect(wrapper.text()).toContain('The server is down.')
    named('Try again').click()
    expect(wrapper.emitted('retry')).toHaveLength(1)
    await wrapper.setProps({ error: undefined, passkeys: [] })
    expect(wrapper.text()).toContain('No passkeys yet')
    expect(named('Add a passkey')).toBeTruthy()

    vi.mocked(browserSupportsWebAuthn).mockReturnValue(false)
    const unsupported = list()
    expect(unsupported.text()).toContain('This browser can’t use passkeys.')
    expect(unsupported.find('button').exists()).toBe(false)
    expect(await axeFindings(unsupported)).toEqual([])
    await unsupported.setProps({ supported: true })
    expect(unsupported.find('ul').exists()).toBe(true)
  })
})
