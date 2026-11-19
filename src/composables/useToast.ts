import { createToastManager } from 'reka-ui'

/** What a toast reports: a finished action that went well or failed, a warning, or information. */
export type KitToastTone = 'success' | 'error' | 'warning' | 'info'

/** A toast as it was raised: what `onToast` hands its listener. */
export interface KitToast {
  id: string
  tone: KitToastTone
  title: string
  detail?: string
}

/**
 * The app's one toast list, which KitToastHost shows. It lives outside any component so code
 * that runs outside every component, such as the app's global error handler, can raise a
 * toast too. A toast raised before the host mounts waits, and shows once it does.
 */
export const toastManager = createToastManager()

// A failure or a warning stays long enough to be read twice; a success only needs a glance.
const durations: Record<KitToastTone, number> = {
  success: 4000,
  info: 6000,
  warning: 8000,
  error: 8000,
}

// The toasts raised and not yet taken back, for dismissAllToasts, and who is listening.
const raised = new Set<string>()
const listeners = new Set<(toast: KitToast) => void>()

/**
 * Raises a toast: a title, and a detail when there is more to say, such as the server's own
 * message. Every toast answers something the person did, so a screen reader announces it at
 * once. It goes after a few seconds, held while it is hovered or has focus; a condition the
 * person must act on is a KitAlert on the page instead, which stays. Gives back the toast's id.
 */
export function showToast(tone: KitToastTone, title: string, detail?: string): string {
  const id = toastManager.add({
    title,
    description: detail,
    status: tone,
    type: 'foreground',
    duration: durations[tone],
  })
  raised.add(id)
  for (const listener of listeners) {
    listener(detail === undefined ? { id, tone, title } : { id, tone, title, detail })
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
  success: (title: string, detail?: string) => string
  error: (title: string, detail?: string) => string
  warning: (title: string, detail?: string) => string
  info: (title: string, detail?: string) => string
  dismiss: (id: string) => void
} {
  return {
    success: (title, detail) => showToast('success', title, detail),
    error: (title, detail) => showToast('error', title, detail),
    warning: (title, detail) => showToast('warning', title, detail),
    info: (title, detail) => showToast('info', title, detail),
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
