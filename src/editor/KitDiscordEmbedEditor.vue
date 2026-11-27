<script setup lang="ts">
// One Discord embed, edited part by part, in the shape Discord's API takes (`v-model`), so an app
// posts what it holds as it is. Its title is the Markdown editor's `inline` profile, its words and
// each field's value the Discord dialect, its footer the `plain` profile, each counted against
// Discord's own limit, and the whole embed against its 6,000 characters. The color is picked
// with Discord's own colors on offer. The pictures are the app's: it passes the choices
// (`pictures`), each a URL as Discord takes it, and the parts that take one appear with them.
//
// `errors` holds what is wrong with each part, by its place in Discord's shape (`title`,
// `author.name`, `fields[0].value`), as a server that checks the embed reports it. `label` is
// what the page calls the embed, "Embed 1", which the buttons that add and remove its fields
// name it by. The app draws the embed's own heading and any button that removes it.
//
// Given `v-model:components`, the message's rows of buttons in Discord's shape, it edits the
// message's link buttons too, under the embed's parts: each button's words, link and emoji, up to
// `maxButtons`, written back five to a row as Discord lays them out. Their errors go by the same
// places (`components[0].components[1].url`).
import { computed, ref, useId, watch } from 'vue'
import KitButton from '../components/KitButton.vue'
import KitColorField from '../components/KitColorField.vue'
import KitDatePicker from '../components/KitDatePicker.vue'
import KitFormField from '../components/KitFormField.vue'
import KitIconButton from '../components/KitIconButton.vue'
import KitGlyph from '../components/KitGlyph.vue'
import KitSelect from '../components/KitSelect.vue'
import KitSwitch from '../components/KitSwitch.vue'
import KitTextField from '../components/KitTextField.vue'
import {
  DISCORD_BUTTON_LIMITS,
  DISCORD_COLORS,
  DISCORD_EMBED_LIMITS as LIMITS,
  actionRows,
  colorHex,
  colorNumber,
  discordEmbedLength,
  emojiText,
  linkButtons,
  readEmoji,
  tidyEmbed,
  type KitDiscordActionRow,
  type KitDiscordEmbed,
  type KitDiscordEmbedField,
  type KitDiscordLinkButton,
  type KitDiscordPictureChoice,
} from '../discord/embed'
import type { KitDiscordNames } from '../discord/tokens'
import { formatCount } from '../format'
import KitMarkdownEditor from './KitMarkdownEditor.vue'
import type { KitDiscordSuggest } from './suggest'

const props = withDefaults(
  defineProps<{
    /** What the page calls the embed: "Embed 1". */
    label?: string
    /** The pictures the app offers, each by its URL as Discord takes it. */
    pictures?: readonly KitDiscordPictureChoice[]
    /** What each part has wrong, by its place in Discord's shape: `title`, `fields[0].value`. */
    errors?: Readonly<Record<string, string>>
    /** What the mentions in the words name. */
    names?: KitDiscordNames
    /** Asked for suggestions as `@`, `#`, `:` or `/` is typed in the words. */
    suggest?: KitDiscordSuggest
    /** What the color shows while the embed has none of its own. */
    noColorText?: string
    /** The most link buttons the message may hold, with `v-model:components`: Discord takes 25. */
    maxButtons?: number
  }>(),
  {
    maxButtons: DISCORD_BUTTON_LIMITS.perRow,
    label: 'the embed',
    pictures: () => [],
    errors: () => ({}),
    names: () => ({}),
    suggest: undefined,
    noColorText: 'Discord’s own',
  },
)

const model = defineModel<KitDiscordEmbed>({ required: true })
/** The message's rows of buttons; its Buttons part shows only where the page binds this. */
const components = defineModel<KitDiscordActionRow[]>('components')

defineSlots<{
  /** The icon of the button that adds a field. */
  'add-icon'?: () => unknown
  /** The icon of the button that removes a field. */
  'remove-icon'?: () => unknown
}>()

// The embed as last written, so two changes in one tick, before the page passes the first back,
// both land; the page's own value replaces it whenever it changes.
let latest = model.value
watch(model, (embed) => {
  latest = embed
})

/** Changes some of the embed's parts, leaving out any left empty. */
function change(parts: Partial<KitDiscordEmbed>): void {
  latest = tidyEmbed({ ...latest, ...parts })
  model.value = latest
}

function error(part: string): string | undefined {
  return props.errors[part]
}

// -- Pictures -----------------------------------------------------------------------------------
// A select's option can't be empty, which it keeps for "nothing chosen", so None has a value no
// URL can be.
const NO_PICTURE = 'none'
const pictureOptions = computed(() => [
  { value: NO_PICTURE, label: 'None' },
  ...props.pictures.map((picture) => ({ value: picture.url, label: picture.label })),
])

function picked(value: string | number | undefined): string | undefined {
  return typeof value === 'string' && value !== NO_PICTURE ? value : undefined
}

// -- The author and footer, whose parts sit inside one object each ------------------------------
function author(parts: Partial<NonNullable<KitDiscordEmbed['author']>>): void {
  change({ author: { name: '', ...latest.author, ...parts } })
}

function footer(parts: Partial<NonNullable<KitDiscordEmbed['footer']>>): void {
  change({ footer: { text: '', ...latest.footer, ...parts } })
}

// -- The time in the footer: a moment, as Discord takes it, typed in the person's own time zone --
function setTime(moment: string): void {
  change({ timestamp: moment || undefined })
}

// -- Fields ---------------------------------------------------------------------------------------
const fields = computed(() => model.value.fields ?? [])
// Each field keeps its own key, so removing one leaves the others' editors as they were.
let made = 0
const keys = ref<number[]>(fields.value.map(() => made++))
watch(
  () => fields.value.length,
  (count) => {
    while (keys.value.length < count) {
      keys.value.push(made++)
    }
    keys.value.length = count
  },
)

function changeField(index: number, parts: Partial<KitDiscordEmbedField>): void {
  const current = latest.fields ?? []
  change({ fields: current.map((field, at) => (at === index ? { ...field, ...parts } : field)) })
}

function addField(): void {
  keys.value.push(made++)
  change({ fields: [...(latest.fields ?? []), { name: '', value: '', inline: false }] })
}

function removeField(index: number): void {
  keys.value.splice(index, 1)
  change({ fields: (latest.fields ?? []).filter((_, at) => at !== index) })
}

const full = computed(() => fields.value.length >= LIMITS.fields)

// -- The message's link buttons, kept as Discord's rows, five to a row --------------------------
let latestRows = components.value ?? []
watch(components, (rows) => {
  latestRows = rows ?? []
})
const buttons = computed(() => linkButtons(components.value))
let madeButtons = 0
const buttonKeys = ref<number[]>(buttons.value.map(() => madeButtons++))
watch(
  () => buttons.value.length,
  (count) => {
    while (buttonKeys.value.length < count) {
      buttonKeys.value.push(madeButtons++)
    }
    buttonKeys.value.length = count
  },
)

function setButtons(next: KitDiscordLinkButton[]): void {
  latestRows = actionRows(next)
  components.value = latestRows
}

/** Changes a button, leaving out words or an emoji left empty. */
function changeButton(
  index: number,
  parts: { label?: string; url?: string; emoji?: string },
): void {
  setButtons(
    linkButtons(latestRows).map((button, at) => {
      if (at !== index) {
        return button
      }
      const { label, emoji, ...rest } = button
      const words = parts.label ?? label ?? ''
      const sign = parts.emoji === undefined ? emoji : readEmoji(parts.emoji)
      return {
        ...rest,
        url: parts.url ?? button.url,
        ...(words ? { label: words } : {}),
        ...(sign ? { emoji: sign } : {}),
      }
    }),
  )
}

function addButton(): void {
  buttonKeys.value.push(madeButtons++)
  setButtons([...linkButtons(latestRows), { type: 2, style: 5, url: '' }])
}

function removeButton(index: number): void {
  buttonKeys.value.splice(index, 1)
  setButtons(linkButtons(latestRows).filter((_, at) => at !== index))
}

const buttonsFull = computed(() => buttons.value.length >= props.maxButtons)

/** A button's part's error, by its place among Discord's rows. */
function buttonError(index: number, part: string): string | undefined {
  const row = String(Math.floor(index / DISCORD_BUTTON_LIMITS.perRow))
  const place = String(index % DISCORD_BUTTON_LIMITS.perRow)
  return error(`components[${row}].components[${place}].${part}`)
}

/** What a button's emoji box says it takes, bound from here, as vue-tsc reads it (AGENTS.md). */
const EMOJI_HINT = 'An emoji, or one of the server’s own as <:name:id>.'

// -- The whole embed's count --------------------------------------------------------------------
const countId = useId()
const used = computed(() => discordEmbedLength(model.value))
const over = computed(() => used.value > LIMITS.total)
const left = computed(() => LIMITS.total - used.value)
const count = computed(() => {
  const shown = `${formatCount(used.value)} / ${formatCount(LIMITS.total)} characters in ${props.label}`
  return over.value ? `${shown} (${formatCount(-left.value)} over)` : shown
})
const announcement = computed(() => {
  if (left.value > 100) {
    return ''
  }
  return over.value
    ? `${formatCount(-left.value)} characters over Discord’s limit for ${props.label}`
    : `${formatCount(left.value)} characters left in ${props.label}`
})
</script>

<template>
  <div class="kit-discord-embed-editor">
    <div class="kit-discord-embed-editor__row">
      <KitFormField v-slot="field" label="Title" :error="error('title')" group>
        <KitMarkdownEditor
          v-bind="field"
          :model-value="model.title ?? ''"
          dialect="discord"
          profile="inline"
          :limit="LIMITS.title"
          @update:model-value="change({ title: $event })"
        />
      </KitFormField>
      <KitFormField
        v-slot="field"
        label="Title’s link"
        hint="Where the title leads, starting https://. Leave it empty for nowhere."
        :error="error('url')"
      >
        <KitTextField
          v-bind="field"
          :model-value="model.url ?? ''"
          type="url"
          @update:model-value="change({ url: $event })"
        />
      </KitFormField>
    </div>

    <KitFormField
      v-slot="field"
      label="Words"
      hint="Discord’s formatting works here. A mention in an embed pings nobody."
      :error="error('description')"
      group
    >
      <KitMarkdownEditor
        v-bind="field"
        :model-value="model.description ?? ''"
        dialect="discord"
        :names="names"
        :suggest="suggest"
        :limit="LIMITS.description"
        @update:model-value="change({ description: $event })"
      />
    </KitFormField>

    <div class="kit-discord-embed-editor__row">
      <KitFormField
        v-slot="field"
        label="Author"
        hint="The small line above the title."
        :error="error('author.name')"
      >
        <KitTextField
          v-bind="field"
          :model-value="model.author?.name ?? ''"
          @update:model-value="author({ name: $event })"
        />
      </KitFormField>
      <KitFormField
        v-slot="field"
        label="Author’s link"
        hint="Where the author leads, starting https://."
        :error="error('author.url')"
      >
        <KitTextField
          v-bind="field"
          :model-value="model.author?.url ?? ''"
          type="url"
          @update:model-value="author({ url: $event })"
        />
      </KitFormField>
      <KitFormField
        v-if="pictures.length"
        v-slot="field"
        label="Author’s picture"
        :error="error('author.icon_url')"
      >
        <KitSelect
          v-bind="field"
          :model-value="model.author?.icon_url ?? NO_PICTURE"
          :options="pictureOptions"
          @update:model-value="author({ icon_url: picked($event) })"
        />
      </KitFormField>
    </div>

    <KitFormField
      v-slot="field"
      label="Color"
      hint="The bar down the embed’s side."
      :error="error('color')"
    >
      <KitColorField
        v-bind="field"
        :model-value="colorHex(model.color)"
        :presets="DISCORD_COLORS"
        presets-label="Discord’s colors"
        :none-text="noColorText"
        :clear-label="`Clear the color of ${label}`"
        @update:model-value="change({ color: colorNumber($event) })"
      />
    </KitFormField>

    <div v-if="pictures.length" class="kit-discord-embed-editor__row">
      <KitFormField
        v-slot="field"
        label="Picture, large"
        hint="Shown across the embed."
        :error="error('image.url')"
      >
        <KitSelect
          v-bind="field"
          :model-value="model.image?.url ?? NO_PICTURE"
          :options="pictureOptions"
          @update:model-value="
            change({ image: picked($event) ? { url: picked($event) ?? '' } : undefined })
          "
        />
      </KitFormField>
      <KitFormField
        v-slot="field"
        label="Picture, small"
        hint="Shown in the embed’s corner."
        :error="error('thumbnail.url')"
      >
        <KitSelect
          v-bind="field"
          :model-value="model.thumbnail?.url ?? NO_PICTURE"
          :options="pictureOptions"
          @update:model-value="
            change({ thumbnail: picked($event) ? { url: picked($event) ?? '' } : undefined })
          "
        />
      </KitFormField>
    </div>

    <div
      class="kit-discord-embed-editor__fields"
      role="group"
      :aria-labelledby="`${countId}-fields`"
    >
      <span :id="`${countId}-fields`" class="kit-discord-embed-editor__caption">Fields</span>
      <p v-if="error('fields')" class="kit-discord-embed-editor__error">{{ error('fields') }}</p>
      <ol v-if="fields.length" class="kit-discord-embed-editor__list">
        <li v-for="(item, at) in fields" :key="keys[at]" class="kit-discord-embed-editor__field">
          <KitFormField
            v-slot="field"
            :label="`Field ${at + 1}’s name`"
            :error="error(`fields[${at}].name`)"
            group
            required
          >
            <KitMarkdownEditor
              v-bind="field"
              :model-value="item.name"
              dialect="discord"
              profile="inline"
              :limit="LIMITS.fieldName"
              @update:model-value="changeField(at, { name: $event })"
            />
          </KitFormField>
          <KitFormField
            v-slot="field"
            :label="`Field ${at + 1}’s words`"
            :error="error(`fields[${at}].value`)"
            group
            required
          >
            <KitMarkdownEditor
              v-bind="field"
              :model-value="item.value"
              dialect="discord"
              :names="names"
              :suggest="suggest"
              :limit="LIMITS.fieldValue"
              @update:model-value="changeField(at, { value: $event })"
            />
          </KitFormField>
          <div class="kit-discord-embed-editor__field-actions">
            <KitFormField v-slot="field" :label="`Field ${at + 1} beside its neighbours`">
              <KitSwitch
                v-bind="field"
                :model-value="Boolean(item.inline)"
                @update:model-value="changeField(at, { inline: $event })"
              />
            </KitFormField>
            <KitButton variant="quiet" @click="removeField(at)">
              <template #icon
                ><slot name="remove-icon"><KitGlyph name="cross" /></slot
              ></template>
              Remove field {{ at + 1 }}
              <span class="kit-discord-embed-editor__hidden">of {{ label }}</span>
            </KitButton>
          </div>
        </li>
      </ol>
      <div class="kit-discord-embed-editor__add">
        <KitButton :disabled="full" @click="addField">
          <template #icon
            ><slot name="add-icon"><KitGlyph name="plus" /></slot
          ></template>
          Add a field <span class="kit-discord-embed-editor__hidden">to {{ label }}</span>
        </KitButton>
        <span v-if="full" class="kit-discord-embed-editor__note">
          An embed holds at most {{ LIMITS.fields }} fields.
        </span>
      </div>
    </div>

    <div class="kit-discord-embed-editor__row">
      <KitFormField
        v-slot="field"
        label="Footer"
        hint="The small line under everything."
        :error="error('footer.text')"
        group
      >
        <KitMarkdownEditor
          v-bind="field"
          :model-value="model.footer?.text ?? ''"
          dialect="discord"
          profile="plain"
          :limit="LIMITS.footer"
          @update:model-value="footer({ text: $event })"
        />
      </KitFormField>
      <KitFormField
        v-if="pictures.length"
        v-slot="field"
        label="Footer’s picture"
        :error="error('footer.icon_url')"
      >
        <KitSelect
          v-bind="field"
          :model-value="model.footer?.icon_url ?? NO_PICTURE"
          :options="pictureOptions"
          @update:model-value="footer({ icon_url: picked($event) })"
        />
      </KitFormField>
    </div>

    <div class="kit-discord-embed-editor__row kit-discord-embed-editor__time">
      <KitFormField
        v-slot="field"
        label="Time in the footer"
        hint="Typed in your own time zone; each reader sees it on their own clock."
        :error="error('timestamp')"
        group
      >
        <KitDatePicker
          v-bind="field"
          :model-value="model.timestamp ?? ''"
          time
          @update:model-value="setTime($event)"
        />
      </KitFormField>
      <KitIconButton
        v-if="model.timestamp"
        class="kit-discord-embed-editor__clear-time"
        :label="`Clear the time of ${label}`"
        variant="plain"
        @click="setTime('')"
      >
        <slot name="remove-icon"><KitGlyph name="cross" /></slot>
      </KitIconButton>
    </div>

    <div
      v-if="components !== undefined"
      class="kit-discord-embed-editor__fields"
      role="group"
      :aria-labelledby="`${countId}-buttons`"
      :aria-describedby="`${countId}-buttons-about`"
    >
      <span :id="`${countId}-buttons`" class="kit-discord-embed-editor__caption">Buttons</span>
      <p :id="`${countId}-buttons-about`" class="kit-discord-embed-editor__note">
        Links under the message, each opening where it leads.
      </p>
      <p v-if="error('components')" class="kit-discord-embed-editor__error">
        {{ error('components') }}
      </p>
      <ol v-if="buttons.length" class="kit-discord-embed-editor__list">
        <li
          v-for="(button, at) in buttons"
          :key="buttonKeys[at]"
          class="kit-discord-embed-editor__field"
        >
          <div class="kit-discord-embed-editor__row">
            <KitFormField
              v-slot="field"
              :label="`Button ${at + 1}’s words`"
              :error="buttonError(at, 'label')"
            >
              <KitTextField
                v-bind="field"
                :model-value="button.label ?? ''"
                :maxlength="DISCORD_BUTTON_LIMITS.label"
                @update:model-value="changeButton(at, { label: $event })"
              />
            </KitFormField>
            <KitFormField
              v-slot="field"
              :label="`Button ${at + 1}’s link`"
              :error="buttonError(at, 'url')"
              required
            >
              <KitTextField
                v-bind="field"
                :model-value="button.url"
                type="url"
                :maxlength="DISCORD_BUTTON_LIMITS.url"
                @update:model-value="changeButton(at, { url: $event })"
              />
            </KitFormField>
            <KitFormField
              v-slot="field"
              :label="`Button ${at + 1}’s emoji`"
              :hint="EMOJI_HINT"
              :error="buttonError(at, 'emoji')"
            >
              <KitTextField
                v-bind="field"
                :model-value="emojiText(button.emoji)"
                @update:model-value="changeButton(at, { emoji: $event })"
              />
            </KitFormField>
          </div>
          <div class="kit-discord-embed-editor__field-actions">
            <KitButton variant="quiet" @click="removeButton(at)">
              <template #icon
                ><slot name="remove-icon"><KitGlyph name="cross" /></slot
              ></template>
              Remove button {{ at + 1 }}
            </KitButton>
          </div>
        </li>
      </ol>
      <div class="kit-discord-embed-editor__add">
        <KitButton :disabled="buttonsFull" @click="addButton">
          <template #icon
            ><slot name="add-icon"><KitGlyph name="plus" /></slot
          ></template>
          Add a button
        </KitButton>
        <span v-if="buttonsFull" class="kit-discord-embed-editor__note">
          A message holds at most {{ maxButtons }} buttons here.
        </span>
      </div>
    </div>

    <p class="kit-discord-embed-editor__count" :class="{ 'is-over': over }">{{ count }}</p>
    <p class="kit-discord-embed-editor__hidden" aria-live="polite">{{ announcement }}</p>
  </div>
</template>

<style>
@layer kit {
  .kit-discord-embed-editor {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: var(--kit-space-md);
    min-width: 0;
  }

  .kit-discord-embed-editor__row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 14rem), 1fr));
    gap: var(--kit-space-md);
    align-items: start;
  }

  .kit-discord-embed-editor__time {
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 12rem), max-content));
    align-items: end;
  }

  .kit-discord-embed-editor__fields {
    display: flex;
    flex-direction: column;
    gap: var(--kit-space-sm);
  }

  .kit-discord-embed-editor__caption {
    font-weight: var(--kit-font-weight-strong);
  }

  .kit-discord-embed-editor__error {
    margin: 0;
    color: var(--kit-danger);
    font-size: var(--kit-text-size-sm);
  }

  .kit-discord-embed-editor__list {
    display: grid;
    gap: var(--kit-space-sm);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .kit-discord-embed-editor__field {
    display: flex;
    flex-direction: column;
    gap: var(--kit-space-sm);
    padding: var(--kit-space-sm);
    border: var(--kit-control-border-width) solid var(--kit-control-border);
    border-radius: var(--kit-radius-md);
  }

  .kit-discord-embed-editor__field-actions,
  .kit-discord-embed-editor__add {
    display: flex;
    flex-wrap: wrap;
    align-items: end;
    justify-content: space-between;
    gap: var(--kit-space-sm);
  }

  .kit-discord-embed-editor__add {
    justify-content: start;
    align-items: center;
  }

  .kit-discord-embed-editor__note {
    color: var(--kit-text-muted);
    font-size: var(--kit-text-size-sm);
  }

  .kit-discord-embed-editor__count {
    align-self: flex-end;
    margin: 0;
    color: var(--kit-text-muted);
    font-size: var(--kit-text-size-sm);
    font-variant-numeric: tabular-nums;
  }

  .kit-discord-embed-editor__count.is-over {
    color: var(--kit-danger);
    font-weight: var(--kit-font-weight-strong);
  }

  /* Read by a screen reader, never shown. */
  .kit-discord-embed-editor__hidden {
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
