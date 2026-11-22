// What the Discord dialect suggests as a person types: `@` a member or a role, `#` a channel, `:`
// an emoji and `/` a command, each asked of the app's `suggest` with what has been typed since,
// so a server with thousands of members is searched rather than listed whole. The choice goes in
// as its token. The list itself is the component's to draw; this keeps it in step with the text.
import { Extension, type Editor, type Range } from '@tiptap/core'
import { PluginKey } from '@tiptap/pm/state'
import { Suggestion } from '@tiptap/suggestion'
import { writeToken } from '../discord/tokens'

export type KitDiscordSuggestionKind = 'member' | 'role' | 'channel' | 'emoji' | 'command'

/** Something of the server's to put in the text. */
export interface KitDiscordSuggestion {
  kind: KitDiscordSuggestionKind
  /** Its id. An emoji of Unicode's own has none, and `text` holds it. */
  id: string
  /** Its name: "Sam", "general", "wave", "ping". */
  name: string
  /** A role's color, as Discord's number for it. */
  color?: number
  /** A custom emoji's picture. */
  image?: string
  /** Whether a custom emoji moves. */
  animated?: boolean
  /** An emoji of Unicode's own, which goes in as itself: "👋". */
  text?: string
}

/** Asked as a person types: what of `kind` matches `query`, best first. */
export type KitDiscordSuggest = (
  kind: KitDiscordSuggestionKind,
  query: string,
) => readonly KitDiscordSuggestion[] | Promise<readonly KitDiscordSuggestion[]>

/** The list as it stands, for the component to draw. */
export interface SuggestionList {
  items: readonly KitDiscordSuggestion[]
  /** Where the typed mark sits on screen, which the list opens under. */
  rect: DOMRect | null
  choose: (item: KitDiscordSuggestion) => void
}

/** What each mark asks for. */
const TRIGGERS: readonly [string, readonly KitDiscordSuggestionKind[]][] = [
  ['@', ['member', 'role']],
  ['#', ['channel']],
  [':', ['emoji']],
  ['/', ['command']],
]

/** The most a list holds. */
const MOST = 10

export interface SuggestionOptions {
  suggest: () => KitDiscordSuggest | undefined
  /** The list, as it opens, changes and closes (null). */
  onList: (list: SuggestionList | null) => void
  /** A key pressed while the list is open; true when the list used it. */
  onKey: (event: KeyboardEvent) => boolean
  /** A choice, as it goes into the text. */
  onChoose: (item: KitDiscordSuggestion) => void
}

/** What a choice puts in the text: its token, or an emoji of Unicode's own as itself. */
function insertion(item: KitDiscordSuggestion): string | null {
  if (item.kind === 'emoji') {
    return (
      item.text ??
      (item.id
        ? writeToken({
            kind: 'emoji',
            id: item.id,
            name: item.name,
            animated: Boolean(item.animated),
          })
        : null)
    )
  }
  if (item.kind === 'command') {
    return writeToken({ kind: 'command', id: item.id, name: item.name })
  }
  return writeToken({ kind: item.kind, id: item.id })
}

function choose(editor: Editor, range: Range, item: KitDiscordSuggestion): void {
  const raw = insertion(item)
  if (raw === null) {
    return
  }
  const piece =
    item.kind === 'emoji' && item.text
      ? { type: 'text', text: raw }
      : { type: 'discordToken', attrs: { raw } }
  editor
    .chain()
    .focus()
    .insertContentAt(range, [piece, { type: 'text', text: ' ' }])
    .run()
}

export function discordSuggestions(options: SuggestionOptions): Extension {
  return Extension.create({
    name: 'kitDiscordSuggestions',
    addProseMirrorPlugins() {
      return TRIGGERS.map(([char, kinds]) =>
        Suggestion<KitDiscordSuggestion, KitDiscordSuggestion>({
          editor: this.editor,
          char,
          pluginKey: new PluginKey(`kitSuggest${char}`),
          items: async ({ query }) => {
            const suggest = options.suggest()
            // An emoji is asked for once two letters of its name are typed, as Discord does.
            if (!suggest || (char === ':' && query.length < 2)) {
              return []
            }
            const found = await Promise.all(kinds.map(async (kind) => suggest(kind, query)))
            return found.flat().slice(0, MOST)
          },
          command: ({ editor, range, props }) => {
            options.onChoose(props)
            choose(editor, range, props)
          },
          render: () => {
            const show = (props: {
              items: KitDiscordSuggestion[]
              clientRect?: (() => DOMRect | null) | null
              command: (item: KitDiscordSuggestion) => void
            }): void => {
              options.onList(
                props.items.length
                  ? {
                      items: props.items,
                      rect: props.clientRect?.() ?? null,
                      choose: props.command,
                    }
                  : null,
              )
            }
            return {
              onStart: show,
              onUpdate: show,
              onExit: () => {
                options.onList(null)
              },
              onKeyDown: ({ event }) => options.onKey(event),
            }
          },
        }),
      )
    },
  })
}
