<script setup lang="ts">
// An account's passkeys, as its settings list them: each by name, when it was added and last
// signed in, with Rename and Remove; and the button that adds another. A rename asks for the new
// name in a dialog of its own, and a remove asks first, through `confirm()`, which needs a
// KitConfirmHost; each then tells the page, which makes the call to its server and changes the
// list. Adding is the page's: it may ask for the password first, then calls `usePasskeys()`.
// While loading, after a failed load, and with none yet, it says so, and in a browser that can't
// use passkeys it says that and offers no Add. Its icons come from the slots.
import { computed, ref } from 'vue'
import { browserSupportsWebAuthn } from '@simplewebauthn/browser'
import KitButton from './KitButton.vue'
import KitDialog from './KitDialog.vue'
import KitEmptyState from './KitEmptyState.vue'
import KitErrorState from './KitErrorState.vue'
import KitFormField from './KitFormField.vue'
import KitLoadingState from './KitLoadingState.vue'
import KitTextField from './KitTextField.vue'
import KitAlert from './KitAlert.vue'
import { confirm } from '../composables/useConfirmQueue'
import type { KitPasskey } from '../composables/usePasskeys'
import { formatDay } from '../format'
import { filled } from './slots'

const props = withDefaults(
  defineProps<{
    passkeys: KitPasskey[]
    /** What the list is, which names it. */
    label?: string
    /** Whether this browser can use passkeys; it asks the browser by default. */
    supported?: boolean
    loading?: boolean
    /** Why the list couldn't load, in the server's words; it is failed while this is set. */
    error?: string
    /** Whether a passkey is being added, which the Add button shows. */
    adding?: boolean
    /** The longest name a passkey may take. */
    nameMaxLength?: number
    addLabel?: string
    renameLabel?: string
    removeLabel?: string
    loadingLabel?: string
    errorTitle?: string
    emptyTitle?: string
    emptyMessage?: string
    unsupportedText?: string
    renameTitle?: string
    nameLabel?: string
    nameMissingText?: string
    saveLabel?: string
    /** What a row says of when its passkey was added and last used, given each day or nothing. */
    usedText?: (added: string | undefined, used: string | undefined) => string
    /** The question before a remove, given the passkey's name. */
    removeTitle?: (name: string) => string
    removeMessage?: string
  }>(),
  {
    label: 'Passkeys',
    supported: undefined,
    loading: false,
    error: undefined,
    adding: false,
    nameMaxLength: 64,
    addLabel: 'Add a passkey',
    renameLabel: 'Rename',
    removeLabel: 'Remove',
    loadingLabel: 'Loading your passkeys…',
    errorTitle: 'Couldn’t load your passkeys',
    emptyTitle: 'No passkeys yet',
    emptyMessage: 'Add one to sign in without typing your password.',
    unsupportedText: 'This browser can’t use passkeys.',
    renameTitle: 'Rename this passkey',
    nameLabel: 'Name',
    nameMissingText: 'Give it a name.',
    saveLabel: 'Save',
    usedText: (added: string | undefined, used: string | undefined) =>
      [added && `Added ${added}`, `last used ${used ?? 'never'}`].filter(Boolean).join(' · '),
    removeTitle: (name: string) => `Remove “${name}”?`,
    removeMessage:
      'It won’t sign you in any more. Your phone or password manager keeps listing it until you delete it there too.',
  },
)

const emit = defineEmits<{
  /** The person asked to add a passkey. */
  add: []
  /** A passkey is to take a new name. */
  rename: [passkey: KitPasskey, name: string]
  /** A passkey is to be removed, the person having said so. */
  remove: [passkey: KitPasskey]
  /** The person asked to load the list again. */
  retry: []
}>()

const slots = defineSlots<{
  /** Each passkey's icon, before its name. */
  icon?: () => unknown
  /** The Add button's icon. */
  'add-icon'?: () => unknown
}>()

const usable = computed(() => props.supported ?? browserSupportsWebAuthn())

function used(passkey: KitPasskey): string {
  return props.usedText(
    passkey.createdAt ? formatDay(passkey.createdAt) : undefined,
    passkey.lastUsedAt ? formatDay(passkey.lastUsedAt) : undefined,
  )
}

// The passkey being renamed, the name as typed, and what is missing from it.
const renaming = ref<KitPasskey>()
const name = ref('')
const nameError = ref('')
const renameOpen = computed({
  get: () => renaming.value !== undefined,
  set: (open) => {
    if (!open) {
      renaming.value = undefined
    }
  },
})

function startRename(passkey: KitPasskey): void {
  renaming.value = passkey
  name.value = passkey.name
  nameError.value = ''
}

function finishRename(): void {
  const passkey = renaming.value
  const next = name.value.trim()
  if (!passkey) {
    return
  }
  if (!next) {
    nameError.value = props.nameMissingText
    return
  }
  renaming.value = undefined
  if (next !== passkey.name) {
    emit('rename', passkey, next)
  }
}

async function remove(passkey: KitPasskey): Promise<void> {
  const sure = await confirm({
    title: props.removeTitle(passkey.name),
    message: props.removeMessage,
    confirmLabel: props.removeLabel,
    danger: true,
  })
  if (sure) {
    emit('remove', passkey)
  }
}
</script>

<template>
  <div class="kit-passkey-list">
    <KitAlert v-if="!usable" tone="info">{{ unsupportedText }}</KitAlert>
    <KitLoadingState v-else-if="loading" :label="loadingLabel" />
    <KitErrorState v-else-if="error" :title="errorTitle" :message="error" @retry="emit('retry')" />
    <template v-else>
      <KitEmptyState v-if="passkeys.length === 0" :title="emptyTitle" :message="emptyMessage" />
      <ul v-else class="kit-passkey-list__list" :aria-label="label">
        <li v-for="passkey in passkeys" :key="passkey.id" class="kit-passkey-list__row">
          <span v-if="filled(slots.icon)" class="kit-passkey-list__icon" aria-hidden="true">
            <slot name="icon" />
          </span>
          <span class="kit-passkey-list__about">
            <span class="kit-passkey-list__name">{{ passkey.name }}</span>
            <span class="kit-passkey-list__used">{{ used(passkey) }}</span>
          </span>
          <span class="kit-passkey-list__actions">
            <KitButton
              variant="plain"
              size="small"
              :aria-label="`${renameLabel} ${passkey.name}`"
              @click="startRename(passkey)"
            >
              {{ renameLabel }}
            </KitButton>
            <KitButton
              variant="plain"
              size="small"
              :aria-label="`${removeLabel} ${passkey.name}`"
              @click="remove(passkey)"
            >
              {{ removeLabel }}
            </KitButton>
          </span>
        </li>
      </ul>
      <KitButton class="kit-passkey-list__add" :loading="adding" @click="emit('add')">
        <template v-if="filled(slots['add-icon'])" #icon><slot name="add-icon" /></template>
        {{ addLabel }}
      </KitButton>
    </template>

    <KitDialog
      v-model:open="renameOpen"
      :title="renameTitle"
      :submit-label="saveLabel"
      width="narrow"
      @submit="finishRename"
    >
      <KitFormField v-slot="field" :label="nameLabel" :error="nameError">
        <KitTextField v-model="name" v-bind="field" :maxlength="nameMaxLength" />
      </KitFormField>
    </KitDialog>
  </div>
</template>

<style>
@layer kit {
  .kit-passkey-list {
    display: grid;
    gap: var(--kit-space-sm);
    justify-items: start;
  }

  .kit-passkey-list__list {
    box-sizing: border-box;
    width: 100%;
    margin: 0;
    padding: 0;
    border-bottom: var(--kit-control-border-width) solid var(--kit-hairline);
    list-style: none;
  }

  .kit-passkey-list__row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--kit-space-xs) var(--kit-space-sm);
    padding-block: var(--kit-space-xs);
    border-top: var(--kit-control-border-width) solid var(--kit-hairline);
  }

  .kit-passkey-list__icon {
    display: inline-flex;
    color: var(--kit-text-muted);
  }

  .kit-passkey-list__about {
    display: grid;
    flex: 1 1 12rem;
    min-width: 0;
    overflow-wrap: anywhere;
  }

  .kit-passkey-list__name {
    font-weight: var(--kit-font-weight-strong);
  }

  .kit-passkey-list__used {
    color: var(--kit-text-muted);
    font-size: var(--kit-text-size-sm);
  }

  .kit-passkey-list__actions {
    display: flex;
    gap: var(--kit-space-2xs);
  }
}
</style>
