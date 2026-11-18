import { createToastManager } from 'reka-ui'

/** What a toast reports: a finished action that went well or failed, a warning, or a note. */
export type KitToastTone = 'success' | 'error' | 'warning' | 'info'

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

/**
 * Raises a toast: a title, and a detail when there is more to say, such as the server's own
 * message. Every toast answers something the person did, so a screen reader announces it at
 * once. It goes after a few seconds, held while it is hovered or has focus; a condition the
 * person must act on is a KitAlert on the page instead, which stays. Gives back the toast's id.
 */
export function showToast(tone: KitToastTone, title: string, detail?: string): string {
  return toastManager.add({
    title,
    description: detail,
    status: tone,
    type: 'foreground',
    duration: durations[tone],
  })
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
    dismiss: (id) => {
      toastManager.close(id)
    },
  }
}
