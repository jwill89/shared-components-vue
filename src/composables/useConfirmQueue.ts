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

/** One answer to a question asked with `ask()`, besides backing out. */
export interface KitAnswer<V extends string = string> {
  /** What `ask()` resolves to when it is chosen. */
  value: V
  /** Its button's words, named for what it does: "Keep mine". */
  label: string
  /** Whether it is the one most take, which its button's fill shows. */
  primary?: boolean
  /** Whether it can't be undone, which its button's color says too. */
  danger?: boolean
}

/** A question with more than one way to go ahead, for `ask()`. */
export interface KitQuestion<V extends string = string> {
  /** The question, as the dialog's heading: "This shelf changed while you were editing". */
  title: string
  /** What each answer does. */
  message: string
  /** The ways to go ahead, in the order their buttons stand, after Cancel. */
  answers: KitAnswer<V>[]
  /** The button that backs out; "Cancel" unless the question reads better with another. */
  cancelLabel?: string
}

interface Pending extends KitQuestion {
  answer: (value: string | null) => void
}

// Questions wait their turn: a second one asked while the first is open shows after it.
const waiting = shallowReactive<Pending[]>([])

// How many KitConfirmHosts are mounted. With none, a question would wait forever and its
// action would silently never run, so `confirm` and `ask` refuse to ask.
let hosts = 0

/** Puts a question in the queue, resolving to the value of the answer chosen, or null. */
function queue(question: KitQuestion): Promise<string | null> {
  if (hosts === 0) {
    throw new Error('confirm() needs a KitConfirmHost: mount one once, at the app’s root.')
  }
  return new Promise((resolve) => {
    waiting.push({ ...question, answer: resolve })
  })
}

/**
 * Asks the person through the app's one confirm dialog, which KitConfirmHost draws, and
 * resolves to whether they went ahead.
 *
 * @example
 * if (await confirm({ title: 'Delete this shelf?', message: 'Its 12 books go back to unshelved.', confirmLabel: 'Delete', danger: true })) { … }
 */
export function confirm(question: KitConfirmation): Promise<boolean> {
  const { confirmLabel, danger = false, ...rest } = question
  // Asked at once, so a page with no host hears so where it asked.
  return queue({
    ...rest,
    answers: [{ value: 'confirm', label: confirmLabel, primary: !danger, danger }],
  }).then((answer) => answer === 'confirm')
}

/**
 * Asks a question with more than one way to go ahead, such as a save that met someone else's
 * (load theirs, or keep mine), through the same dialog as `confirm()`, and resolves to the value
 * of the answer chosen, or null when the person backed out by Cancel or Escape.
 *
 * @example
 * const choice = await ask({ title: 'This shelf changed', message: '…', answers: [{ value: 'theirs', label: 'Load theirs' }, { value: 'mine', label: 'Keep mine', primary: true }] })
 */
export function ask<V extends string>(question: KitQuestion<V>): Promise<V | null> {
  return queue(question) as Promise<V | null>
}

/** The question on screen now, and the way to answer it: for KitConfirmHost alone. */
export function useConfirmQueue(): {
  current: ComputedRef<KitQuestion | undefined>
  answer: (value: string | null) => void
} {
  return {
    current: computed(() => waiting[0]),
    answer: (value: string | null) => {
      waiting.shift()?.answer(value)
    },
  }
}

/**
 * Counts a mounted KitConfirmHost, and gives back the way to uncount it. When the last host
 * goes, the questions still waiting are answered as backed out of, so nothing waits on a dialog
 * that can't show.
 */
export function registerConfirmHost(): () => void {
  hosts++
  return () => {
    hosts--
    if (hosts === 0) {
      for (const pending of waiting.splice(0)) {
        pending.answer(null)
      }
    }
  }
}
