import * as ort from 'onnxruntime-web/webgpu';
import ortWasmMjsUrl from 'onnxruntime-web/dist/ort-wasm-simd-threaded.asyncify.mjs?url';
import ortWasmBinaryUrl from 'onnxruntime-web/dist/ort-wasm-simd-threaded.asyncify.wasm?url';

const MODEL = 'SharpAI/sam2-hiera-tiny-onnx';
const BASE = `https://huggingface.co/${MODEL}/resolve/main`;
const CACHE_NAME = 'stillroom-sam2-tiny-v1';
let encoderSession;
let decoderSession;
let embedding;
let encodedImageKey = '';

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
  // Let Vite bundle the exact runtime assets locally. This avoids both the
  // SPA fallback returning index.html and cross-origin dynamic-import failures.
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
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const scale = 1024 / Math.max(width, height);
  const resizedWidth = Math.round(width * scale);
  const resizedHeight = Math.round(height * scale);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(image, 0, 0, resizedWidth, resizedHeight);
  const pixels = ctx.getImageData(0, 0, 1024, 1024).data;
  const means = [0.485, 0.456, 0.406];
  const stds = [0.229, 0.224, 0.225];
  const plane = 1024 * 1024;
  const tensorData = new Float32Array(3 * plane);
  for (let i = 0; i < plane; i++) {
    for (let c = 0; c < 3; c++) tensorData[c * plane + i] = (pixels[i * 4 + c] / 255 - means[c]) / stds[c];
  }
  onProgress?.({ stage: 'encoding' });
  const result = await encoderSession.run({
    image: new ort.Tensor('float32', tensorData, [1, 3, 1024, 1024])
  });
  embedding = {
    image_embed: result.image_embed,
    high_res_feats_0: result.high_res_feats_0,
    high_res_feats_1: result.high_res_feats_1
  };
  encodedImageKey = `${width}x${height}:${image.src || 'image'}`;
  return { width, height };
}

export async function promptSam(points, image) {
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
  // The exported decoder expects at least two point slots; -1 marks padding.
  while (labels.length < 2) { coords.push(0, 0); labels.push(-1); }
  const pointTensor = new ort.Tensor('float32', new Float32Array(coords), [1, labels.length, 2]);
  const labelTensor = new ort.Tensor('float32', new Float32Array(labels), [1, labels.length]);
  const result = await decoderSession.run({
    ...embedding,
    point_coords: pointTensor,
    point_labels: labelTensor,
    mask_input: new ort.Tensor('float32', new Float32Array(256 * 256), [1, 1, 256, 256]),
    has_mask_input: new ort.Tensor('float32', new Float32Array([0]), [1])
  });
  const maskTensor = result.masks;
  const scores = result.iou_predictions.data;
  const dims = maskTensor.dims;
  const maskCount = dims[1] || 3;
  const maskHeight = dims[dims.length - 2];
  const maskWidth = dims[dims.length - 1];
  let best = 0;
  for (let i = 1; i < maskCount; i++) if (scores[i] > scores[best]) best = i;
  const logits = maskTensor.data;
  const offset = best * maskWidth * maskHeight;
  const small = document.createElement('canvas');
  small.width = maskWidth;
  small.height = maskHeight;
  const smallCtx = small.getContext('2d');
  const imageData = smallCtx.createImageData(maskWidth, maskHeight);
  for (let i = 0; i < maskWidth * maskHeight; i++) {
    const alpha = logits[offset + i] > 0 ? 255 : 0;
    const p = i * 4;
    imageData.data[p] = imageData.data[p + 1] = imageData.data[p + 2] = 255;
    imageData.data[p + 3] = alpha;
  }
  smallCtx.putImageData(imageData, 0, 0);
  const output = document.createElement('canvas');
  output.width = width;
  output.height = height;
  const outCtx = output.getContext('2d');
  outCtx.imageSmoothingEnabled = true;
  outCtx.drawImage(small, 0, 0, width, height);
  const rgba = outCtx.getImageData(0, 0, width, height).data;
  const alpha = new Uint8ClampedArray(width * height);
  for (let i = 0; i < alpha.length; i++) alpha[i] = rgba[i * 4 + 3];
  return { data: alpha, width, height, channels: 1, label: 'SAM 2 prompt mask', score: Number(scores[best] || 0) };
}

export function releaseSam2() {
  const a = encoderSession?.release();
  const b = decoderSession?.release();
  encoderSession = decoderSession = undefined;
  embedding = undefined;
  encodedImageKey = '';
  return Promise.all([a, b].filter(Boolean));
}
