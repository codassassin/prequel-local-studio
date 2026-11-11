# Stillroom — Local Photo Studio

A personal, local-first photo editor inspired by creative filter apps. Independent project; no PREQUEL branding, assets, or proprietary filters.

## Features
- Import JPEG, PNG, WebP and AVIF photos
- 24 original looks across film, warm, cinematic, portrait, moody, retro, creative, cool and monochrome styles
- Colour grading controls including exposure, contrast, vibrance, hue shift, teal shadows and eight-channel HSL mixer\n- Five-zone tonal shaping, feathered radial exposure mask and editorial typography overlay
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
Photos are opened as local browser object URLs. Editing, segmentation inference and analysis run in the browser; image pixels are not sent to a server. The first AI run downloads model files from Hugging Face and stores them in browser Cache Storage for later use. Network access is therefore needed for the first model download unless local model files are installed.

## Notes
Built with Canvas 2D and Transformers.js. The initial AI model is `briaai/RMBG-1.4`; it produces a foreground alpha mask for the main subject, not editable multi-object instance masks. BRIA RMBG-1.4 is licensed for non-commercial use; commercial use requires a separate BRIA license. Check the model card before distributing or using it commercially. The model loader supports local model files at `/models` with a remote cached fallback. Presets are original looks, not exact film-stock emulations.
