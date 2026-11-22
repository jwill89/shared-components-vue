<script setup lang="ts">
// The one Markdown editor: formatted text on screen, Markdown in the model. A toolbar above the
// text offers what the dialect can write, and Markdown typed straight in (`# `, `> `, `- `,
// `**bold**`) takes its form as it is typed.
//
// `dialect` says which Markdown it writes: `commonmark` for an app's own pages, or `discord` for
// text that is posted to Discord, where `__` is underline, `**` is bold, every line is its own,
// and mentions, channels, roles, emoji and times show by the names the app gives (`names`) and
// are suggested as the person types `@`, `#`, `:` or `/` (`suggest`). `profile` narrows it for
// one field: `inline`, marks only, on one line, for a title; `plain`, no Markdown at all.
//
// It sits in a `group` KitFormField, whose caption names it (`labelledBy`), and takes the
// field's `id`, `describedBy` and `invalid` as every control does. `limit` counts the Markdown it
// writes, which is what a server and Discord count. Icons come in through the `tool-<name>`
// slots (`tool-bold`, `tool-heading-2`); a tool with none shows a sign of its own.
//
// It is the package's `/editor` entry, which an app loads on first use, so a page with no editor
// never carries TipTap.
import {
  computed,
  h,
  onBeforeUnmount,
  onMounted,
  ref,
  shallowRef,
  useId,
  useTemplateRef,
  watch,
} from 'vue'
import type { Editor } from '@tiptap/core'
import { Toggle, ToolbarButton, ToolbarRoot, ToolbarSeparator } from 'reka-ui'
import KitButton from '../components/KitButton.vue'
import KitDatePicker from '../components/KitDatePicker.vue'
import KitFormField from '../components/KitFormField.vue'
import KitGlyph from '../components/KitGlyph.vue'
import KitIconButton from '../components/KitIconButton.vue'
import KitPopover from '../components/KitPopover.vue'
import KitSelect from '../components/KitSelect.vue'
import KitTextField from '../components/KitTextField.vue'
import { formatCount } from '../format'
import {
  formatTime,
  lookUp,
  roleColor,
  type KitDiscordLookup,
  type KitDiscordNames,
  type KitDiscordRole,
  type KitDiscordTimeStyle,
} from '../discord/tokens'
import { createEngine, type Engine } from './engine'
import {
  discordSuggestions,
  type KitDiscordSuggest,
  type KitDiscordSuggestion,
  type SuggestionList,
} from './suggest'
import { POPOVER_TOOLS, kitTools, type KitEditorExtension, type KitEditorTool } from './tools'
import type { KitEditorDialect, KitEditorProfile } from './writer'

const props = withDefaults(
  defineProps<{
    id?: string
    /** The caption that names it: a `group` KitFormField's. */
    labelledBy?: string
    /** Its name, where no caption names it. */
    label?: string
    /** The ids of the text that describes it: its error and hint, from KitFormField. */
    describedBy?: string
    invalid?: boolean
    /** Which Markdown it writes. */
    dialect?: KitEditorDialect
    /** How much of it this field takes: all of it, marks on one line, or no Markdown. */
    profile?: KitEditorProfile
    /** The heading levels its toolbar offers; it reads every level its dialect has. */
    headings?: readonly number[]
    /** The app's own pieces, each with its Markdown and its tool. Read once, as it mounts. */
    extensions?: readonly KitEditorExtension[]
    /** What Discord's tokens in the text name. */
    names?: KitDiscordNames
    /** Asked for suggestions as `@`, `#`, `:` or `/` is typed, in the Discord dialect. */
    suggest?: KitDiscordSuggest
    /** The most characters its Markdown may hold, as the server checks it; no count without one. */
    limit?: number
    /** Shown while it is empty; never its name. */
    placeholder?: string
    disabled?: boolean
    /** What the toolbar is called to a screen reader. */
    toolbarLabel?: string
  }>(),
  {
    id: undefined,
    labelledBy: undefined,
    label: undefined,
    describedBy: undefined,
    invalid: false,
    dialect: 'commonmark',
    profile: 'full',
    headings: undefined,
    extensions: () => [],
    names: () => ({}),
    suggest: undefined,
    limit: Infinity,
    placeholder: '',
    disabled: false,
    toolbarLabel: 'Formatting',
  },
)

const emit = defineEmits<{ blur: [] }>()
const model = defineModel<string>({ required: true })

defineSlots<Record<`tool-${string}`, () => unknown>>()

const surface = useTemplateRef<HTMLDivElement>('surface')
const frame = useTemplateRef<HTMLDivElement>('frame')
const engine = shallowRef<Engine | null>(null)
/** The Markdown as of the last change, so only a real change reaches the model. */
let current = ''

const ownId = useId()
const textId = computed(() => props.id ?? `${ownId}-text`)
const countId = `${ownId}-count`
const listId = `${ownId}-suggestions`

// The count, as KitTextarea keeps it: in code points, announced as the remainder runs low.
const warnAt = 20
const used = computed(() => Array.from(model.value).length)
const counted = computed(() => Number.isFinite(props.limit))
const left = computed(() => props.limit - used.value)
const over = computed(() => left.value < 0)
const count = computed(() => {
  const shown = `${formatCount(used.value)} / ${formatCount(props.limit)}`
  return over.value ? `${shown} (${formatCount(-left.value)} over)` : shown
})
const countAnnouncement = computed(() => {
  if (!counted.value || left.value > warnAt) {
    return ''
  }
  return over.value
    ? `${formatCount(-left.value)} characters over the limit`
    : `${formatCount(left.value)} characters left`
})

// -- Names ------------------------------------------------------------------------------------
// What a choice from the suggestions names, kept so it shows by name even where the app's own
// names don't hold it yet. The app's names win.
interface Learned {
  members: Map<string, string>
  roles: Map<string, KitDiscordRole>
  channels: Map<string, string>
  emoji: Map<string, string>
}

const learned = shallowRef<Learned>({
  members: new Map(),
  roles: new Map(),
  channels: new Map(),
  emoji: new Map(),
})

function merged<T>(
  ours: ReadonlyMap<string, T>,
  theirs: KitDiscordLookup<T> | undefined,
): ReadonlyMap<string, T> {
  const out = new Map(ours)
  if (theirs instanceof Map) {
    theirs.forEach((value, id) => out.set(id, value))
  } else if (theirs) {
    Object.entries(theirs).forEach(([id, value]) => out.set(id, value))
  }
  return out
}

const names = computed<KitDiscordNames>(() => ({
  ...props.names,
  members: merged(learned.value.members, props.names.members),
  roles: merged(learned.value.roles, props.names.roles),
  channels: merged(learned.value.channels, props.names.channels),
  emoji: merged(learned.value.emoji, props.names.emoji),
}))

function learn(item: KitDiscordSuggestion): void {
  const next = { ...learned.value }
  if (item.kind === 'member') {
    next.members = new Map(next.members).set(item.id, item.name)
  } else if (item.kind === 'role') {
    next.roles = new Map(next.roles).set(item.id, { name: item.name, color: item.color })
  } else if (item.kind === 'channel') {
    next.channels = new Map(next.channels).set(item.id, item.name)
  } else if (item.kind === 'emoji' && item.id && item.image) {
    next.emoji = new Map(next.emoji).set(item.id, item.image)
  }
  learned.value = next
}

watch(names, () => engine.value?.redrawTokens())

// -- Suggestions --------------------------------------------------------------------------------
const list = shallowRef<SuggestionList | null>(null)
const active = ref(0)
const listPlace = ref({ top: 0, left: 0 })

function optionId(index: number): string {
  return `${listId}-${String(index)}`
}

function suggestionWords(item: KitDiscordSuggestion): string {
  switch (item.kind) {
    case 'member':
    case 'role':
      return `@${item.name}`
    case 'channel':
      return `#${item.name}`
    case 'emoji':
      return item.text ? `${item.text} :${item.name}:` : `:${item.name}:`
    case 'command':
      return `/${item.name}`
  }
}

const listAnnouncement = computed(() => {
  const size = list.value?.items.length ?? 0
  return size
    ? `${formatCount(size)} suggestion${size === 1 ? '' : 's'}; up and down to choose`
    : ''
})

function place(rect: DOMRect | null): void {
  const box = frame.value?.getBoundingClientRect()
  if (!rect || !box) {
    return
  }
  listPlace.value = {
    top: rect.bottom - box.top + 4,
    left: Math.max(0, Math.min(rect.left - box.left, box.width - 240)),
  }
}

const suggestions = discordSuggestions({
  suggest: () => props.suggest,
  onList: (next) => {
    if (!next || next.items !== list.value?.items) {
      active.value = 0
    }
    list.value = next
    if (next) {
      place(next.rect)
    }
  },
  onKey: (event) => {
    const open = list.value
    if (!open) {
      return false
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      const step = event.key === 'ArrowDown' ? 1 : -1
      active.value = (active.value + step + open.items.length) % open.items.length
      return true
    }
    if (event.key === 'Enter' || event.key === 'Tab') {
      const item = open.items[active.value]
      if (item) {
        open.choose(item)
      }
      return true
    }
    return false
  },
  onChoose: learn,
})

// -- The toolbar --------------------------------------------------------------------------------
const headingLevels = computed(
  () => props.headings ?? (props.dialect === 'discord' ? [1, 2, 3] : [2, 3]),
)
const appTools = props.extensions.flatMap((piece) => (piece.tool ? [piece.tool] : []))
const groups = computed(() =>
  [...kitTools(props.dialect, props.profile, headingLevels.value), appTools].filter(
    (group) => group.length,
  ),
)
const tools = computed(() => groups.value.flat())

/**
 * A tool's sign where the app gives no icon: one of the kit's drawn marks, or its letters drawn in
 * the style it applies. Either stands for an icon, which the button's name says in words.
 */
function ToolSign(sign: { tool: KitEditorTool }) {
  const { tool } = sign
  return tool.icon
    ? h(KitGlyph, { name: tool.icon })
    : h('span', {
        class: 'kit-markdown-editor__glyph',
        'data-tool': tool.name,
        'data-glyph': tool.glyph,
      })
}

/** Which toggles the text at the cursor has, refreshed after every change of the selection. */
const pressed = ref<Record<string, boolean>>({})

function sync(): void {
  const editor = engine.value?.editor
  if (!editor) {
    return
  }
  pressed.value = Object.fromEntries(
    tools.value.map((tool) => [tool.name, tool.isActive?.(editor) ?? false]),
  )
}

function use(tool: KitEditorTool | undefined): void {
  const editor = engine.value?.editor
  if (tool && editor && !props.disabled) {
    tool.run(editor)
  }
}

// -- Links --------------------------------------------------------------------------------------
// A popover's form, once done, sends focus back to the text it changed, so the person types on
// where they were; Escape leaves it on the tool, as a popover does.
let doneInPopover = false

function backToText(event: Event): void {
  if (doneInPopover) {
    doneInPopover = false
    event.preventDefault()
    engine.value?.editor.commands.focus()
  }
}

/** Closes a popover whose form has done its work. */
function finish(open: { value: boolean }): void {
  doneInPopover = true
  open.value = false
}

const linkOpen = ref(false)
const linkHref = ref('')
const linkError = ref('')

watch(linkOpen, (open) => {
  const editor = engine.value?.editor
  if (open && editor) {
    use(tools.value.find((tool) => tool.name === 'link'))
    linkHref.value = String(editor.getAttributes('link').href ?? '')
    linkError.value = ''
  }
})

/** What the address box shows while it is empty. */
const LINK_PLACEHOLDER = 'https://'

/** The address as a link takes it: a bare `example.com` gains `https://`. */
function linkAddress(typed: string): string {
  const address = typed.trim()
  return /^[a-z][a-z0-9+.-]*:/i.test(address) ? address : `https://${address}`
}

function applyLink(): void {
  const editor = engine.value?.editor
  if (!editor) {
    return
  }
  if (!linkHref.value.trim()) {
    removeLink()
    return
  }
  const href = linkAddress(linkHref.value)
  const allowed =
    props.dialect === 'discord' ? /^https?:\/\/\S+$/i : /^(?:https?:\/\/|mailto:)\S+$/i
  if (!allowed.test(href)) {
    linkError.value =
      props.dialect === 'discord'
        ? 'Use a web address, starting https://.'
        : 'Use a web address, starting https://, or an email address, starting mailto:.'
    return
  }
  const chain = editor.chain().focus()
  if (editor.state.selection.empty && !editor.isActive('link')) {
    chain
      .insertContent({ type: 'text', text: href, marks: [{ type: 'link', attrs: { href } }] })
      .unsetMark('link')
      .run()
  } else {
    chain.extendMarkRange('link').setLink({ href }).run()
  }
  finish(linkOpen)
}

function removeLink(): void {
  engine.value?.editor.chain().focus().extendMarkRange('link').unsetLink().run()
  finish(linkOpen)
}

// -- Times --------------------------------------------------------------------------------------
const timeOpen = ref(false)
const timeDate = ref('')
const timeClock = ref('')
const timeStyle = ref<KitDiscordTimeStyle>('f')
const timeError = ref('')

function twoDigits(value: number): string {
  return String(value).padStart(2, '0')
}

watch(timeOpen, (open) => {
  if (open) {
    use(tools.value.find((tool) => tool.name === 'time'))
    const now = new Date()
    timeDate.value = `${String(now.getFullYear())}-${twoDigits(now.getMonth() + 1)}-${twoDigits(now.getDate())}`
    timeClock.value = `${twoDigits(now.getHours())}:00`
    timeError.value = ''
  }
})

/** The moment chosen, in seconds, in the person's own time zone. */
const timeChosen = computed(() => {
  const at = new Date(`${timeDate.value}T${timeClock.value || '00:00'}`)
  return Number.isNaN(at.getTime()) ? null : Math.floor(at.getTime() / 1000)
})

const TIME_STYLES: readonly [KitDiscordTimeStyle, string][] = [
  ['f', 'Date and time'],
  ['F', 'Day, date and time'],
  ['d', 'Short date'],
  ['D', 'Long date'],
  ['t', 'Short time'],
  ['T', 'Long time'],
  ['R', 'Relative'],
]

const timeStyles = computed(() =>
  TIME_STYLES.map(([value, words]) => {
    const example =
      timeChosen.value === null ? null : formatTime(timeChosen.value, value, names.value)
    return { value, label: example ? `${words}: ${example}` : words }
  }),
)

function insertTime(): void {
  const editor = engine.value?.editor
  if (!editor || timeChosen.value === null) {
    timeError.value = 'Choose a date.'
    return
  }
  const raw = `<t:${String(timeChosen.value)}:${timeStyle.value}>`
  editor
    .chain()
    .focus()
    .insertContent([
      { type: 'discordToken', attrs: { raw } },
      { type: 'text', text: ' ' },
    ])
    .run()
  finish(timeOpen)
}

// -- The text -----------------------------------------------------------------------------------
const focused = ref(false)

const describedBy = computed(
  () => [props.describedBy, counted.value ? countId : ''].filter(Boolean).join(' ') || undefined,
)

/** The editable text's own attributes, which follow the props and the open list. */
function attributes(): Record<string, string> {
  const open = list.value
  const out: Record<string, string> = {
    id: textId.value,
    role: 'textbox',
    'aria-multiline': String(props.profile !== 'inline'),
  }
  if (props.labelledBy) {
    out['aria-labelledby'] = props.labelledBy
  } else {
    out['aria-label'] = props.label ?? 'Formatted text'
  }
  if (describedBy.value) {
    out['aria-describedby'] = describedBy.value
  }
  if (props.invalid || over.value) {
    out['aria-invalid'] = 'true'
  }
  if (props.disabled) {
    out['aria-disabled'] = 'true'
  }
  if (props.dialect === 'discord' && props.profile === 'full' && props.suggest) {
    out['aria-autocomplete'] = 'list'
    if (open) {
      out['aria-controls'] = listId
      out['aria-activedescendant'] = optionId(active.value)
    }
  }
  return out
}

// The editable's attributes are worked out again on each change of the editor's state; a change
// of a prop or of the open option sends it an empty one.
watch(
  [() => props.labelledBy, () => props.label, describedBy, () => props.invalid, over, list, active],
  () => {
    const editor = engine.value?.editor
    if (editor && !editor.isDestroyed) {
      editor.view.dispatch(editor.state.tr.setMeta('addToHistory', false))
    }
  },
)

function onUpdate(): void {
  const markdown = engine.value?.write() ?? ''
  if (markdown !== current) {
    current = markdown
    model.value = markdown
  }
}

onMounted(() => {
  if (!surface.value) {
    return
  }
  const made = createEngine({
    element: surface.value,
    dialect: props.dialect,
    profile: props.profile,
    content: model.value,
    extensions: props.extensions.map((piece) => piece.extension),
    additions: props.dialect === 'discord' && props.profile === 'full' ? [suggestions] : [],
    names: () => names.value,
    placeholder: props.placeholder,
    attributes,
    onUpdate,
    onTransaction: sync,
    onFocus: () => {
      focused.value = true
    },
    onBlur: () => {
      focused.value = false
      emit('blur')
    },
  })
  made.editor.setEditable(!props.disabled)
  // The starting text as the editor writes it: what a change is measured against, so opening a
  // form never reports an edit nobody made.
  current = made.write()
  engine.value = made
  sync()
})

onBeforeUnmount(() => {
  engine.value?.destroy()
  engine.value = null
})

// A value set from outside (a reset, a fill) replaces the text; the editor's own changes come
// back here unchanged and are left alone.
watch(model, (value) => {
  const made = engine.value
  if (made && value !== current) {
    made.read(value)
    current = made.write()
  }
})

watch(
  () => props.disabled,
  (disabled) => engine.value?.editor.setEditable(!disabled),
)

defineExpose({
  /** The TipTap editor, for an app's own tools. */
  editor: (): Editor | undefined => engine.value?.editor,
  focus: (): void => {
    engine.value?.editor.commands.focus()
  },
})

function role(item: KitDiscordSuggestion): string | undefined {
  return item.kind === 'role'
    ? roleColor(item.color ?? lookUp(names.value.roles, item.id)?.color)
    : undefined
}
</script>

<template>
  <div
    class="kit-markdown-editor"
    :class="{
      'is-focused': focused,
      'is-invalid': invalid || over,
      'is-disabled': disabled,
      'is-one-line': profile === 'inline',
      'is-discord': dialect === 'discord',
    }"
  >
    <div class="kit-markdown-editor__box">
      <ToolbarRoot
        v-if="groups.length"
        class="kit-markdown-editor__toolbar"
        :aria-label="toolbarLabel"
        :aria-controls="textId"
      >
        <template v-for="(group, at) in groups" :key="group[0]?.name">
          <ToolbarSeparator v-if="at > 0" class="kit-markdown-editor__separator" />
          <template v-for="tool in group" :key="tool.name">
            <KitPopover
              v-if="tool.name === 'link'"
              v-model:open="linkOpen"
              align="start"
              @close-auto-focus="backToText"
            >
              <template #trigger>
                <ToolbarButton as-child>
                  <KitIconButton
                    class="kit-markdown-editor__tool"
                    :label="tool.label"
                    :variant="pressed.link ? 'primary' : 'plain'"
                    :disabled="disabled"
                    :aria-pressed="pressed.link ? 'true' : 'false'"
                    @mousedown.prevent
                  >
                    <slot :name="`tool-${tool.name}`"><ToolSign :tool="tool" /></slot>
                  </KitIconButton>
                </ToolbarButton>
              </template>
              <form class="kit-markdown-editor__form" novalidate @submit.prevent="applyLink">
                <KitFormField v-slot="field" label="Link address" :error="linkError">
                  <KitTextField
                    v-bind="field"
                    v-model="linkHref"
                    type="url"
                    inputmode="url"
                    :placeholder="LINK_PLACEHOLDER"
                  />
                </KitFormField>
                <div class="kit-markdown-editor__actions">
                  <KitButton type="submit" variant="primary">Apply</KitButton>
                  <KitButton v-if="pressed.link" variant="quiet" @click="removeLink"
                    >Remove the link</KitButton
                  >
                </div>
              </form>
            </KitPopover>
            <KitPopover
              v-else-if="tool.name === 'time'"
              v-model:open="timeOpen"
              align="start"
              @close-auto-focus="backToText"
            >
              <template #trigger>
                <ToolbarButton as-child>
                  <KitIconButton
                    class="kit-markdown-editor__tool"
                    :label="tool.label"
                    variant="plain"
                    :disabled="disabled"
                    @mousedown.prevent
                  >
                    <slot :name="`tool-${tool.name}`"><ToolSign :tool="tool" /></slot>
                  </KitIconButton>
                </ToolbarButton>
              </template>
              <form class="kit-markdown-editor__form" novalidate @submit.prevent="insertTime">
                <KitFormField v-slot="field" label="Date" group :error="timeError">
                  <KitDatePicker v-bind="field" v-model="timeDate" />
                </KitFormField>
                <KitFormField
                  v-slot="field"
                  label="Time"
                  hint="In your own time zone; each reader sees it in theirs."
                >
                  <KitTextField v-bind="field" v-model="timeClock" type="time" />
                </KitFormField>
                <KitFormField v-slot="field" label="Shown as">
                  <KitSelect v-bind="field" v-model="timeStyle" :options="timeStyles" />
                </KitFormField>
                <div class="kit-markdown-editor__actions">
                  <KitButton type="submit" variant="primary">Insert the time</KitButton>
                </div>
              </form>
            </KitPopover>
            <ToolbarButton v-else-if="tool.isActive && !POPOVER_TOOLS.has(tool.name)" as-child>
              <Toggle
                as-child
                :model-value="Boolean(pressed[tool.name])"
                @update:model-value="use(tool)"
              >
                <KitIconButton
                  class="kit-markdown-editor__tool"
                  :label="tool.label"
                  :variant="pressed[tool.name] ? 'primary' : 'plain'"
                  :disabled="disabled"
                  @mousedown.prevent
                >
                  <slot :name="`tool-${tool.name}`"><ToolSign :tool="tool" /></slot>
                </KitIconButton>
              </Toggle>
            </ToolbarButton>
            <ToolbarButton v-else as-child>
              <KitIconButton
                class="kit-markdown-editor__tool"
                :label="tool.label"
                variant="plain"
                :disabled="disabled"
                @mousedown.prevent
                @click="use(tool)"
              >
                <slot :name="`tool-${tool.name}`"><ToolSign :tool="tool" /></slot>
              </KitIconButton>
            </ToolbarButton>
          </template>
        </template>
      </ToolbarRoot>

      <div ref="frame" class="kit-markdown-editor__frame">
        <div ref="surface" class="kit-markdown-editor__surface"></div>
        <div
          v-if="list"
          :id="listId"
          class="kit-option-list kit-markdown-editor__suggestions"
          role="listbox"
          aria-label="Suggestions"
          :style="{ top: `${listPlace.top}px`, left: `${listPlace.left}px` }"
        >
          <div class="kit-option-list__viewport">
            <div
              v-for="(item, at) in list.items"
              :id="optionId(at)"
              :key="`${item.kind}-${item.id}-${item.name}`"
              class="kit-option-list__item"
              role="option"
              :aria-selected="at === active ? 'true' : 'false'"
              :data-highlighted="at === active ? '' : undefined"
              tabindex="-1"
              @mousedown.prevent
              @click="list.choose(item)"
              @keydown.enter.prevent="list.choose(item)"
            >
              <svg
                v-if="role(item)"
                class="kit-markdown-editor__dot"
                viewBox="0 0 2 2"
                aria-hidden="true"
              >
                <circle cx="1" cy="1" r="1" :fill="role(item)" />
              </svg>
              <img v-if="item.image" class="kit-markdown-editor__emoji" :src="item.image" alt="" />
              <span>{{ suggestionWords(item) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <p v-if="counted" :id="countId" class="kit-markdown-editor__count" :class="{ 'is-over': over }">
      {{ count }}
    </p>
    <p class="kit-markdown-editor__announcement" aria-live="polite">
      {{ listAnnouncement || countAnnouncement }}
    </p>
  </div>
</template>

<style>
@layer kit {
  .kit-markdown-editor {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: var(--kit-space-2xs);
    min-width: 0;
  }

  /* The toolbar and the text are one control, edged as a text box is: the bar across its top on
     a surface of its own, and the text under it. */
  .kit-markdown-editor__box {
    box-sizing: border-box;
    min-width: 0;
    border: var(--kit-control-border-width) solid var(--kit-control-border);
    border-radius: var(--kit-radius-md);
    background: var(--kit-surface-raised);
  }

  .is-invalid .kit-markdown-editor__box {
    border-color: var(--kit-danger);
    box-shadow: inset 0 0 0 1px var(--kit-danger);
  }

  .is-disabled .kit-markdown-editor__box {
    opacity: 0.6;
  }

  /* The ring goes round the whole box while its text has focus; a tool has its own. */
  .kit-markdown-editor__box:has(.kit-markdown-editor__text:focus-visible) {
    outline: var(--kit-focus-ring-width) solid var(--kit-focus-ring);
    outline-offset: var(--kit-focus-ring-offset);
  }

  .kit-markdown-editor__toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--kit-space-2xs);
    padding: var(--kit-space-2xs);
    border-block-end: var(--kit-control-border-width) solid var(--kit-control-border);
    border-start-start-radius: inherit;
    border-start-end-radius: inherit;
    background: var(--kit-surface-sunken);
  }

  .kit-markdown-editor__separator {
    align-self: stretch;
    width: var(--kit-control-border-width);
    margin: var(--kit-space-2xs);
    background: var(--kit-control-border);
  }

  /* A tool is square and close to the next, washed on hover as a plain button is, but never
     underlined: underline is one of the tools, and a tool is no link. Pressed, it is filled. */
  .kit-markdown-editor__toolbar .kit-markdown-editor__tool.kit-button {
    border-radius: var(--kit-radius-sm);
  }

  .kit-markdown-editor__toolbar .kit-markdown-editor__tool.kit-button:hover:not(:disabled) {
    text-decoration: none;
  }

  /* A tool's own sign, where the app gives no icon, drawn in the style it applies. It stands for
     an icon, which the button's name says in words, so it is drawn rather than written: a
     person speaking to their screen says the button's name, not "H2". */
  .kit-markdown-editor__glyph {
    font-family: var(--kit-font-body);
    font-size: var(--kit-text-size-base);
    font-weight: var(--kit-font-weight-strong);
    line-height: 1;
    white-space: nowrap;
  }

  .kit-markdown-editor__glyph::before {
    content: attr(data-glyph) / '';
  }

  .kit-markdown-editor__glyph[data-tool='italic'] {
    font-style: italic;
  }

  .kit-markdown-editor__glyph[data-tool='underline'] {
    text-decoration: underline;
  }

  .kit-markdown-editor__glyph[data-tool='strike'] {
    text-decoration: line-through;
  }

  .kit-markdown-editor__glyph[data-tool='code'],
  .kit-markdown-editor__glyph[data-tool='codeBlock'] {
    font-family: var(--kit-font-code);
  }

  .kit-markdown-editor__frame {
    position: relative;
  }

  .kit-markdown-editor__text {
    box-sizing: border-box;
    min-height: calc(var(--kit-control-height) * 3);
    padding: var(--kit-space-xs) var(--kit-space-sm);
    border-radius: inherit;
    color: var(--kit-text);
    font: inherit;
    line-height: var(--kit-line-height-prose);
    overflow-wrap: anywhere;
    white-space: pre-wrap;
    white-space: break-spaces;
    font-variant-ligatures: none;
  }

  .is-one-line .kit-markdown-editor__text {
    min-height: var(--kit-control-height);
  }

  .kit-markdown-editor__text:focus-visible {
    outline: none;
  }

  .is-disabled .kit-markdown-editor__text {
    cursor: not-allowed;
  }

  /* What the editor writes, drawn as a reader will see it. */
  .kit-markdown-editor__text > :first-child {
    margin-top: 0;
  }

  .kit-markdown-editor__text > :last-child {
    margin-bottom: 0;
  }

  .kit-markdown-editor__text p,
  .kit-markdown-editor__text ul,
  .kit-markdown-editor__text ol,
  .kit-markdown-editor__text blockquote,
  .kit-markdown-editor__text pre,
  .kit-markdown-editor__text h1,
  .kit-markdown-editor__text h2,
  .kit-markdown-editor__text h3,
  .kit-markdown-editor__text h4,
  .kit-markdown-editor__text h5,
  .kit-markdown-editor__text h6 {
    margin: 0 0 var(--kit-space-xs);
  }

  .kit-markdown-editor__text h1,
  .kit-markdown-editor__text h2,
  .kit-markdown-editor__text h3,
  .kit-markdown-editor__text h4,
  .kit-markdown-editor__text h5,
  .kit-markdown-editor__text h6 {
    font-family: var(--kit-font-heading);
    font-weight: var(--kit-font-weight-strong);
    line-height: var(--kit-line-height-heading);
  }

  .kit-markdown-editor__text h1 {
    font-size: var(--kit-text-size-xl);
  }

  .kit-markdown-editor__text h2 {
    font-size: var(--kit-text-size-lg);
  }

  .kit-markdown-editor__text h3 {
    font-size: var(--kit-text-size-md);
  }

  .kit-markdown-editor__text h4,
  .kit-markdown-editor__text h5,
  .kit-markdown-editor__text h6 {
    font-size: var(--kit-text-size-base);
  }

  .kit-markdown-editor__text ul,
  .kit-markdown-editor__text ol {
    padding-inline-start: var(--kit-space-lg);
  }

  .kit-markdown-editor__text blockquote {
    margin-inline: 0;
    padding-inline-start: var(--kit-space-sm);
    border-inline-start: var(--kit-space-2xs) solid var(--kit-control-border);
  }

  .kit-markdown-editor__text code,
  .kit-markdown-editor__text pre,
  .kit-markdown-editor__source {
    border-radius: var(--kit-radius-sm);
    background: var(--kit-surface-sunken);
    font-family: var(--kit-font-code);
    font-size: var(--kit-text-size-sm);
  }

  .kit-markdown-editor__text code {
    padding: 0 var(--kit-space-2xs);
  }

  .kit-markdown-editor__text pre {
    padding: var(--kit-space-xs) var(--kit-space-sm);
    white-space: pre-wrap;
  }

  .kit-markdown-editor__text pre code {
    padding: 0;
    background: none;
  }

  .kit-markdown-editor__text a {
    color: var(--kit-accent);
  }

  .kit-markdown-editor__text hr {
    border: 0;
    border-block-start: var(--kit-control-border-width) solid var(--kit-hairline);
  }

  /* In Discord every line is its own, with no gap between one and the next. */
  .is-discord .kit-markdown-editor__text p,
  .is-discord .kit-markdown-editor__text ul,
  .is-discord .kit-markdown-editor__text ol,
  .is-discord .kit-markdown-editor__text blockquote {
    margin-block-end: 0;
  }

  .kit-markdown-editor__source {
    padding: 0 var(--kit-space-2xs);
    white-space: pre-wrap;
  }

  .kit-markdown-editor__subtext {
    color: var(--kit-text-muted);
    font-size: var(--kit-text-size-sm);
  }

  .kit-markdown-editor__spoiler {
    border-radius: var(--kit-radius-sm);
    background: var(--kit-surface-sunken);
  }

  /* A token reads as a mention, in the accent, as KitDiscordPreview draws one. */
  .kit-markdown-editor__token {
    white-space: nowrap;
  }

  .kit-markdown-editor__token.is-mention {
    color: var(--kit-accent);
    font-weight: var(--kit-font-weight-strong);
  }

  .kit-markdown-editor__token[class~='ProseMirror-selectednode'] {
    outline: var(--kit-focus-ring-width) solid var(--kit-focus-ring);
    border-radius: var(--kit-radius-sm);
  }

  .kit-markdown-editor__dot {
    width: 0.6em;
    height: 0.6em;
    margin-inline-end: var(--kit-space-2xs);
  }

  .kit-markdown-editor__emoji {
    width: 1.375em;
    height: 1.375em;
    vertical-align: bottom;
    object-fit: contain;
  }

  /* The placeholder, from TipTap's own, in the muted color, which holds AAA. */
  .kit-markdown-editor__text p.is-editor-empty:first-child::before {
    content: attr(data-placeholder);
    float: inline-start;
    height: 0;
    color: var(--kit-text-muted);
    pointer-events: none;
  }

  /* TipTap's base rules, which the kit carries so no <style> is added to the page. */
  .kit-markdown-editor__text [contenteditable='false'] {
    white-space: normal;
  }

  .kit-markdown-editor__text img[class~='ProseMirror-separator'] {
    display: inline;
    width: 0;
    height: 0;
    margin: 0;
    border: 0;
  }

  .kit-markdown-editor__text [class~='ProseMirror-gapcursor'] {
    display: none;
    position: absolute;
    pointer-events: none;
  }

  [class~='ProseMirror-hideselection'] *::selection {
    background: transparent;
  }

  [class~='ProseMirror-hideselection'] * {
    caret-color: transparent;
  }

  .kit-markdown-editor__suggestions {
    position: absolute;
    width: max-content;
    min-width: 12rem;
  }

  .kit-markdown-editor__suggestions .kit-option-list__item {
    padding-inline-start: var(--kit-space-sm);
  }

  .kit-markdown-editor__form {
    display: flex;
    flex-direction: column;
    gap: var(--kit-space-sm);
  }

  .kit-markdown-editor__actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--kit-space-xs);
  }

  .kit-markdown-editor__count {
    align-self: flex-end;
    margin: 0;
    color: var(--kit-text-muted);
    font-size: var(--kit-text-size-sm);
    font-variant-numeric: tabular-nums;
  }

  .kit-markdown-editor__count.is-over {
    color: var(--kit-danger);
    font-weight: var(--kit-font-weight-strong);
  }

  /* Read by a screen reader, never shown: the list and the count say it on screen. */
  .kit-markdown-editor__announcement {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: 0;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
}
</style>
