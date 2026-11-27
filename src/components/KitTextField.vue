<script setup lang="ts">
// A one-line text box, inside a KitFormField: `<KitTextField v-model="name" v-bind="field" />`.
// Any other input attribute (placeholder, autocomplete, inputmode, maxlength, name, disabled)
// passes through to the box, and `class` and `style` to its edge.
//
// Words or an icon may stand inside its edge, before the box and after it (the `before` and
// `after` slots): a unit ("gil", "px"), a fixed start ("https://"), a search's magnifying glass.
// Words there are read with the box, as part of what describes it; an icon from the app's own
// set is hidden from screen readers. A button joined to its end, such as a search's Go, goes in
// the `button` slot.
//
// A password box (`type="password"`) given `revealable` has a toggle at its end, Show password,
// which shows what is typed while it is on, for someone to check it, and hides it again when
// turned off. Its icon is the kit's eye unless the `reveal-icon` slot gives the app's own.
import { computed, ref, useAttrs, useId } from 'vue'
import KitGlyph from './KitGlyph.vue'
import KitIconButton from './KitIconButton.vue'
import { filled } from './slots'

const props = withDefaults(
  defineProps<{
    id?: string
    /** The ids of the text that describes the box: its error and hint, from KitFormField. */
    describedBy?: string
    /** Whether the value is in error, which a screen reader says and the border shows. */
    invalid?: boolean
    type?: 'text' | 'email' | 'url' | 'search' | 'tel' | 'password' | 'date' | 'time'
    /** Gives a password box a toggle that shows what is typed. */
    revealable?: boolean
    /** The toggle's name. */
    revealLabel?: string
  }>(),
  {
    id: undefined,
    describedBy: undefined,
    invalid: false,
    type: 'text',
    revealable: false,
    revealLabel: 'Show password',
  },
)

const model = defineModel<string>({ required: true })

const slots = defineSlots<{
  /** Words or an icon before the box, inside its edge. */
  before?: () => unknown
  /** Words or an icon after the box, inside its edge. */
  after?: () => unknown
  /** A button joined to the box's end. */
  button?: () => unknown
  /** The app's own icon for the password toggle, given whether it is on. */
  'reveal-icon'?: (props: { pressed: boolean }) => unknown
}>()

// The box takes the attributes an app gives; the edge round it takes its class and style.
defineOptions({ inheritAttrs: false })
const attrs = useAttrs()
const edgeAttrs = computed(() => ({ class: attrs.class, style: attrs.style }))
const boxAttrs = computed(() => {
  const { class: _class, style: _style, ...rest } = attrs
  return rest
})

const placeId = useId()
const beforeId = `${placeId}-before`
const afterId = `${placeId}-after`

const revealed = ref(false)
const reveals = computed(() => props.revealable && props.type === 'password')
const shownType = computed(() => (reveals.value && revealed.value ? 'text' : props.type))

/** The words before and after the box first, as part of what it is, then its error and hint. */
function describedByAll(): string | undefined {
  return (
    [
      filled(slots.before) ? beforeId : '',
      filled(slots.after) ? afterId : '',
      props.describedBy ?? '',
    ]
      .filter(Boolean)
      .join(' ') || undefined
  )
}
</script>

<template>
  <div v-bind="edgeAttrs" class="kit-text-field" :class="{ 'is-invalid': invalid }">
    <span v-if="filled($slots.before)" :id="beforeId" class="kit-text-field__place">
      <slot name="before" />
    </span>
    <input
      v-bind="boxAttrs"
      :id="id"
      v-model="model"
      :type="shownType"
      class="kit-text-field__box"
      :aria-describedby="describedByAll()"
      :aria-invalid="invalid || undefined"
    />
    <span v-if="filled($slots.after)" :id="afterId" class="kit-text-field__place">
      <slot name="after" />
    </span>
    <KitIconButton
      v-if="reveals"
      class="kit-text-field__joined"
      variant="plain"
      :label="revealLabel"
      :pressed="revealed"
      :disabled="Boolean(boxAttrs.disabled) || boxAttrs.disabled === ''"
      @click="revealed = !revealed"
    >
      <template #default="{ pressed }">
        <slot name="reveal-icon" :pressed="pressed"><KitGlyph name="eye" /></slot>
      </template>
    </KitIconButton>
    <span v-if="filled($slots.button)" class="kit-text-field__button">
      <slot name="button" />
    </span>
  </div>
</template>

<style scoped>
/*
 * The edge is drawn round the box and its places together, and takes the focus ring while the
 * box is focused. Words in a place are muted, which holds 7:1 on the raised surface. A joined
 * button lies over the edge at the end, its own corners at the start squared off.
 */
@layer kit {
  .kit-text-field {
    box-sizing: border-box;
    display: flex;
    align-items: stretch;
    width: 100%;
    min-width: 0;
    min-height: var(--kit-control-height);
    border: var(--kit-control-border-width) solid var(--kit-control-border);
    border-radius: var(--kit-radius-md);
    background: var(--kit-surface-raised);
    color: var(--kit-text);
  }

  .kit-text-field:has(> .kit-text-field__box:focus-visible) {
    outline: var(--kit-focus-ring-width) solid var(--kit-focus-ring);
    outline-offset: var(--kit-focus-ring-offset);
  }

  .kit-text-field.is-invalid {
    border-color: var(--kit-danger);
    box-shadow: inset 0 0 0 1px var(--kit-danger);
  }

  .kit-text-field:has(> .kit-text-field__box:disabled) {
    cursor: not-allowed;
    opacity: 0.6;
  }

  .kit-text-field__box {
    box-sizing: border-box;
    flex: 1 1 auto;
    width: 100%;
    min-width: 0;
    margin: 0;
    padding: var(--kit-space-xs) var(--kit-space-sm);
    border: 0;
    border-radius: inherit;
    background: transparent;
    color: inherit;
    font: inherit;
    outline: none;
  }

  .kit-text-field__box:disabled {
    cursor: not-allowed;
  }

  /* The browser's own placeholder grey falls short of AAA; the muted text color holds 7:1. */
  .kit-text-field__box::placeholder {
    color: var(--kit-text-muted);
    opacity: 1;
  }

  .kit-text-field__place {
    display: inline-flex;
    flex: none;
    align-items: center;
    padding-inline: var(--kit-space-sm);
    color: var(--kit-text-muted);
    white-space: nowrap;
  }

  .kit-text-field__place + .kit-text-field__box {
    padding-inline-start: 0;
  }

  .kit-text-field__box:has(+ .kit-text-field__place) {
    padding-inline-end: 0;
  }

  .kit-text-field__button {
    display: flex;
    flex: none;
  }

  .kit-text-field__joined,
  .kit-text-field__button > :deep(.kit-button) {
    flex: none;
    margin-block: calc(-1 * var(--kit-control-border-width));
    margin-inline-end: calc(-1 * var(--kit-control-border-width));
    border-start-start-radius: 0;
    border-end-start-radius: 0;
  }
}
</style>
