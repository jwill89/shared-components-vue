import { createToastManager } from 'reka-ui'

/** What a toast reports: a finished action that went well or failed, a warning, or information. */
export type KitToastTone = 'success' | 'error' | 'warning' | 'info'

/** A toast as it was raised: what `onToast` hands its listener. */
export interface KitToast {
  id: string
  tone: KitToastTone
  title: string
  detail?: string
  /** Its action's words, where it has one. */
  action?: string
}

/**
 * A button on a toast that does something about what it reports, such as Undo. A toast with one
 * stays until the button is used or the toast dismissed, since someone must have time to find it.
 */
export interface KitToastAction {
  /** The button's words: "Undo". */
  label: string
  /**
   * How a screen reader reaches the button, read after the toast's words. By default it says the
   * notifications are reached by F8, then names the button.
   */
  hint?: string
  onClick: () => void
}

/** What a toast may have besides its words. */
export interface KitToastOptions {
  action?: KitToastAction
  /** How long it stays, in milliseconds, in place of its tone's while; `Infinity` until dismissed. */
  duration?: number
}

/**
 * The app's one toast list, which KitToastHost shows. It lives outside any component so code
 * that runs outside every component, such as the app's global error handler, can raise a
 * toast too. A toast raised before the host mounts waits, and shows once it does.
 */
export const toastManager = createToastManager()

// A failure or a warning stays long enough to be read twice; a success only needs a glance.
// An app may set its own (setToastDurations).
const durations: Record<KitToastTone, number> = {
  success: 4000,
  info: 6000,
  warning: 8000,
  error: 8000,
}

// The toasts raised and not yet taken back, for dismissAllToasts, and who is listening.
const raised = new Set<string>()
const listeners = new Set<(toast: KitToast) => void>()

/** Sets how long each tone's toasts stay, in milliseconds, for every toast raised after. */
export function setToastDurations(next: Partial<Record<KitToastTone, number>>): void {
  Object.assign(durations, next)
}

/**
 * Raises a toast: a title, and a detail when there is more to say, such as the server's own
 * message. Every toast answers something the person did, so a screen reader announces it at
 * once. It goes after its tone's while, held while it is hovered or has focus, unless it has an
 * action, when it stays until the action is used or the toast dismissed; a condition the person
 * must act on is a KitAlert on the page instead, which stays. Gives back the toast's id.
 */
export function showToast(
  tone: KitToastTone,
  title: string,
  detail?: string,
  options: KitToastOptions = {},
): string {
  const { action } = options
  const id = toastManager.add({
    title,
    description: detail,
    status: tone,
    type: 'foreground',
    duration: options.duration ?? (action ? Infinity : durations[tone]),
    ...(action && {
      actionProps: {
        label: action.label,
        altText: action.hint ?? `${action.label} is in the notifications, which F8 takes you to.`,
        onClick: () => {
          action.onClick()
        },
      },
    }),
  })
  raised.add(id)
  const shown: KitToast = { id, tone, title }
  if (detail !== undefined) {
    shown.detail = detail
  }
  if (action) {
    shown.action = action.label
  }
  for (const listener of listeners) {
    listener(shown)
  }
  return id
}

/** Takes a toast back before its time. */
export function dismissToast(id: string): void {
  raised.delete(id)
  toastManager.close(id)
}

/** The toast calls a component makes, one for each tone, and the way to take one back. */
export function useToast(): {
  success: (title: string, detail?: string, options?: KitToastOptions) => string
  error: (title: string, detail?: string, options?: KitToastOptions) => string
  warning: (title: string, detail?: string, options?: KitToastOptions) => string
  info: (title: string, detail?: string, options?: KitToastOptions) => string
  dismiss: (id: string) => void
} {
  return {
    success: (title, detail, options) => showToast('success', title, detail, options),
    error: (title, detail, options) => showToast('error', title, detail, options),
    warning: (title, detail, options) => showToast('warning', title, detail, options),
    info: (title, detail, options) => showToast('info', title, detail, options),
    dismiss: dismissToast,
  }
}

/**
 * Hands every toast raised from now on to `listener`, until the function it gives back is
 * called: an app's specs see what a page raised without a host on screen, and its logs can keep
 * a copy. Raising goes on as before.
 */
export function onToast(listener: (toast: KitToast) => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/**
 * Takes back every toast raised and not yet taken back. An app's specs call it after each
 * test: a toast raised with no host mounted waits for the next host to show it, which would
 * otherwise be the next test's.
 */
export function dismissAllToasts(): void {
  for (const id of [...raised]) {
    dismissToast(id)
  }
}
