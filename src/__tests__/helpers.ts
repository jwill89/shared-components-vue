import axe from 'axe-core'
import { h, reactive } from 'vue'
import type { Component } from 'vue'
import { mount } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import KitFormField from '../components/KitFormField.vue'
import type { KitFieldBinding } from '../components/KitFormField.vue'

const cleanups: (() => void)[] = []

/**
 * A control inside a KitFormField, bound to it as a page binds it (`v-bind="field"`), its model
 * kept in step as a page's v-model keeps it, attached to the document so focus and axe see it,
 * and kept for `unmountKept`. `state.value` is the model as it stands.
 */
export function field(
  control: Component,
  value: unknown,
  fieldProps: Record<string, unknown> = {},
  controlProps: Record<string, unknown> = {},
  controlSlots: Record<string, (...args: never[]) => unknown> = {},
): { wrapper: VueWrapper; state: { value: unknown } } {
  const state = reactive({ value })
  const wrapper: VueWrapper = kept(
    mount(KitFormField, {
      props: { label: 'Name', ...fieldProps },
      slots: {
        default: (binding: KitFieldBinding) =>
          h(
            control,
            {
              ...binding,
              ...controlProps,
              modelValue: state.value,
              'onUpdate:modelValue': (next: unknown) => {
                state.value = next
              },
            },
            controlSlots,
          ),
      },
      attachTo: document.body,
    }),
  )
  return { wrapper, state }
}

/** The options of the list that is open, as their words. */
export function openOptions(): string[] {
  return [...document.querySelectorAll('[role="option"]')].map((o) => o.textContent.trim())
}

/** An option of the open list, by its words. */
export function option(text: string): HTMLElement {
  const found = [...document.querySelectorAll<HTMLElement>('[role="option"]')].find(
    (candidate) => candidate.textContent.trim() === text,
  )
  if (!found) {
    throw new Error(`No option "${text}" is open.`)
  }
  return found
}

/** Keeps a wrapper to unmount after the test, so one test's leftovers never reach the next. */
export function kept<W extends VueWrapper>(wrapper: W): W {
  cleanups.push(() => {
    wrapper.unmount()
  })
  return wrapper
}

/** Unmounts every wrapper kept, and empties the document of what they teleported. */
export function unmountKept(): void {
  for (const cleanup of cleanups.splice(0)) {
    cleanup()
  }
  document.body.innerHTML = ''
}

/**
 * What axe finds wrong in what the wrapper renders, or in an element (the document's body,
 * for what a component teleports there), at WCAG 2.2 AA with its best practices, one line per
 * failing element. jsdom lays nothing out, so contrast is left to contrast.spec.ts and the
 * end-to-end suite, and `region` to the page, since a component alone sits in no landmark.
 */
export async function axeFindings(target: VueWrapper | Element): Promise<string[]> {
  const element = target instanceof Element ? target : target.element
  const results = await axe.run(
    { include: [element] },
    {
      runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'],
      rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
    },
  )
  return results.violations.flatMap((violation) =>
    violation.nodes.map((node) => `${violation.id}: ${node.target.join(' ')} — ${violation.help}`),
  )
}
