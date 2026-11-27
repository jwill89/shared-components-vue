import { getCurrentScope, onScopeDispose } from 'vue'
import {
  WebAuthnAbortService,
  WebAuthnError,
  browserSupportsWebAuthn,
  browserSupportsWebAuthnAutofill,
  startAuthentication,
  startRegistration,
} from '@simplewebauthn/browser'
import type {
  AuthenticationResponseJSON,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
} from '@simplewebauthn/browser'

// Passkeys in the browser, on @simplewebauthn/browser. Each use takes two calls to the app's own
// server: one fetches WebAuthn's options with the server's challenge, the browser asks the
// person's phone, computer or password manager to answer it, and the other sends the answer for
// the server to check. The kit makes neither call and checks nothing: the server keeps the
// challenge and decides.

/** One passkey on an account, as the app's server lists it. */
export interface KitPasskey {
  id: string | number
  /** What the person calls it: "Work laptop". */
  name: string
  /** When it was added, as RFC 3339. */
  createdAt?: string
  /** When it last signed in, as RFC 3339, or null for never. */
  lastUsedAt?: string | null
}

/** The two calls a sign-in makes to the app's server, and how it asks. */
export interface KitPasskeySignIn<R> {
  /** Fetches the server's options for a sign-in, with its challenge. */
  options: () => Promise<PublicKeyCredentialRequestOptionsJSON>
  /** Sends the browser's answer for the server to check, resolving to what it answers. */
  verify: (answer: AuthenticationResponseJSON) => Promise<R>
  /**
   * Whether to wait for the person to pick a passkey from the username box's autofill, which
   * takes `autocomplete="username webauthn"`, rather than open the browser's prompt at once.
   */
  autofill?: boolean
}

/** The two calls adding a passkey makes to the app's server. */
export interface KitPasskeyAdd<R> {
  /** Fetches the server's options for a new passkey, with its challenge. */
  options: () => Promise<PublicKeyCredentialCreationOptionsJSON>
  /** Sends the new passkey for the server to check and keep, resolving to what it answers. */
  verify: (answer: RegistrationResponseJSON) => Promise<R>
}

/**
 * Why the browser's side of a passkey failed: the passkey is on the account already, or the
 * device or browser couldn't make or use one. A failure of the app's own, such as its server
 * refusing the answer, is none of these, and the app words it.
 */
export type KitPasskeyFailure = 'already-added' | 'device'

/**
 * Whether a request ended without an answer: the person closed the prompt, it timed out, or a
 * newer request took its place. The browser says so with a NotAllowedError or AbortError, which
 * the library passes on as its own error's cause.
 */
function closed(error: unknown): boolean {
  if (error instanceof WebAuthnError) {
    return (
      error.code === 'ERROR_CEREMONY_ABORTED' ||
      (error.code === 'ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY' && refused(error.cause))
    )
  }
  return refused(error)
}

function refused(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === 'NotAllowedError' || error.name === 'AbortError')
  )
}

/** Why the browser's side of a passkey request failed, or nothing for a failure of the app's. */
export function passkeyFailure(error: unknown): KitPasskeyFailure | undefined {
  if (!(error instanceof WebAuthnError)) {
    return undefined
  }
  return error.code === 'ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED' ? 'already-added' : 'device'
}

/** Asks the browser, resolving to its answer, or to nothing when the request was closed. */
async function answered<A>(asking: () => Promise<A>): Promise<A | undefined> {
  try {
    return await asking()
  } catch (error) {
    if (closed(error)) {
      return undefined
    }
    throw error
  }
}

/**
 * Passkeys for a sign-in page or an account's settings. `signIn` and `add` each resolve to what
 * the server answered, or to nothing when the person closed the browser's prompt, which is no
 * failure and needs no word; anything else throws, the browser's side told by `passkeyFailure`.
 * Called in a component's setup, a request still waiting, as autofill's does, is let go with it.
 *
 * @example
 * const passkeys = usePasskeys()
 * const session = await passkeys.signIn({ options: api.passkeyOptions, verify: api.passkeySignIn })
 */
export function usePasskeys() {
  /** Lets go of the request still waiting for its answer, such as autofill's. */
  function cancel(): void {
    WebAuthnAbortService.cancelCeremony()
  }

  async function signIn<R>(calls: KitPasskeySignIn<R>): Promise<R | undefined> {
    const optionsJSON = await calls.options()
    const answer = await answered(() =>
      startAuthentication({ optionsJSON, useBrowserAutofill: calls.autofill ?? false }),
    )
    return answer ? calls.verify(answer) : undefined
  }

  async function add<R>(calls: KitPasskeyAdd<R>): Promise<R | undefined> {
    const optionsJSON = await calls.options()
    const answer = await answered(() => startRegistration({ optionsJSON }))
    return answer ? calls.verify(answer) : undefined
  }

  if (getCurrentScope()) {
    onScopeDispose(cancel)
  }

  return {
    /** Whether this browser can use passkeys at all. */
    supported: browserSupportsWebAuthn(),
    /** Whether it can offer saved passkeys in a username box's autofill. */
    autofillSupported: browserSupportsWebAuthnAutofill,
    signIn,
    add,
    cancel,
  }
}
