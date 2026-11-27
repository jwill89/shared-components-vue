// The options the kit's choice controls take. They live in a plain TypeScript file, not in a
// component, so every component that takes them reads the same type; ESLint's type checker can't
// see into a .vue file another file imports, and would read the type as `any`.

/**
 * One choice in a KitSelect, under the heading `group` when it has one. Its value can't be an
 * empty string, which the list keeps for "nothing chosen".
 */
export interface KitSelectOption {
  value: string | number
  label: string
  disabled?: boolean
  group?: string
}

/** A color a KitColorField offers, with its name for a screen reader. */
export interface KitColorPreset {
  /** The color, as `#rrggbb`. */
  value: string
  name: string
}

/** One choice in a KitCombobox, under the heading `group` when it has one. */
export type KitComboboxOption = KitSelectOption

/**
 * One answer in a KitCheckboxGroup or a KitRadioGroup: its value, its words, a line under them
 * when it needs one, and the heading `group` it sits under when it has one.
 */
export interface KitChoiceOption<V extends string | number = string | number> {
  value: V
  label: string
  /** A line under its words, read with it: what choosing it means. */
  hint?: string
  disabled?: boolean
  group?: string
}

/** A run of options under one heading, or under none. */
export interface KitOptionRun<O> {
  heading: string | undefined
  options: O[]
}

/**
 * Options gathered under their headings, each heading where its first option comes and every
 * option under it in the order given. Options with no heading gather together in the same way.
 */
export function byHeading<O extends { group?: string }>(options: readonly O[]): KitOptionRun<O>[] {
  const runs = new Map<string | undefined, O[]>()
  for (const option of options) {
    const run = runs.get(option.group)
    if (run) {
      run.push(option)
    } else {
      runs.set(option.group, [option])
    }
  }
  return [...runs].map(([heading, gathered]) => ({ heading, options: gathered }))
}
