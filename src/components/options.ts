// The options the kit's choice controls take. They live in a plain TypeScript file, not in a
// component, so every component that takes them reads the same type; ESLint's type checker can't
// see into a .vue file another file imports, and would read the type as `any`.

/** One choice in a KitSelect. Its value can't be an empty string, which the list keeps for "nothing chosen". */
export interface KitSelectOption {
  value: string | number
  label: string
  disabled?: boolean
}

/** A color a KitColorField offers, with its name for a screen reader. */
export interface KitColorPreset {
  /** The color, as `#rrggbb`. */
  value: string
  name: string
}

/** One choice in a KitCombobox, under the heading `group` when it has one. */
export interface KitComboboxOption extends KitSelectOption {
  group?: string
}
