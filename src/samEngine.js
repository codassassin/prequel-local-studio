import * as ort from 'onnxruntime-web/webgpu';
import ortWasmMjsUrl from './ort-runtime/ort-wasm-simd-threaded.asyncify.mjs?url';
import ortWasmBinaryUrl from './ort-runtime/ort-wasm-simd-threaded.asyncify.wasm?url';

const MODEL = 'SharpAI/sam2-hiera-tiny-onnx';
const BASE = `https://huggingface.co/${MODEL}/resolve/main`;
const CACHE_NAME = 'stillroom-sam2-tiny-v1';
let encoderSession;
let decoderSession;
let embedding;
let encodedImageKey = '';
let encodedImageElement = null;
let encodedImageSize = '';

async function cachedModelFile(name, onProgress = () => {}) {
  const url = `${BASE}/${name}`;
  const cache = 'caches' in globalThis ? await caches.open(CACHE_NAME) : null;
  const cached = cache ? await cache.match(url) : null;
  if (cached) {
    onProgress({ file: name, loaded: 1, total: 1, cached: true });
    return cached.arrayBuffer();
  }
  const response = await fetch(url);
  if (!response.ok) throw new Error(`SAM 2 model download failed (${response.status}) for ${name}`);
  const total = Number(response.headers.get('content-length')) || 0;
  const reader = response.body?.getReader();
  let buffer;
  if (reader) {
    const chunks = [];
    let loaded = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      loaded += value.byteLength;
      onProgress({ file: name, loaded, total });
    }
    const bytes = new Uint8Array(loaded);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    buffer = bytes.buffer;
  } else {
    buffer = await response.arrayBuffer();
    onProgress({ file: name, loaded: buffer.byteLength, total: total || buffer.byteLength });
  }
  if (cache) {
    try { await cache.put(url, new Response(buffer.slice(0), { headers: { 'content-type': 'application/octet-stream' } })); }
    catch (error) { console.warn('[Stillroom SAM] Browser cache write failed:', error); }
  }
  return buffer;
}

export function samSupport() {
  return { webgpu: typeof navigator !== 'undefined' && !!navigator.gpu, model: MODEL };
}

export async function loadSam2(onProgress) {
  if (encoderSession && decoderSession) return;
  if (!samSupport().webgpu) throw new Error('SAM 2 Tiny currently requires WebGPU. Try a recent Chrome/Edge browser with WebGPU enabled.');
  ort.env.logLevel = 'warning';
  // Vite emits these source assets with hashed URLs; ONNX Runtime can then
  // fetch/import the matching local files without public-dir import warnings.
  ort.env.wasm.wasmPaths = { mjs: ortWasmMjsUrl, wasm: ortWasmBinaryUrl };
  ort.env.wasm.numThreads = 1;
  const encoderBuffer = await cachedModelFile('encoder.with_runtime_opt.ort', onProgress);
  const decoderBuffer = await cachedModelFile('decoder.onnx', onProgress);
  encoderSession = await ort.InferenceSession.create(encoderBuffer, {
    executionProviders: ['webgpu'],
    graphOptimizationLevel: 'disabled'
  });
  decoderSession = await ort.InferenceSession.create(decoderBuffer, { executionProviders: ['webgpu'] });
}

export async function encodeSamImage(image, onProgress) {
  await loadSam2(onProgress);
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  if (!width || !height) throw new Error('The image is not ready for SAM 2.');
  const sizeKey = `${width}x${height}:${image.currentSrc || image.src || ''}`;
  // The image encoder is the expensive stage. Reuse its embedding for repeated
  // clicks and button presses on the same image instead of encoding it again.
  if (embedding && encodedImageElement === image && encodedImageSize === sizeKey) {
    onProgress?.({ stage: 'encoding-cached', width, height });
    return { width, height, cached: true };
  }

  const started = performance.now();
  onProgress?.({ stage: 'preprocessing', width, height });
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const scale = 1024 / Math.max(width, height);
  const resizedWidth = Math.max(1, Math.round(width * scale));
  const resizedHeight = Math.max(1, Math.round(height * scale));
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Could not create the SAM 2 preprocessing canvas.');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image, 0, 0, resizedWidth, resizedHeight);
  const pixels = ctx.getImageData(0, 0, 1024, 1024).data;
  const plane = 1024 * 1024;
  const tensorData = new Float32Array(3 * plane);
  // Single pixel pass avoids the previous nested channel loop.
  for (let i = 0, p = 0; i < plane; i++, p += 4) {
    tensorData[i] = (pixels[p] / 255 - 0.485) / 0.229;
    tensorData[plane + i] = (pixels[p + 1] / 255 - 0.456) / 0.224;
    tensorData[2 * plane + i] = (pixels[p + 2] / 255 - 0.406) / 0.225;
  }
  onProgress?.({ stage: 'encoding', width, height });
  const inferenceStarted = performance.now();
  const result = await encoderSession.run({
    image: new ort.Tensor('float32', tensorData, [1, 3, 1024, 1024])
  });
  embedding = {
    image_embed: result.image_embed,
    high_res_feats_0: result.high_res_feats_0,
    high_res_feats_1: result.high_res_feats_1
  };
  encodedImageElement = image;
  encodedImageSize = sizeKey;
  encodedImageKey = sizeKey;
  onProgress?.({
    stage: 'encoded',
    width,
    height,
    preprocessingMs: Math.round(inferenceStarted - started),
    inferenceMs: Math.round(performance.now() - inferenceStarted),
    totalMs: Math.round(performance.now() - started)
  });
  return { width, height, cached: false };
}

export async function promptSam(points, image, previousMaskInput = null) {
  if (!decoderSession || !embedding) throw new Error('Load and encode the image with SAM 2 before selecting.');
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  const scale = 1024 / Math.max(width, height);
  const coords = [];
  const labels = [];
  for (const point of points) {
    coords.push(point.x * scale, point.y * scale);
    labels.push(point.label);
  }
  while (labels.length < 2) { coords.push(0, 0); labels.push(-1); }
  const pointTensor = new ort.Tensor('float32', new Float32Array(coords), [1, labels.length, 2]);
  const labelTensor = new ort.Tensor('float32', new Float32Array(labels), [1, labels.length]);
  const result = await decoderSession.run({
    ...embedding,
    point_coords: pointTensor,
    point_labels: labelTensor,
    mask_input: new ort.Tensor('float32', previousMaskInput || new Float32Array(256 * 256), [1, 1, 256, 256]),
    has_mask_input: new ort.Tensor('float32', new Float32Array([previousMaskInput ? 1 : 0]), [1])
  });
  const maskTensor = result.masks;
  const scores = result.iou_predictions.data;
  const dims = maskTensor.dims;
  const maskCount = dims[1] || 3;
  const maskHeight = dims[dims.length - 2];
  const maskWidth = dims[dims.length - 1];
  const logits = maskTensor.data;
  const lowResTensor = result.low_res_masks || result.low_res_mask || null;
  const lowResDims = lowResTensor?.dims || [];
  const lowResPlane = lowResDims.length >= 2 ? lowResDims[lowResDims.length - 1] * lowResDims[lowResDims.length - 2] : 0;
  const lowResCount = lowResDims.length >= 4 ? (lowResDims[1] || 1) : 1;
  const small = document.createElement('canvas');
  small.width = maskWidth;
  small.height = maskHeight;
  const smallCtx = small.getContext('2d');
  const output = document.createElement('canvas');
  output.width = width;
  output.height = height;
  const outCtx = output.getContext('2d');
  outCtx.imageSmoothingEnabled = true;
  const candidates = [];
  for (let candidate = 0; candidate < maskCount; candidate++) {
    const imageData = smallCtx.createImageData(maskWidth, maskHeight);
    const offset = candidate * maskWidth * maskHeight;
    for (let i = 0; i < maskWidth * maskHeight; i++) {
      const p = i * 4;
      imageData.data[p] = imageData.data[p + 1] = imageData.data[p + 2] = 255;
      imageData.data[p + 3] = logits[offset + i] > 0 ? 255 : 0;
    }
    smallCtx.putImageData(imageData, 0, 0);
    outCtx.clearRect(0, 0, width, height);
    outCtx.drawImage(small, 0, 0, width, height);
    const rgba = outCtx.getImageData(0, 0, width, height).data;
    const alpha = new Uint8ClampedArray(width * height);
    for (let i = 0; i < alpha.length; i++) alpha[i] = rgba[i * 4 + 3];
    let maskInput;
    if (lowResTensor?.data && lowResPlane) {
      const sourceIndex = Math.min(candidate, lowResCount - 1);
      const offsetLow = sourceIndex * lowResPlane;
      maskInput = new Float32Array(lowResTensor.data.slice(offsetLow, offsetLow + lowResPlane));
      if (maskInput.length !== 256 * 256) maskInput = null;
    }
    if (!maskInput) {
      maskInput = new Float32Array(256 * 256);
      for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
        const sx = Math.min(maskWidth - 1, Math.floor(x * maskWidth / 256));
        const sy = Math.min(maskHeight - 1, Math.floor(y * maskHeight / 256));
        maskInput[y * 256 + x] = logits[candidate * maskWidth * maskHeight + sy * maskWidth + sx];
      }
    }
    candidates.push({
      data: alpha,
      width,
      height,
      channels: 1,
      label: `SAM 2 candidate ${candidate + 1}`,
      score: Number(scores[candidate] || 0),
      candidateIndex: candidate,
      maskInput
    });
  }
  let selectedIndex = 0;
  for (let i = 1; i < candidates.length; i++) if (candidates[i].score > candidates[selectedIndex].score) selectedIndex = i;
  return { candidates, selectedIndex };
}

export function releaseSam2() {
  const a = encoderSession?.release();
  const b = decoderSession?.release();
  encoderSession = decoderSession = undefined;
  embedding = undefined;
  encodedImageKey = '';
  encodedImageElement = null;
  encodedImageSize = '';
  return Promise.all([a, b].filter(Boolean));
}
