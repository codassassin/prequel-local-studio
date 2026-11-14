# Stillroom — Local Photo Studio

Stillroom is a local-first creative photo workspace for editing personal photographs and exploring visual directions without sending image pixels to a cloud service.

The project is an independent product. It does not use PREQUEL branding, assets, or proprietary filters.

## Product principles

- **Local-first:** photographs are processed in the browser; there is no application photo-upload backend.
- **Non-destructive exploration:** experiment with copies and connected variations while preserving source photographs.
- **Creative collaboration:** discover directions, compare variations, shortlist experiments, and combine ideas.
- **Honest AI boundaries:** distinguish deterministic image analysis and colour algorithms from actual machine-learning features.

## Features

### Photo editing
- Import JPEG, PNG, WebP and AVIF photographs.
- Original looks and creative presets across film, warm, cinematic, portrait, moody, retro, cool and monochrome styles.
- Colour grading controls, including exposure, contrast, vibrance, hue shift, teal shadows and an eight-channel HSL mixer.
- Five-zone tonal shaping, feathered radial exposure mask and editorial typography overlay.
- Crop, rotate, flip and aspect-ratio controls.
- Before/after comparison and full-resolution PNG or high-quality JPEG export.
- Searchable preset library with category filters.

### Pro Studio and AI Studio
- Pro Studio provides additional editing and refinement controls.
- AI Studio includes local subject/background workflows powered by a downloaded segmentation model.
- The first segmentation model is BRIA RMBG-1.4. It creates a foreground alpha mask; it is not a general multi-object segmentation or semantic editing system.

### Exploration workspace
- Import multiple photographs onto a canvas, move and connect nodes, and create experiment branches.
- Duplicate experiments, discover creative directions, compare sibling variations, and browse the variation gallery.
- Shortlist experiments, create tonal constellations, and inspect a Creative DNA summary derived from saved experiment settings.
- Visual Idea Fusion transfers a saved tonal recipe to another photograph.
- **Colour DNA** extracts up to six representative colours from a small local preview, balanced across shadows, midtones and highlights; swatches can be manually edited and saved with the experiment.
- **Palette Library** stores named reusable palettes in browser-local storage, independently of an individual exploration project.
- **Palette Preview Lab** renders a local preview of a donor palette on a target photo and lets you toggle between the original and result before committing an experiment.
- **Palette Transfer** maps donor shadow colours to target shadows, midtone colours to target midtones, and highlight colours to target highlights on a working copy, with adjustable influence and optional heuristic skin-tone protection.
- Palette extraction and palette transfer are deterministic colour-analysis/remapping operations, not generative AI or full artistic style transfer.

## Requirements

- Node.js 20.19+ or 22.12+
- npm
- A modern browser with Canvas 2D support

## Run locally

```bash
npm install
npm run dev
```

Vite prints the local development URL. The configured host is `127.0.0.1` (usually `http://127.0.0.1:5173`).

## Production build

```bash
npm run build
npm run preview
```

The production output is written to `dist/`.

## Local project data and privacy

- Editing, palette extraction, palette remapping and image analysis run in the browser.
- Exploration projects are stored in browser IndexedDB on the current device/browser profile.
- The app does not provide cloud project synchronisation or an application backend.
- AI model files may be downloaded from Hugging Face on the first AI run and cached in browser storage. Network access is therefore required for the initial model download unless local model files are installed.
- Avoid clearing site data if you want to retain locally stored projects. Export important finished images separately.

## Important model and licensing note

The initial AI background-removal model is `briaai/RMBG-1.4`. Its model card states non-commercial licensing; commercial use requires a separate BRIA license. Review the current model card and license before distributing the model or using it commercially. The model loader supports local model files under `/models` with a remote cached fallback.

## Design direction

Stillroom uses the **Editorial Darkroom** visual direction: warm ink and walnut surfaces, parchment typography, restrained brass accents, serif editorial headings, and quiet technical labels. The no-photo state opens with a designed welcome composition and a clear local import action. The Look Library presents presets as editorial print cards with clearer preview, category and selection hierarchy. The loaded-photo stage uses a warm framed presentation, compact frame metadata and floating zoom controls. The interface is designed to keep photographs central while making creative tools feel tactile and considered. See [Design System](docs/DESIGN_SYSTEM.md).

## Documentation

- [User Manual](docs/USER_MANUAL.md) — setup, editing, Exploration, Colour DNA, Palette Transfer, privacy and troubleshooting.
- [Design System](docs/DESIGN_SYSTEM.md) — design tokens, typography, component principles and responsive behaviour.

## Current development status

Features evolve on feature branches. Treat newly added functionality as experimental until it has been built and tested in a browser. The palette workflow is intentionally described as deterministic colour remapping, not semantic understanding or generative style transfer.
