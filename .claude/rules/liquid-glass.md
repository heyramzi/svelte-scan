---
paths:
  - "**/*.swift"
---
<!-- vibekit:rule -->
<!-- Generated from vibe-kit/ai-doc/rules/. Edit there, then run: node vibe-kit/ai-doc/scripts/sync-agents-core.cjs -->

# Liquid Glass, heights and contrast (iOS 26+, macOS 26+)

A send button that isn't round and tabs that sit short both come from a control drawn by hand where the system already draws it right.

- **System glass first.** `.buttonStyle(.glass)` / `.glassProminent`, a native `TabView`, `.toolbar`, `.searchable`, `Picker(.segmented)`. Hand-roll glass only where no system control exists, and then through the project's one glass helper.
- **An icon button is a circle by construction**: `.buttonBorderShape(.circle)` plus a fixed square frame from a token. A glass style left to guess its shape pads into a capsule, which is how a round send button ends up an oval.
- **Never glass on glass.** A button inside a glass field gets a plain or prominent style, not a second glass layer. Several glass shapes side by side go in one `GlassEffectContainer` so they blend.
- **No hand-drawn shadows or borders on glass.** The material draws its own depth. A `.shadow` under glass is the "broken shadow" look.
- **Controls in the same row share one height token**, from the project's controls file. A literal `44` or `52` in a view is a bug waiting to drift. Segmented pickers get `.controlSize(.large)`.
- **Hit targets: 44pt minimum on iOS**, measured on the content shape, not the glyph.
- **Contrast: WCAG AA**, 4.5:1 for text and 3:1 for glyphs, checked against the glass over the *lightest and darkest* thing that can scroll under it. Tinted text on glass (blue links, orange warnings) is where it fails first.
- **Dynamic Type to AX5** without clipping: no fixed heights on text containers, `ViewThatFits` or a vertical fallback for rows.
- **Reduce Transparency and Increase Contrast** get a solid fallback. Glass does most of this itself, so a custom material needs `@Environment(\.accessibilityReduceTransparency)`.
- **A zoom transition names its source before the glass**, never after, or it falls back to the old rectangle zoom.
