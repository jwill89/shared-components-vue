import { computed, shallowReactive } from 'vue'
import type { ComputedRef } from 'vue'

/** One question for the confirm dialog. */
export interface KitConfirmation {
  /** The question, as the dialog's heading: "Delete this shelf?". */
  title: string
  /** What happens, and how much it removes: "Its 12 books go back to unshelved." */
  message: string
  /** The button that goes ahead, named for what it does: "Delete". */
  confirmLabel: string
  /** The button that backs out; "Cancel" unless the question reads better with another. */
  cancelLabel?: string
  /** Whether going ahead can't be undone, which the confirm button's color says too. */
  danger?: boolean
}

interface Pending extends KitConfirmation {
  answer: (yes: boolean) => void
}

// Questions wait their turn: a second one asked while the first is open shows after it.
const waiting = shallowReactive<Pending[]>([])

// How many KitConfirmHosts are mounted. With none, a question would wait forever and its
// action would silently never run, so `confirm` refuses to ask.
let hosts = 0

/**
 * Asks the person through the app's one confirm dialog, which KitConfirmHost draws, and
 * resolves to whether they went ahead.
 *
 * @example
 * if (await confirm({ title: 'Delete this shelf?', message: 'Its 12 books go back to unshelved.', confirmLabel: 'Delete', danger: true })) { … }
 */
export function confirm(question: KitConfirmation): Promise<boolean> {
  if (hosts === 0) {
    throw new Error('confirm() needs a KitConfirmHost: mount one once, at the app’s root.')
  }
  return new Promise((resolve) => {
    waiting.push({ ...question, answer: resolve })
  })
}

/** The question on screen now, and the way to answer it: for KitConfirmHost alone. */
export function useConfirmQueue(): {
  current: ComputedRef<KitConfirmation | undefined>
  answer: (yes: boolean) => void
} {
  return {
    current: computed(() => waiting[0]),
    answer: (yes: boolean) => {
      waiting.shift()?.answer(yes)
    },
  }
}

/**
 * Counts a mounted KitConfirmHost, and gives back the way to uncount it. When the last host
 * goes, the questions still waiting are answered no, so nothing waits on a dialog that can't
 * show.
 */
export function registerConfirmHost(): () => void {
  hosts++
  return () => {
    hosts--
    if (hosts === 0) {
      for (const pending of waiting.splice(0)) {
        pending.answer(false)
      }
    }
  }
}
