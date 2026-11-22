// The package's `/editor` entry: the Markdown editor, apart from the rest of the kit, so a page
// with no editor never carries TipTap. An app loads it on first use:
//
//   const KitMarkdownEditor = defineAsyncComponent(() =>
//     import('@jwill89/shared-components-vue/editor').then((m) => m.KitMarkdownEditor),
//   )
//
// Its styles are in the kit's one stylesheet, with every other component's.
export { default as KitMarkdownEditor } from './KitMarkdownEditor.vue'
export type { KitEditorExtension, KitEditorTool } from './tools'
export type { KitEditorDialect, KitEditorProfile } from './writer'
export type { KitDiscordSuggest, KitDiscordSuggestion, KitDiscordSuggestionKind } from './suggest'
export type { KitDiscordLookup, KitDiscordNames, KitDiscordRole } from '../discord/tokens'
