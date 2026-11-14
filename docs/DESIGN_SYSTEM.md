# Stillroom Design System — Editorial Darkroom

## Purpose

The Editorial Darkroom direction preserves Stillroom's quiet photography-first character while giving the interface more hierarchy, warmth and tactile feedback. The design should feel like a considered digital darkroom with the typography and restraint of an independent photography journal.

This is a living design reference. The first implementation pass establishes shared tokens and restyles existing components without changing image-processing behaviour.

## Design principles

1. **Photograph first.** The image stage should remain the dominant visual surface.
2. **Warm restraint.** Use ink, walnut and parchment tones with brass accents; avoid generic neon gradients.
3. **Editorial hierarchy.** Serif display headings pair with clear sans-serif controls and compact monospaced metadata.
4. **Tactile tools.** Controls should have clear boundaries, deliberate hover/focus states and consistent dimensions.
5. **Quiet interaction.** Motion is short and purposeful, with reduced-motion preferences respected.
6. **Honest affordances.** Disabled, selected and active states must be distinguishable without relying on colour alone.

## Colour tokens

| Token | Value | Role |
|---|---|---|
| Ink | `#171713` | Main application background |
| Ink raised | `#1D1C17` | Raised surfaces |
| Walnut | `#28251F` | Secondary surfaces |
| Walnut soft | `#302B23` | Hover and grouped surfaces |
| Parchment | `#E9E1D2` | Primary text |
| Parchment muted | `#BDB4A3` | Secondary text |
| Muted | `#8E8779` | Metadata and quiet labels |
| Line | `#403A30` | Default borders |
| Line strong | `#625744` | Emphasized borders |
| Brass | `#C5AD7D` | Primary accent |
| Brass bright | `#DDC99F` | Accent hover and emphasis |
| Terracotta | `#A66F4F` | Reserved warm accent |
| Sage | `#89917B` | Subtle local/success indicator |

These are CSS custom properties in `:root` with the `--sr-` prefix.

## Typography

- **Display/headings:** Georgia or a comparable editorial serif. Use for workspace titles and major panel headings.
- **Controls/body:** Inter/system sans-serif for legibility and predictable metrics.
- **Metadata:** compact monospace with uppercase letter spacing for dimensions, state labels and technical annotations.
- Avoid using uppercase micro-label typography for long explanatory text.

## Surfaces and shape

- Main application surfaces use ink and raised ink.
- Secondary panels use walnut tones; do not make every surface the same shade.
- Borders use warm low-contrast lines; brass is reserved for selected/focused states.
- Small corner radii (3–6px) preserve the editorial/tool character. Avoid excessive pill-shaped controls.
- Use soft, deep shadows for overlays and floating panels, not every card.

## Interaction

- Buttons share predictable height, padding, icon size and alignment within a component group.
- Hover states should brighten the surface and border subtly.
- Disabled controls reduce opacity and must not appear interactive.
- Keyboard focus uses a visible brass focus ring.
- Respect `prefers-reduced-motion`.
- Keep transitions short and limited to colour, border, opacity and small positional feedback.

## Layout

- Main Darkroom: large central image stage with a clearly separated Develop sidebar.
- Exploration: horizontally scrollable grouped action toolbar, generous visual canvas and clear selected-node treatment.
- On narrower screens, the editing layout collapses to one column; side tools move below the image stage.
- Preserve a photograph-first visual hierarchy. Empty states should feel intentional rather than like a missing image.

## Current implementation scope

The foundation pass establishes global CSS tokens and shared visual language in `src/styles.css`.

Stage 2 adds a component-level redesign to the empty Main Darkroom stage in `src/App.jsx`: a two-column editorial welcome composition, a clear local photo-import action, format/privacy microcopy and a restrained photographic-print illustration. The existing hidden file input and `load()` workflow remain the source of import behaviour. The new composition adapts to narrower screens.

Stage 3 redesigns the Look Library card structure and styling. Each look is presented as an editorial print card with a larger thumbnail, serif title, descriptive copy, category label and explicit selected marker. The existing preset catalogue and `apply()` behaviour are retained. Cards remain disabled until a photo is loaded; disabled cards remain visually legible rather than being washed out.

Stage 4 refines the photo-loaded Darkroom stage: a more pronounced warm frame, stronger image-stage header hierarchy, deeper presentation backdrop, larger image canvas allowance, clearer floating zoom controls and a more deliberate transform/crop toolbar. The existing canvas, zoom, compare, import and transform handlers are retained; this stage is visual styling only. The welcome artwork is decorative and does not represent an actual user photo.

## Next design stages

1. Main Darkroom photo-loaded composition and image presentation.
2. Look Library card previews and stronger selection feedback (Stage 3 implemented).
3. Exploration canvas cards, grouping and toolbar hierarchy.
4. Shared control refinement (sliders, inputs, modals and contextual actions).
5. Responsive and accessibility review.

## Validation checklist

- [ ] Run `npm run build`.
- [ ] Check the main workspace with and without an imported photo.
- [ ] Check Looks, Adjust, Pro and AI tabs.
- [ ] Check Exploration toolbar, nodes, dialogs and palette panels.
- [ ] Check focus visibility with keyboard navigation.
- [ ] Check narrow viewport layout.
- [ ] Check reduced-motion preference.
- [ ] Confirm no photo-processing or project persistence behaviour changed.
