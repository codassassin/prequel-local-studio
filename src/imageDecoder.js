const extensionOf = file => (file.name.split(".").pop() || "").toLowerCase();

async function decodeHeic(file) {
  const loaded = await import("heic2any");
  const convert = loaded.default || loaded;
  const output = await convert({ blob: file, toType: "image/png" });
  const blob = Array.isArray(output) ? output[0] : output;
  if (!(blob instanceof Blob)) throw new Error("The HEIC decoder returned no image data.");
  return new File([blob], file.name.replace(/\.(heic|heif)$/i, ".png"), { type: "image/png" });
}

async function decodeTiff(file) {
  const loaded = await import("utif");
  const UTIF = loaded.default || loaded;
  const buffer = await file.arrayBuffer();
  const pages = UTIF.decode(buffer);
  if (!pages || !pages.length) throw new Error("No TIFF image page was found.");
  UTIF.decodeImage(buffer, pages[0]);
  const rgba = UTIF.toRGBA8(pages[0]);
  const width = pages[0].width;
  const height = pages[0].height;
  if (!width || !height || !rgba) throw new Error("Could not decode TIFF pixels.");
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not create a TIFF working canvas.");
  context.putImageData(new ImageData(new Uint8ClampedArray(rgba), width, height), 0, 0);
  const png = await new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("Could not encode TIFF working copy.")), "image/png"));
  return new File([png], file.name.replace(/\.(tif|tiff)$/i, ".png"), { type: "image/png" });
}

export async function normalizeImageFile(file) {
  const extension = extensionOf(file);
  if (["heic", "heif"].includes(extension) || /image\/hei[cf]/i.test(file.type)) {
    try { return await decodeHeic(file); }
    catch (error) { throw new Error("HEIC/HEIF decoding failed locally: " + (error?.message || "unknown decoder error")); }
  }
  if (["tif", "tiff"].includes(extension) || /image\/tiff/i.test(file.type)) {
    try { return await decodeTiff(file); }
    catch (error) { throw new Error("TIFF decoding failed locally: " + (error?.message || "unknown decoder error")); }
  }
  if (/\.(cr2|cr3|nef|arw|dng|raf|orf|rw2|pef|srw|psd|psb)$/i.test(file.name)) {
    throw new Error("This RAW or layered file needs a dedicated decoder that is not yet integrated. Your original file remains unchanged and local.");
  }
  return file;
}
