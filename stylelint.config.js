// Stylelint checks the styles for mistakes and holds the palette rule; it doesn't format
// them (Prettier does). The shared CSS rules (@jwill89/lint-web) apply to the .vue files'
// style blocks as well. A rule is turned off here with its reason, or at the one line it
// doesn't fit with the reason beside it.
import { paletteRules } from '@jwill89/lint-web/stylelint'

// The kit sets no color: a component draws with a color token the app sets, through var().
// Neutral black and white at any alpha (shadows, scrims) are not palette colors and may be
// written inline.
const PALETTE =
  'The kit sets no color: use a color token the app sets, var(--kit-x), or color-mix(in srgb, var(--kit-x) N%, transparent) for a tint; only neutral black/white (rgb(0 0 0 / a), rgb(255 255 255 / a)) may be written inline'

export default {
  extends: ['@jwill89/lint-web/stylelint'],
  rules: {
    ...paletteRules(PALETTE),
    // The shared rule leaves a typeface's name as the foundry writes it inside a --font-*
    // token; the kit's font tokens carry its prefix, so the same exception names them.
    'value-keyword-case': ['lower', { ignoreProperties: ['/^--kit-font-/'] }],
  },
  overrides: [
    {
      // The playground's colors, standing in for an app's own.
      files: ['playground/palette.css'],
      rules: { 'color-no-hex': null },
    },
  ],
}
