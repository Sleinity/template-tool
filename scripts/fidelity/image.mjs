import { readFileSync, writeFileSync } from "node:fs";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";

function readPng(value) {
  return PNG.sync.read(Buffer.isBuffer(value) ? value : readFileSync(value));
}

export function comparePng(expectedValue, actualValue, options = {}) {
  const expected = readPng(expectedValue);
  const actual = readPng(actualValue);
  const dimensionsEqual = expected.width === actual.width && expected.height === actual.height;
  if (!dimensionsEqual) {
    return {
      equal: false,
      dimensionsEqual: false,
      expectedDimensions: { width: expected.width, height: expected.height },
      actualDimensions: { width: actual.width, height: actual.height },
      changedPixelCount: null,
      changedPixelPercentage: null,
      differenceImage: null,
      differenceBounds: null,
      largeRegions: [],
      threshold: options.threshold ?? 0.1,
      allowedChangedPixelPercentage: options.allowedChangedPixelPercentage ?? 0,
    };
  }
  const diff = new PNG({ width: expected.width, height: expected.height });
  const threshold = Number(options.threshold ?? 0.1);
  const changedPixelCount = pixelmatch(expected.data, actual.data, diff.data, expected.width, expected.height, { threshold, includeAA: Boolean(options.includeAA), alpha: 0.55, diffMask: true });
  const changedPixelPercentage = changedPixelCount / (expected.width * expected.height) * 100;
  let minX = expected.width;
  let minY = expected.height;
  let maxX = -1;
  let maxY = -1;
  const tiles = new Map();
  const tileSize = Number(options.regionTileSize ?? 64);
  for (let y = 0; y < expected.height; y += 1) {
    for (let x = 0; x < expected.width; x += 1) {
      const offset = (y * expected.width + x) * 4;
      if (diff.data[offset + 3] === 0) continue;
      minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
      const key = `${Math.floor(x / tileSize)}:${Math.floor(y / tileSize)}`;
      tiles.set(key, (tiles.get(key) ?? 0) + 1);
    }
  }
  const largeRegions = [...tiles.entries()].map(([key, pixels]) => {
    const [tileX, tileY] = key.split(":").map(Number);
    return { x: tileX * tileSize, y: tileY * tileSize, width: Math.min(tileSize, expected.width - tileX * tileSize), height: Math.min(tileSize, expected.height - tileY * tileSize), changedPixels: pixels };
  }).sort((left, right) => right.changedPixels - left.changedPixels).slice(0, 10);
  const allowed = Number(options.allowedChangedPixelPercentage ?? 0);
  return {
    equal: changedPixelPercentage <= allowed,
    dimensionsEqual: true,
    expectedDimensions: { width: expected.width, height: expected.height },
    actualDimensions: { width: actual.width, height: actual.height },
    exact: changedPixelCount === 0,
    changedPixelCount,
    changedPixelPercentage,
    differenceImage: PNG.sync.write(diff),
    differenceBounds: changedPixelCount ? { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 } : null,
    largeRegions,
    threshold,
    allowedChangedPixelPercentage: allowed,
  };
}

export function writeDifferenceImage(result, path) {
  if (!result.differenceImage) return false;
  writeFileSync(path, result.differenceImage);
  return true;
}
