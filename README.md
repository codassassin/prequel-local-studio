# Stillroom — Local Photo Studio

Stillroom is a local-first creative photo workspace for editing personal photographs, building looks, exploring colour directions and creating image variations. Image editing and project data stay in the browser on the user's device; the application has no photo-upload backend.

Stillroom is an independent product and does not use PREQUEL branding, assets or proprietary filters.

## Product principles

- **Local-first and privacy-minded:** image processing runs in the browser. AI model files can be downloaded and cached locally on first use.
- **Non-destructive exploration:** preserve source photographs while creating editable experiments and exported copies.
- **Creative collaboration:** explore directions, compare variations, build palettes and combine ideas.
- **Honest AI boundaries:** distinguish deterministic image processing from machine-learning features and state model/browser requirements clearly.

## Features

### Photo editing

- Import common browser-supported formats including JPEG, PNG, WebP and AVIF.
- Local HEIC/HEIF decoding through `heic-to` and TIFF decoding through `UTIF`, normalized to PNG working copies.
- Curated looks and searchable preset collections for film, warm, cinematic, portrait, moody, retro, cool and monochrome directions.
- Core adjustments including exposure, brightness, contrast, saturation/vibrance, hue and blur.
- Eight-channel HSL colour mixer.
- RGB tone curves (Master, Red, Green and Blue).
- Three-way shadow, midtone and highlight colour grading.
- Crop ratios, rotation and flip controls.
- Before/after comparison, zoom, drag-to-pan navigation and fit-to-canvas reset.
- High-quality JPEG and PNG export from the full-resolution working source.

### Pro Studio

- Detailed colour and tonal refinement tools.
- HSL mixer, three-way colour grading and editable RGB tone curves.
- Additional radial/light shaping and editorial typography controls.
- Controls are designed to update the main photograph preview and exported result.

### Selective masks

- Brush and eraser masks with adjustable size, opacity and feathering.
- Multiple independent mask layers with naming, selection, visibility/enable state, strength and individual overlay colours.
- Per-mask exposure, saturation and warmth adjustments.
- Per-mask undo/redo and clear operations.
- Linear gradient and radial gradient mask types with adjustable centre, angle, radius and feathering.
- Select one mask overlay or view all enabled mask overlays.
- Selective adjustments are applied to the full-resolution export as well as the preview.

### AI Studio

- Local foreground/background workflows using the BRIA RMBG-1.4 model.
- SAM 2 Tiny interactive object selection using the `SharpAI/sam2-hiera-tiny-onnx` ONNX model.
- SAM 2 inference uses ONNX Runtime Web with the WebGPU execution provider; a compatible browser/device is required.
- AI model files are downloaded on first use and cached by the browser where supported.
- Model-based selection is distinct from brush masks and deterministic colour processing.

**Model licensing:** the BRIA RMBG-1.4 model card specifies non-commercial licensing unless separately licensed by BRIA. Review the current model card and obtain the appropriate license before commercial distribution or use. Review the SAM 2 model and repository terms before redistributing model files.

### Exploration workspace

- Import multiple photographs onto a workspace, move and connect nodes, and create experiment branches.
- Duplicate experiments, compare sibling variations and browse a variation gallery.
- Shortlist experiments, create tonal constellations and inspect Creative DNA summaries derived from saved experiment settings.
- Visual Idea Fusion transfers a saved tonal recipe to another photograph.
- Colour DNA extracts representative colours from a local preview, balanced across shadows, midtones and highlights; swatches can be edited and saved with an experiment.
- Palette Library stores reusable named palettes in browser-local storage.
- Palette Preview Lab previews a donor palette on a target photograph before committing an experiment.
- Palette Transfer maps donor shadow, midtone and highlight colours to corresponding tonal regions in a target photograph, with adjustable influence and optional heuristic skin-tone protection.

Palette extraction, palette remapping and Creative DNA summaries are deterministic or heuristic processing—not generative AI, semantic understanding or full artistic style transfer.

## Technology stack

### Application and UI

| Technology | Role |
|---|---|
| JavaScript (ES modules) | Application language and module system |
| React 18 | Component-based user interface |
| React DOM | Browser rendering |
| Vite 6 | Development server and production bundler |
| lucide-react | Interface icons |
| CSS | Responsive layout, design system and component styling |

### Image processing and AI

| Technology / library | Role |
|---|---|
| HTML Canvas 2D API | Pixel processing, previews, masks, compositing and export |
| Web APIs | File, Blob, ImageBitmap, IndexedDB, Cache Storage and browser image handling |
| heic-to | Local HEIC/HEIF decoding |
| UTIF | Local TIFF decoding |
| ONNX Runtime Web | Browser-based ONNX inference |
| ONNX Runtime WebGPU | WebGPU acceleration for SAM 2 inference |
| SAM 2 Tiny ONNX | Interactive point-prompted object selection |
| BRIA RMBG-1.4 | Foreground/background segmentation |

### Storage and build

- **IndexedDB:** local Exploration workspace project persistence.
- **Browser Cache Storage:** caching downloaded SAM 2 model assets.
- **Browser storage:** local preferences, saved looks and palette library.
- **npm:** dependency and script management.
- **Vite:** local development and static production build.

No application server, cloud database or image-upload API is included in the current architecture. The initial download of AI model assets does require network access.

## Requirements

- Node.js 20.19+ or 22.12+
- npm
- A modern browser with Canvas 2D support
- WebGPU-capable browser/device for SAM 2 Tiny interactive selection
- Network access for the first download of AI model files (unless the required model files are provided locally)

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

- Image editing, mask rendering, palette extraction, palette remapping and image analysis run in the browser.
- Exploration projects are stored in IndexedDB on the current device/browser profile.
- Saved looks and palettes are kept in browser-local storage.
- AI model assets may be downloaded from model hosting services on first use and cached by the browser. Image pixels are processed locally; model downloads are separate from photo uploads.
- The app does not currently provide cloud project synchronisation or an application backend.
- Export important finished images separately. Clearing browser site data can remove locally stored projects, looks, palettes and cached models.

## Supported formats and decoder limitations

- JPEG, PNG, WebP and AVIF depend on the browser's native image decoding support.
- HEIC/HEIF and TIFF are normalized to PNG working copies locally.
- Camera RAW formats (for example CR2, CR3, NEF, ARW and DNG) and layered PSD/PSB files are not currently decoded. The app reports these as unsupported rather than silently treating them as ordinary images.
- Animated and vector formats may be listed by the file picker, but full animation/vector-preserving editing is not part of the current raster photo workflow.

## Design direction

Stillroom uses the **Editorial Darkroom** visual direction: warm ink and walnut surfaces, parchment typography, restrained brass accents, serif editorial headings and quiet technical labels. The interface aims to keep photographs central while making creative tools feel tactile and considered.

See [Design System](docs/DESIGN_SYSTEM.md).

## Documentation

- [User Manual](docs/USER_MANUAL.md) — setup, editing, Exploration, Colour DNA, Palette Transfer, privacy and troubleshooting.
- [Design System](docs/DESIGN_SYSTEM.md) — design tokens, typography, component principles and responsive behaviour.

## Development status and roadmap

Stillroom is actively evolving. Treat new features as experimental until they have passed a production build and browser testing.

Recommended next milestones:

1. **Finish the mask interaction model:** add draggable on-canvas handles for linear and radial gradients, plus clear visual feedback for the active mask.
2. **Strengthen editing reliability:** consistent undo/redo coverage, reset behaviour, keyboard shortcuts and robust state handling across tools.
3. **Performance and memory work:** profile large photographs, reduce unnecessary full-frame pixel passes and improve preview responsiveness without compromising full-resolution export.
4. **Import/export hardening:** broaden tested format coverage, improve export metadata/colour handling and communicate unsupported formats clearly.
5. **Release readiness:** responsive QA, accessibility, browser compatibility, error recovery, privacy/licensing review and a documented test checklist.

The immediate next feature milestone is **interactive gradient-mask handles on the photograph**, followed by performance and release-readiness work.
