import type { TemplatePackageV1, VisualDiffResult } from "@sleinity/template-core";

export function describeVisualDiffError(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  if (typeof error === "object" && error !== null && "message" in error && typeof error.message === "string" && error.message.trim()) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  if (typeof Event !== "undefined" && error instanceof Event && error.type) return `A browser resource failed during ${error.type}.`;
  return "The browser did not provide an error description.";
}

export interface RgbaImageData {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

export interface VisualDiffComputation extends VisualDiffResult {
  diff: RgbaImageData;
}

export type PngImageSource = string | Blob;

export function getFigmaReferencePng(
  packageValue: Pick<TemplatePackageV1, "verification"> | null | undefined,
): string | null {
  return (
    packageValue?.verification?.figmaScreenshot?.dataUrl ??
    packageValue?.verification?.figmaScreenshot?.url ??
    null
  );
}

function assertImageData(image: RgbaImageData): void {
  if (
    image.width <= 0 ||
    image.height <= 0 ||
    image.data.length !== image.width * image.height * 4
  ) {
    throw new Error("RGBA image dimensions do not match its pixel data.");
  }
}

export function normalizeRgbaImage(
  image: RgbaImageData,
  width: number,
  height: number,
): RgbaImageData {
  assertImageData(image);
  if (image.width === width && image.height === height) return image;

  const data = new Uint8ClampedArray(width * height * 4);
  for (let targetY = 0; targetY < height; targetY += 1) {
    const sourceY = Math.min(
      image.height - 1,
      Math.floor((targetY * image.height) / height),
    );
    for (let targetX = 0; targetX < width; targetX += 1) {
      const sourceX = Math.min(
        image.width - 1,
        Math.floor((targetX * image.width) / width),
      );
      const sourceIndex = (sourceY * image.width + sourceX) * 4;
      const targetIndex = (targetY * width + targetX) * 4;
      data[targetIndex] = image.data[sourceIndex];
      data[targetIndex + 1] = image.data[sourceIndex + 1];
      data[targetIndex + 2] = image.data[sourceIndex + 2];
      data[targetIndex + 3] = image.data[sourceIndex + 3];
    }
  }
  return { width, height, data };
}

export function visualDiffSeverity(
  score: number,
): VisualDiffResult["severity"] {
  if (score >= 98) return "excellent";
  if (score >= 90) return "good";
  if (score >= 70) return "review";
  return "broken";
}

export function compareRgbaImages(
  rendered: RgbaImageData,
  reference: RgbaImageData,
  threshold = 24,
): VisualDiffComputation {
  assertImageData(rendered);
  assertImageData(reference);
  const normalizedRendered = normalizeRgbaImage(
    rendered,
    reference.width,
    reference.height,
  );
  const totalPixels = reference.width * reference.height;
  const diffData = new Uint8ClampedArray(totalPixels * 4);
  let mismatchedPixels = 0;

  for (let index = 0; index < reference.data.length; index += 4) {
    const delta = Math.max(
      Math.abs(normalizedRendered.data[index] - reference.data[index]),
      Math.abs(normalizedRendered.data[index + 1] - reference.data[index + 1]),
      Math.abs(normalizedRendered.data[index + 2] - reference.data[index + 2]),
      Math.abs(normalizedRendered.data[index + 3] - reference.data[index + 3]),
    );
    const mismatch = delta > threshold;
    if (mismatch) mismatchedPixels += 1;
    diffData[index] = mismatch ? 255 : reference.data[index];
    diffData[index + 1] = mismatch ? 45 : reference.data[index + 1];
    diffData[index + 2] = mismatch ? 70 : reference.data[index + 2];
    diffData[index + 3] = mismatch ? 220 : 35;
  }

  const score =
    totalPixels === 0
      ? 100
      : Math.round((1 - mismatchedPixels / totalPixels) * 10000) / 100;
  return {
    score,
    mismatchedPixels,
    totalPixels,
    threshold,
    severity: visualDiffSeverity(score),
    issues:
      mismatchedPixels === 0
        ? []
        : [`${mismatchedPixels} pixels exceed the diff threshold.`],
    diff: {
      width: reference.width,
      height: reference.height,
      data: diffData,
    },
  };
}

export function compareRgbaPixels(
  rendered: Uint8ClampedArray,
  reference: Uint8ClampedArray,
  threshold = 24,
): VisualDiffResult {
  if (
    rendered.length !== reference.length ||
    rendered.length % 4 !== 0
  ) {
    throw new Error("Visual diff inputs must contain equal RGBA pixel data.");
  }
  const result = compareRgbaImages(
    { width: rendered.length / 4, height: 1, data: rendered },
    { width: reference.length / 4, height: 1, data: reference },
    threshold,
  );
  const { diff: _diff, ...summary } = result;
  return summary;
}

async function decodePngSource(source: PngImageSource): Promise<RgbaImageData> {
  if (typeof document === "undefined") {
    throw new Error("PNG decoding is only available in the browser.");
  }
  const blob =
    typeof source === "string"
      ? await fetch(source).then((response) => {
          if (!response.ok) throw new Error("PNG image could not be loaded.");
          return response.blob();
        })
      : source;

  let drawable: ImageBitmap | HTMLImageElement;
  let releaseDrawable = () => {};
  if (typeof createImageBitmap === "function") {
    drawable = await createImageBitmap(blob);
    releaseDrawable = () => drawable instanceof ImageBitmap && drawable.close();
  } else {
    const objectUrl = URL.createObjectURL(blob);
    const image = new Image();
    image.decoding = "async";
    drawable = image;
    releaseDrawable = () => URL.revokeObjectURL(objectUrl);
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () =>
        reject(new Error("PNG image could not be decoded."));
      image.src = objectUrl;
    });
  }

  const canvas = document.createElement("canvas");
  canvas.width =
    drawable instanceof HTMLImageElement
      ? drawable.naturalWidth
      : drawable.width;
  canvas.height =
    drawable instanceof HTMLImageElement
      ? drawable.naturalHeight
      : drawable.height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    releaseDrawable();
    throw new Error("Canvas pixel access is unavailable.");
  }
  try {
    context.drawImage(drawable, 0, 0);
    const image = context.getImageData(0, 0, canvas.width, canvas.height);
    return {
      width: image.width,
      height: image.height,
      data: image.data,
    };
  } finally {
    releaseDrawable();
  }
}

function rgbaToPngDataUrl(image: RgbaImageData): string {
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas image output is unavailable.");
  const output = context.createImageData(image.width, image.height);
  output.data.set(image.data);
  context.putImageData(output, 0, 0);
  return canvas.toDataURL("image/png");
}

export async function comparePngImages(
  rendered: PngImageSource,
  reference: PngImageSource,
  threshold = 24,
): Promise<VisualDiffResult> {
  const [renderedImage, referenceImage] = await Promise.all([
    decodePngSource(rendered),
    decodePngSource(reference),
  ]);
  const result = compareRgbaImages(renderedImage, referenceImage, threshold);
  const { diff, ...summary } = result;
  return {
    ...summary,
    diffImageDataUrl: rgbaToPngDataUrl(diff),
  };
}
