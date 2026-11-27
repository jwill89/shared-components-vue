<script setup lang="ts">
// Files to send, inside a `group` KitFormField, whose caption says what they are for:
// `<KitFileField v-model="pictures" v-bind="field" :accept="pictureKinds" :max-size="10485760" multiple :max-files="8" />`.
// Its value is the files chosen, as a list, which holds one at most unless `multiple`. A button
// opens the device's own file picker, where `capture` asks a phone for its camera; given `drop`,
// the button is drawn as a wide zone that files can also be dropped on, and is still a button,
// so it opens the picker by key or click as well.
//
// Under the button a line says what it takes (the kinds, their size, how many), and the button
// is described by it. A file of a kind it doesn't take, one too large, or more than fit, is
// refused, each in words saying why, which a screen reader hears at once; the rest are added,
// and it hears that too. A choice in a field of one replaces the file there. Each file is listed
// with its size and a Remove button that names it, and, given `previews`, a picture is shown
// small beside it; removing one moves focus to the next file's Remove, or back to the button.
// The server checks every file again: these checks only save a wasted upload.
import { computed, nextTick, onBeforeUnmount, ref, useId, useTemplateRef, watch } from 'vue'
import KitButton from './KitButton.vue'
import { announce } from '../composables/useAnnouncer'
import { formatBytes, formatCount, formatList } from '../format'

/**
 * A kind of file the field takes: its `type`, a MIME type ("image/png"), a family of them
 * ("image/*") or a name's ending (".csv"), and its `name` in words, as the field writes it: "PNG".
 */
export interface KitFileKind {
  type: string
  name: string
}

const props = withDefaults(
  defineProps<{
    id?: string
    /** The caption's id, which names the field: from a `group` KitFormField. */
    labelledBy?: string
    /** The ids of the text that describes the field: its error and hint, from KitFormField. */
    describedBy?: string
    invalid?: boolean
    disabled?: boolean
    /** The kinds of file it takes; any, when none is given. */
    accept?: KitFileKind[]
    /** The most bytes a file may hold. */
    maxSize?: number
    /** Whether it holds several files. */
    multiple?: boolean
    /** The most files it holds, where it holds several. */
    maxFiles?: number
    /** Which camera a phone opens for the picker: the one facing the person, or the other. */
    capture?: 'user' | 'environment'
    /** Draws the button as a wide zone files can be dropped on. */
    drop?: boolean
    /** Shows each picture small beside its name. */
    previews?: boolean
    /** The button's words, in place of "Choose a file" or "Choose files". */
    chooseLabel?: string
  }>(),
  {
    id: undefined,
    labelledBy: undefined,
    describedBy: undefined,
    invalid: false,
    disabled: false,
    accept: () => [],
    maxSize: Infinity,
    multiple: false,
    maxFiles: Infinity,
    capture: undefined,
    drop: false,
    previews: false,
    chooseLabel: undefined,
  },
)

const model = defineModel<File[]>({ required: true })

const madeId = useId()
const fieldId = computed(() => props.id ?? madeId)
const limitsId = computed(() => `${fieldId.value}-limits`)
const picker = useTemplateRef<HTMLInputElement>('picker')
const list = useTemplateRef<HTMLElement>('list')

const room = computed(() => (props.multiple ? props.maxFiles : 1))
const kinds = computed(() =>
  formatList(
    props.accept.map((kind) => kind.name),
    'disjunction',
  ),
)

const words = computed(() => {
  if (props.chooseLabel) {
    return props.chooseLabel
  }
  if (props.drop) {
    return props.multiple ? 'Choose files, or drop them here' : 'Choose a file, or drop it here'
  }
  return props.multiple ? 'Choose files' : 'Choose a file'
})

/** What the field takes, in words: "PNG or JPEG, up to 10 MB each. Up to 8 files." */
const limits = computed(() => {
  const parts: string[] = []
  if (props.accept.length) {
    parts.push(kinds.value)
  }
  if (Number.isFinite(props.maxSize)) {
    parts.push(`up to ${formatBytes(props.maxSize)}${props.multiple ? ' each' : ''}`)
  }
  const sentences = parts.length ? [capitalized(parts.join(', '))] : []
  if (props.multiple && Number.isFinite(props.maxFiles)) {
    sentences.push(`Up to ${formatCount(props.maxFiles)} files`)
  }
  return sentences.map((sentence) => `${sentence}.`).join(' ')
})

function capitalized(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/** Why the last files chosen were refused, in words; empty when none was. */
const refused = ref('')

/** Whether a file is of a kind the field takes. */
function takes(file: File): boolean {
  if (!props.accept.length) {
    return true
  }
  const name = file.name.toLowerCase()
  return props.accept.some(({ type }) => {
    const wanted = type.toLowerCase()
    if (wanted.startsWith('.')) {
      return name.endsWith(wanted)
    }
    if (wanted.endsWith('/*')) {
      return file.type.toLowerCase().startsWith(wanted.slice(0, -1))
    }
    return file.type.toLowerCase() === wanted
  })
}

/** Adds what fits of the files chosen or dropped, and says why the rest were refused. */
function add(chosen: readonly File[]): void {
  if (props.disabled || chosen.length === 0) {
    return
  }
  const reasons: string[] = []
  const fitting: File[] = []
  for (const file of chosen) {
    if (!takes(file)) {
      reasons.push(`${file.name} isn’t a ${kinds.value} file.`)
    } else if (file.size > props.maxSize) {
      reasons.push(
        `${file.name} is ${formatBytes(file.size)}; the most a file can be is ${formatBytes(props.maxSize)}.`,
      )
    } else {
      fitting.push(file)
    }
  }
  const kept = props.multiple ? model.value : []
  const space = Math.max(room.value - kept.length, 0)
  const added = fitting.slice(0, space)
  const left = fitting.length - added.length
  if (left > 0) {
    reasons.push(
      `Only ${formatCount(room.value)} files fit, so ${formatCount(left)} ${left === 1 ? 'was' : 'were'} left out.`,
    )
  }
  refused.value = reasons.join(' ')
  if (added.length) {
    model.value = [...kept, ...added]
    announce(
      `${formatList(
        added.map((file) => file.name),
        'conjunction',
      )} added.`,
      'polite',
    )
  }
}

function choose(): void {
  picker.value?.click()
}

function picked(event: Event): void {
  const input = event.target as HTMLInputElement
  add([...(input.files ?? [])])
  // Emptied, so the same file chosen again is a change the picker reports.
  input.value = ''
}

// Whether files are being dragged over the zone, which shows where they will land.
const dropping = ref(false)

function dragOver(event: DragEvent): void {
  if (props.disabled) {
    return
  }
  event.preventDefault()
  dropping.value = true
}

function dragLeave(event: DragEvent): void {
  const zone = event.currentTarget as HTMLElement
  if (!zone.contains(event.relatedTarget as Node | null)) {
    dropping.value = false
  }
}

function dropped(event: DragEvent): void {
  event.preventDefault()
  dropping.value = false
  add([...(event.dataTransfer?.files ?? [])])
}

/** Takes a file out, and moves focus to the next file's Remove, the last one's, or the button. */
async function remove(at: number): Promise<void> {
  const file = model.value[at]
  if (!file) {
    return
  }
  model.value = model.value.filter((_, index) => index !== at)
  refused.value = ''
  announce(`${file.name} removed.`, 'polite')
  await nextTick()
  const removes = list.value?.querySelectorAll<HTMLElement>('.kit-file-field__remove') ?? []
  const next = removes[Math.min(at, removes.length - 1)]
  if (next) {
    next.focus()
  } else {
    document.getElementById(`${fieldId.value}-choose`)?.focus()
  }
}

// A preview's address, made once for each picture shown and given back once it goes.
const addresses = new Map<File, string>()
const pictureAddresses = ref(new Map<File, string>())

watch(
  [model, () => props.previews],
  ([files, previews]) => {
    const shown = new Set(previews ? files.filter((f) => f.type.startsWith('image/')) : [])
    for (const [file, address] of addresses) {
      if (!shown.has(file)) {
        URL.revokeObjectURL(address)
        addresses.delete(file)
      }
    }
    for (const file of shown) {
      if (!addresses.has(file)) {
        addresses.set(file, URL.createObjectURL(file))
      }
    }
    pictureAddresses.value = new Map(addresses)
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  for (const address of addresses.values()) {
    URL.revokeObjectURL(address)
  }
  addresses.clear()
})
</script>

<template>
  <div
    :id="fieldId"
    role="group"
    class="kit-file-field"
    :class="{ 'is-invalid': invalid }"
    :aria-labelledby="labelledBy"
    :aria-describedby="describedBy"
  >
    <input
      ref="picker"
      type="file"
      hidden
      :aria-label="words"
      :accept="accept.map((kind) => kind.type).join(',') || undefined"
      :multiple="multiple"
      :capture="capture"
      @change="picked"
    />
    <button
      v-if="drop"
      :id="`${fieldId}-choose`"
      type="button"
      class="kit-file-field__zone"
      :class="{ 'is-dropping': dropping }"
      :disabled="disabled"
      :aria-describedby="limits ? limitsId : undefined"
      @click="choose"
      @dragenter="dragOver"
      @dragover="dragOver"
      @dragleave="dragLeave"
      @drop="dropped"
    >
      {{ words }}
    </button>
    <KitButton
      v-else
      :id="`${fieldId}-choose`"
      class="kit-file-field__choose"
      :disabled="disabled"
      :aria-describedby="limits ? limitsId : undefined"
      @click="choose"
    >
      {{ words }}
    </KitButton>
    <p v-if="limits" :id="limitsId" class="kit-file-field__limits">{{ limits }}</p>
    <p class="kit-file-field__refused" role="alert">{{ refused }}</p>
    <ul v-if="model.length" ref="list" class="kit-file-field__files">
      <li
        v-for="(file, at) in model"
        :key="`${file.name}-${String(at)}`"
        class="kit-file-field__file"
      >
        <img
          v-if="pictureAddresses.get(file)"
          :src="pictureAddresses.get(file)"
          alt=""
          class="kit-file-field__preview"
        />
        <span class="kit-file-field__name">{{ file.name }}</span>
        <span class="kit-file-field__size">{{ formatBytes(file.size) }}</span>
        <KitButton variant="plain" class="kit-file-field__remove" @click="remove(at)">
          Remove<span class="kit-file-field__hidden">{{ ` ${file.name}` }}</span>
        </KitButton>
      </li>
    </ul>
  </div>
</template>

<style scoped>
/*
 * The zone is a button as wide as the field, its edge dashed so it reads as a place to drop
 * something. A hover takes a plain button's 6% wash of the text color; files held over it take
 * the 12% of the accent an open list's highlighted option takes, with a solid accent edge, each
 * of which contrast.ts measures.
 */
@layer kit {
  .kit-file-field {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--kit-space-xs);
    min-width: 0;
  }

  .kit-file-field__zone {
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    min-height: 6rem;
    padding: var(--kit-space-md);
    border: 2px dashed var(--kit-control-border);
    border-radius: var(--kit-radius-md);
    background: var(--kit-surface-raised);
    color: var(--kit-text);
    font: inherit;
    font-weight: var(--kit-font-weight-strong);
    text-align: center;
    cursor: pointer;
    transition: background-color var(--kit-duration-quick) ease;
  }

  .kit-file-field__zone:focus-visible {
    outline: var(--kit-focus-ring-width) solid var(--kit-focus-ring);
    outline-offset: var(--kit-focus-ring-offset);
  }

  .kit-file-field__zone:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }

  .kit-file-field__zone:hover:not(:disabled) {
    background: color-mix(in srgb, var(--kit-surface-raised) 94%, var(--kit-text));
  }

  .kit-file-field__zone.is-dropping {
    border-style: solid;
    border-color: var(--kit-accent);
    background: color-mix(in srgb, var(--kit-surface-raised) 88%, var(--kit-accent));
  }

  .kit-file-field.is-invalid .kit-file-field__zone {
    border-color: var(--kit-danger);
  }

  .kit-file-field__limits,
  .kit-file-field__refused {
    max-width: var(--kit-measure-prose);
    margin: 0;
    font-size: var(--kit-text-size-sm);
  }

  .kit-file-field__limits {
    color: var(--kit-text-muted);
  }

  .kit-file-field__refused {
    color: var(--kit-danger);
  }

  .kit-file-field__refused:empty {
    display: none;
  }

  .kit-file-field__files {
    display: grid;
    gap: var(--kit-space-2xs);
    width: 100%;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .kit-file-field__file {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto auto;
    align-items: center;
    gap: var(--kit-space-xs);
  }

  .kit-file-field__preview {
    grid-column: 1;
    width: 3rem;
    height: 3rem;
    border-radius: var(--kit-radius-sm);
    object-fit: cover;
  }

  .kit-file-field__name {
    grid-column: 2;
    overflow-wrap: anywhere;
  }

  .kit-file-field__size {
    color: var(--kit-text-muted);
    font-size: var(--kit-text-size-sm);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  /* Read by a screen reader with the Remove it follows, never shown: the row says which file. */
  .kit-file-field__hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }

  @media (prefers-reduced-motion: reduce) {
    .kit-file-field__zone {
      transition: none;
    }
  }
}
</style>
