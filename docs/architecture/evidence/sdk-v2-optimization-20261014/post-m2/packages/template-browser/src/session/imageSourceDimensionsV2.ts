/** Browser ingestion metadata, never a second crop or render geometry owner. */
export async function imageSourceDimensionsV2(
  url: string,
  supplied: { width?: number; height?: number },
): Promise<{ width: number; height: number }> {
  if (supplied.width !== undefined && supplied.height !== undefined) return { width: supplied.width, height: supplied.height };
  if (typeof Image === "undefined") return { width: supplied.width ?? 1, height: supplied.height ?? 1 };
  if (!url.startsWith("blob:") && !url.startsWith("data:image/")) throw new Error("Image ingestion requires local image bytes.");
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => reject(new Error("Replacement image bytes could not be decoded."));
    image.src = url;
  });
}
