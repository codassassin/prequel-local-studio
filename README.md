# Stillroom — Local Photo Studio

A personal, local-first photo editor inspired by creative filter apps. Independent project; no PREQUEL branding, assets, or proprietary filters.

## Features
- Import JPEG, PNG, WebP and AVIF photos
- 24 original looks across film, warm, cinematic, portrait, moody, retro, creative, cool and monochrome styles
- 20 controls including exposure, tone, teal shadows, matte blacks, halation, bloom, glow, light leaks, dust, scratches, chromatic aberration and scanlines
- Before/after comparison
- Full-resolution PNG or high-quality JPEG export
- Searchable, scrollable preset library with labelled look cards and category filters\n- Responsive dark editing workspace
- Local-only processing: no accounts, uploads, backend, analytics or cloud services

## Run locally
Requirements: Node.js 20.19+ or 22.12+, npm.

```bash
npm install
npm run dev
```

Open http://127.0.0.1:5173.

## Build
```bash
npm run build
npm run preview
```

## Privacy
Photos are opened as local browser object URLs and processed with Canvas in your browser. The app does not upload images or make API calls.

## Notes
This is the first version, built with Canvas 2D. Crop, rotation, layers, masks and undo history are not yet implemented. Presets are original looks, not exact film-stock emulations.
