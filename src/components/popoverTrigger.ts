import { defineComponent } from 'vue'
import { injectPopoverRootContext } from 'reka-ui'

/**
 * Gives a popover's trigger the id it is handed, ahead of the one Reka would make, so a form
 * field's `<label for>` names a trigger that is the field's control. Reka keeps the id the root
 * already holds when its trigger mounts, so this sits between the root and the trigger.
 */
export default defineComponent({
  name: 'KitPopoverTriggerId',
  props: {
    id: { type: String, default: undefined },
  },
  setup(props, { slots }) {
    const root = injectPopoverRootContext()
    if (props.id) {
      root.triggerId = props.id
    }
    return () => slots.default?.()
  },
})
