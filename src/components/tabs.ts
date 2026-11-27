/** One tab of a KitTabs: its part is the slot named by its key. */
export interface KitTab {
  key: string
  label: string
  /** How many things its part holds, shown after its words and read with them. */
  count?: number
}
