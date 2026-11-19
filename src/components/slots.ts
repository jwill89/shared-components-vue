import { Comment, Fragment, Text, isVNode } from 'vue'

/**
 * Whether what a slot gave back draws anything: not only comments, which is what a `v-if` that
 * is false leaves behind, nor empty fragments or blank text.
 */
function drawsSomething(content: unknown): boolean {
  if (Array.isArray(content)) {
    return content.some(drawsSomething)
  }
  if (!isVNode(content)) {
    return typeof content === 'string' ? content.trim() !== '' : false
  }
  if (content.type === Comment) {
    return false
  }
  if (content.type === Text || content.type === Fragment) {
    return drawsSomething(content.children)
  }
  return true
}

/**
 * Whether an app filled a slot with something that draws. A box the kit puts around a slot (a
 * dialog footer's start, a panel's actions) asks this rather than whether the slot was passed,
 * so a slot whose content an app switches off with `v-if` leaves no empty box, with its gap and
 * padding, behind. Called while the component renders, as the template's own slots are.
 */
export function filled(slot: (() => unknown) | undefined): boolean
export function filled<P>(slot: ((props: P) => unknown) | undefined, props: P): boolean
export function filled<P>(slot: ((props?: P) => unknown) | undefined, props?: P): boolean {
  return slot !== undefined && drawsSomething(slot(props))
}
