# Stillroom — Next-generation roadmap

## Product direction

**Hybrid creative studio, local-first intelligence, balanced visual creativity and editing control.**

Stillroom combines professional photo finishing, expressive film-inspired effects and social-ready creative output. Core editing remains offline: no account, backend, upload or mandatory AI service.

## Delivered in this release

- **Vibe Studio (offline):** prompt-to-recipe matching against built-in looks, plus six curated creative directions. This is a deterministic local recipe matcher, not a generative AI model.
- **Hue shift and vibrance:** additional colour-grading controls in the Adjust panel and Canvas renderer.
- **Existing workflow:** 24 looks, live photo thumbnails, custom saved looks, rotation, flip, centered aspect-ratio crops, undo/redo and full-resolution export remain part of the product.

## Next releases

### Phase 1 — Editing foundations
- HSL mixer with per-colour hue, saturation and luminance.
- RGB tone curves and colour wheels.
- Non-destructive adjustment stack and reliable history.
- Freeform crop, straighten and perspective correction.
- Recipe import/export as portable JSON.

### Phase 2 — Selective and intelligent editing
- Brush, linear and radial masks.
- On-device subject segmentation using an optional downloadable model.
- Local photo analysis and explainable look recommendations.
- Portrait retouching with conservative, adjustable controls.

### Phase 3 — Social design studio
- Typography and text layout overlays.
- Social canvas sizes for posts, stories, covers and wallpapers.
- Collage, photo strips, contact sheets and border treatments.
- Export presets and batch processing.

### Phase 4 — Experimental creative lab
- Lens effects, prism, halation, bokeh and advanced texture layers.
- Look Battles with true side-by-side variants.
- Reusable layer-based effect recipes.
- Daily offline creative prompts.

## Architecture principles

- React + Vite interface.
- Canvas 2D for current rendering; move expensive effects to WebGL/WebGPU incrementally.
- IndexedDB for larger local projects and asset metadata; localStorage only for small preferences.
- Optional ONNX Runtime Web models only after model size, licensing, performance and offline installation UX are evaluated.
- No remote image processing. Any optional model download is explicit and user initiated.

## Quality gates for each release

- `npm run build` must pass.
- Test import, preset preview, adjustment, undo/redo, transform and export with large and small images.
- Verify mobile layout and keyboard accessibility.
- Keep original source pixels untouched until export; avoid destructive edits.
- Clearly label heuristic/local recipe matching separately from actual ML inference.
