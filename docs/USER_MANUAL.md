# Stillroom User Manual

This guide covers the current browser-based Stillroom application, with particular attention to the Exploration workspace and its local Colour DNA and Palette Transfer tools.

> **Feature status:** Stillroom is actively developed. Some creative tools are experimental. Build and test the current branch before relying on it for important work.

## 1. The Stillroom visual language

Stillroom uses the **Editorial Darkroom** design direction: warm dark surfaces, parchment text, restrained brass accents, serif editorial headings and compact technical labels. The image remains the centre of the workspace; the surrounding controls are intentionally quieter. Selected controls and keyboard focus use the brass accent. On narrower screens, the Develop tools move below the image stage.

## 2. The Darkroom welcome screen

When no photograph is loaded, the main stage presents an editorial welcome composition with a short introduction and an **Open a photograph** action. Select it to open the local file picker, or drag an image onto the application. Supported formats are JPG, PNG, WebP and AVIF. The decorative print artwork is part of the empty state; it is not a sample photograph or an image uploaded by Stillroom.

## 3. Start Stillroom

### Requirements
- Node.js 20.19+ or 22.12+
- npm
- A modern desktop browser

### Install and run

From the repository directory:

```bash
npm install
npm run dev
```

Open the local URL printed by Vite (normally `http://127.0.0.1:5173`).

To create and preview a production build:

```bash
npm run build
npm run preview
```

## 4. Browsing the Look Library

The Looks tab presents presets as editorial print cards. Each card shows a visual thumbnail, look name, short description and category. The currently applied look is marked **SELECTED** and receives a brass-accented border. Before a photo is loaded, cards remain visible as a catalogue but cannot be applied; import a photograph to preview and use a look.

## 4. The photo presentation stage

After a photograph is loaded, the Darkroom displays its filename, pixel dimensions and active look in a compact frame header. The image is presented on a warm recessed stage with a floating zoom control. Use the minus and plus controls to adjust zoom, the displayed percentage to check the current scale, and the image button to choose another photograph. The **Compare** action in the top bar continues to show the original comparison state. Transform and crop controls remain below the image stage.

## 5. Fitting the photograph in the canvas

The photo preview fits the complete photograph inside the available Darkroom stage at 100% zoom. The preview area does not have its own scrollbars. Use the zoom controls to magnify the image; above 100%, parts of the photograph may fall outside the visible frame. Return to 100% to see the whole image fitted again.

## 6. Import and edit a photograph

1. Open Stillroom and add a photograph using the import control.
2. Browse the available original looks/presets.
3. Adjust the editing controls to refine the result.
4. Use before/after comparison to inspect changes.
5. Export a finished image as PNG or high-quality JPEG using the export control.

The original source should be kept separately if it is important. Exported edits are new output files.

## 6. Explore photographs and experiments

The Exploration workspace is a visual canvas for organising photographs and creative branches.

- **Add photographs:** import one or more images as nodes.
- **Select a node:** click a photograph/experiment node.
- **Move a node:** drag it on the canvas.
- **Pan the canvas:** drag empty canvas space.
- **Zoom:** use the zoom controls; Ctrl/Command plus scroll is also supported.
- **Duplicate experiment:** create a separate node based on the selected node.
- **Connect ideas:** connect two nodes to record a creative relationship.
- **Discover directions:** open curated prompts for possible creative directions. These are authored suggestions, not AI-generated edits.
- **Compare:** compare an experiment against its original or related variation.
- **Variations:** browse sibling variations.
- **Shortlist:** keep selected experiments for later creative workflows.
- **Creative DNA:** inspect a summary calculated from saved tonal settings of shortlisted experiments.
- **Visual Idea Fusion:** apply a saved tonal recipe from a shortlisted experiment to another photograph.

The workspace stores project data in browser IndexedDB. It is local to that browser profile and device; it is not cloud-synchronised. Avoid clearing site data if you want to keep the project.

## 7. Colour DNA: extract a palette

Colour DNA creates a small colour reference from a selected photograph or experiment.

1. In Exploration, select the node whose colours you want to sample.
2. Choose **Colour DNA**.
3. If no palette exists yet, the workspace analyses a small preview locally.
4. Review the colour swatches, their hex values, tonal labels and approximate preview shares.
5. Use the colour picker on any swatch to replace its colour. The edited hex value is saved with the experiment and becomes the palette used by Palette Transfer.
6. Use **Copy** on a swatch to copy its hex value when needed.

### How extraction works

- The longest side of the analysis preview is capped at 128 pixels.
- Visible pixels are grouped into coarse RGB buckets.
- Colours are selected separately from shadow, midtone and highlight brightness regions.
- Up to six representative swatches are saved as metadata on the experiment node.

This is lightweight, deterministic colour quantisation. It is not AI, face detection, semantic image understanding, or a complete description of an image's visual style.

## 8. Palette Transfer: borrow a palette

Palette Transfer applies a saved Colour DNA palette to a different photograph.

### Prepare a donor palette

1. Select the photograph you want to borrow colours from.
2. Open **Colour DNA** and extract its palette.
3. Keep the project open; the palette is stored with that node in the local project.

### Create a palette experiment

1. Choose **Palette transfer** in the Exploration toolbar.
2. Under **Photograph to transform**, select the target photograph.
3. Under **Colour palette from**, select a different node that already has an extracted palette.
4. Review the donor palette swatches.
5. Adjust **Colour influence**. Lower values retain more of the target's original colours; higher values apply more of the donor palette.
6. Choose **Preview palette** to render a local preview. Preview processing uses the same bounded working-image size as a committed palette experiment.
7. Choose **Compare original** to toggle the preview area between the untouched target and the palette result.
8. Change the donor or influence and generate another preview as needed.
9. Optionally enable **Gentle skin-tone protection**.
10. Choose **Create palette experiment** only when you are happy with the direction.
8. A new experiment node is added and connected to both the target and palette donor. The original nodes are not overwritten.

### What the algorithm does

- Works on a local copy capped at 1024 pixels on its longest side.
- Separates the donor palette into shadow, midtone and highlight groups.
- Maps target shadows to donor shadow colours, target midtones to donor midtone colours, and target highlights to donor highlight colours.
- Uses a smooth transition between colours within each tonal group.
- Falls back to the complete donor palette if a tonal group is unavailable.
- Restores the target's luminance contribution before blending.
- Blends the remapped colour with the target according to the influence setting.
- Produces a new JPEG-backed experiment node.

The working copy is capped at 1024px, so this is an exploration preview rather than a full-resolution export workflow. Use the original photo in the main editing/export workflow for final-resolution output.

### Skin-tone protection: important limitation

The optional protection uses broad colour-channel thresholds to reduce palette influence on some skin-like pixels. It is **not face detection or reliable skin segmentation**. It may protect non-skin colours or fail to protect some skin tones, depending on lighting, complexion, white balance and the scene. Turn it off if it harms the result.

### What Palette Transfer does not do

It does not transfer texture, objects, composition, lighting direction, depth, or learned artistic style. It is a deterministic colour-remapping experiment—not generative AI or neural style transfer.

## 9. Saved Palette Library

The Palette Library stores named palettes in this browser so they can be reused across separate Exploration projects in the same browser profile.

1. Select a node with an extracted or edited Colour DNA palette.
2. Open **Colour DNA**, enter a name, and choose **Save to library**. You can also open **Palette library** from the toolbar and save the selected node's palette there.
3. Open **Palette library** to review saved swatches.
4. Choose **Apply to selected** to attach a copy of a saved palette to the currently selected photograph/experiment. This does not alter its image pixels; it changes its palette metadata for subsequent Palette Transfer.
5. Use **Rename** to change a palette name or **Delete** to remove it from this browser's library.

### Storage and portability

- Saved palettes use browser `localStorage` and are separate from the Exploration project's IndexedDB record.
- They are available to Stillroom on the same browser origin and profile, not automatically on another device or browser.
- Clearing site data can delete the library. There is not yet a palette export/import or cloud-sync feature.
- If browser storage is unavailable or full, the UI reports that saving may not persist.

## 10. Privacy and local storage

- Photo editing and palette analysis/remapping happen in the browser.
- The palette tools do not upload photographs to a Stillroom server.
- Exploration nodes and palette metadata are stored in IndexedDB in the current browser profile.
- Clearing browser/site storage can remove local project data. Keep separate exports/backups of important results.
- Some AI Studio model files may be downloaded from Hugging Face the first time the relevant feature is used and cached by the browser. This initial model download requires network access unless local model files are configured.

## 11. Troubleshooting

### The app does not start
- Confirm your Node.js version: `node --version`.
- Install dependencies with `npm install`.
- Start the development server with `npm run dev`.
- Check the terminal for the first reported error.

### The production build fails
Run:

```bash
npm run build
```

Copy the complete terminal error, including the first error above the stack trace. Fix the earliest reported error first.

### A palette donor is missing from the selector
The donor must be a node with an image and an extracted palette containing at least two colours. Select that node and run **Colour DNA** first.

### The palette selector or dialog looks cramped
- Pull the latest feature branch.
- Hard-refresh the browser with Ctrl+Shift+R.
- Check the browser viewport width and zoom level.
- If the layout is still incorrect, capture a screenshot and include the browser width/zoom and any console errors.

### Palette Transfer looks too strong or unnatural
- Reduce Colour influence.
- Try a different donor palette with a closer tonal range.
- Toggle Gentle skin-tone protection and compare.
- Remember that the current algorithm remaps colour by brightness; it does not understand objects or scene content.

### The project disappears
Check that you are using the same browser profile and local app origin as before. IndexedDB data is origin-specific. Check browser site storage and avoid clearing it. The application does not currently provide cloud project recovery.

## 12. Suggested verification checklist for new builds

After pulling a new development branch:

```bash
git fetch origin
git checkout feature/local-palette-transfer
git pull origin feature/local-palette-transfer
npm install
npm run build
npm run dev
```

Then verify:
- [ ] The app starts without a blank screen.
- [ ] A photograph can be imported into Exploration.
- [ ] Colour DNA extracts and displays swatches.
- [ ] Palette Transfer accepts a target and a different donor with a saved palette.
- [ ] Colour influence changes the result.
- [ ] Skin-tone protection can be toggled.
- [ ] The new experiment appears without replacing either source node.
- [ ] Reloading the same local project retains its nodes and palette metadata.

## 13. Capability and licensing notes

Stillroom contains a mix of conventional image-processing features and experimental AI-assisted features. UI labels should not be interpreted as proof of machine learning: Colour DNA and Palette Transfer are deterministic algorithms.

The current BRIA RMBG-1.4 model has licensing restrictions. Review the model card and obtain the appropriate license before commercial use or redistribution. See the README for the current model and local-model notes.
