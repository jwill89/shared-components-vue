// The toolbar's tools: what each does, in words, the sign drawn when the app gives no icon, and
// whether the text at the cursor already has it. Each dialect and profile shows only what it can
// write, so the Discord dialect has underline and spoilers, CommonMark has a divider, and a
// title's toolbar has its marks alone. An app's own extension brings its own tool.
import type { AnyExtension, Editor } from '@tiptap/core'
import type { KitGlyphName } from '../components/KitGlyph.vue'
import type { KitEditorDialect, KitEditorProfile } from './writer'

export interface KitEditorTool {
  /** Its name, which the slot for its icon takes: `tool-bold`. */
  name: string
  /** What it does, in words, which names its button: "Bold". */
  label: string
  /** The sign its button shows when the app gives no icon. */
  glyph: string
  /** One of the kit's drawn marks, shown in place of `glyph` when the app gives no icon. */
  icon?: KitGlyphName
  /** Runs it on the text at the cursor. */
  run: (editor: Editor) => void
  /** Whether the text at the cursor has it; a tool without one is an action, not a toggle. */
  isActive?: (editor: Editor) => boolean
}

/** One of the app's own pieces, with its tool where it has one. */
export interface KitEditorExtension {
  /** The TipTap extension, and with it, in the CommonMark dialect, its Markdown. */
  extension: AnyExtension
  tool?: KitEditorTool
}

const mark = (
  name: string,
  label: string,
  glyph: string,
  toggle: (editor: Editor) => void,
): KitEditorTool => ({
  name,
  label,
  glyph,
  run: toggle,
  isActive: (editor) => editor.isActive(name),
})

/** A tool drawn with one of the kit's marks. */
function drawn(tool: KitEditorTool, icon: KitGlyphName): KitEditorTool {
  return { ...tool, icon }
}

/** A time goes in where the cursor is, as it stands. */
function keepSelection(): void {
  // Nothing to do before its popover opens.
}

/** The tools the link and time popovers stand behind: the component draws those two itself. */
export const POPOVER_TOOLS = new Set(['link', 'time'])

/** The kit's tools for a dialect and profile, in their groups. */
export function kitTools(
  dialect: KitEditorDialect,
  profile: KitEditorProfile,
  headings: readonly number[],
): KitEditorTool[][] {
  if (profile === 'plain') {
    return []
  }
  const discord = dialect === 'discord'
  const marks = [
    mark('bold', 'Bold', 'B', (e) => e.chain().focus().toggleBold().run()),
    mark('italic', 'Italic', 'I', (e) => e.chain().focus().toggleItalic().run()),
    ...(discord
      ? [mark('underline', 'Underline', 'U', (e) => e.chain().focus().toggleUnderline().run())]
      : []),
    mark('strike', 'Strikethrough', 'S', (e) => e.chain().focus().toggleStrike().run()),
    mark('code', 'Code', '</>', (e) => e.chain().focus().toggleCode().run()),
    ...(discord
      ? [mark('spoiler', 'Spoiler', '||', (e) => e.chain().focus().toggleSpoiler().run())]
      : []),
  ]
  if (profile === 'inline') {
    return [marks]
  }
  const levels = headings.filter((level) => level >= 1 && level <= (discord ? 3 : 6)) as (
    1 | 2 | 3 | 4 | 5 | 6
  )[]
  const blocks: KitEditorTool[] = [
    ...levels.map((level): KitEditorTool => ({
      name: `heading-${String(level)}`,
      label: `Heading ${String(level)}`,
      glyph: `H${String(level)}`,
      run: (e) => e.chain().focus().toggleHeading({ level }).run(),
      isActive: (e) => e.isActive('heading', { level }),
    })),
    ...(discord
      ? [mark('subtext', 'Subtext', '-#', (e) => e.chain().focus().toggleSubtext().run())]
      : []),
    drawn(
      mark('blockquote', 'Quote', '“', (e) => e.chain().focus().toggleBlockquote().run()),
      'quote',
    ),
    drawn(
      mark('bulletList', 'Bulleted list', '•', (e) => e.chain().focus().toggleBulletList().run()),
      'list',
    ),
    drawn(
      mark('orderedList', 'Numbered list', '1.', (e) =>
        e.chain().focus().toggleOrderedList().run(),
      ),
      'list-numbered',
    ),
    mark('codeBlock', 'Code block', '{ }', (e) => e.chain().focus().toggleCodeBlock().run()),
    ...(discord
      ? []
      : [
          {
            name: 'horizontalRule',
            label: 'Divider',
            glyph: '—',
            run: (e: Editor) => e.chain().focus().setHorizontalRule().run(),
          },
        ]),
  ]
  const inserts: KitEditorTool[] = [
    // The component opens its own popover for each of these two.
    {
      name: 'link',
      label: 'Link',
      glyph: 'Link',
      icon: 'link',
      // The whole of a link the cursor is in, so its popover changes all of it.
      run: (e) => e.chain().extendMarkRange('link').run(),
      isActive: (e) => e.isActive('link'),
    },
    ...(discord
      ? [{ name: 'time', label: 'Time', glyph: 'Time', icon: 'clock' as const, run: keepSelection }]
      : []),
  ]
  return [marks, blocks, inserts]
}
