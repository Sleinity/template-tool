import figmaPluginV041 from "../../../src/template-package/fixtures/figma-plugin-v0.4.1.json";
import type { TemplatePackageV1 } from "../../../src/template-package/types";
import {
  attachFontBinary,
  clearFontInspectionCacheForTests,
  fontMetadataMatchesRequirement,
  inspectOpenTypeFontBinary,
  parseOpenTypeFontMetadata,
} from "../src/fonts";

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(message);
}

function utf16(value: string): Uint8Array {
  const bytes = new Uint8Array(value.length * 2);
  for (let index = 0; index < value.length; index += 1) {
    bytes[index * 2] = value.charCodeAt(index) >> 8;
    bytes[index * 2 + 1] = value.charCodeAt(index) & 0xff;
  }
  return bytes;
}

function testFont(
  records: Array<[number, string]> = [
    [1, "Test Sans"],
    [2, "Bold"],
    [6, "TestSans-Bold"],
  ],
  weight = 700,
): ArrayBuffer {
  const values = records.map(([, value]) => utf16(value));
  const nameLength =
    6 + values.length * 12 + values.reduce((sum, item) => sum + item.length, 0);
  const nameOffset = 44;
  const os2Offset = nameOffset + nameLength;
  const buffer = new ArrayBuffer(os2Offset + 8);
  const view = new DataView(buffer);
  view.setUint32(0, 0x00010000);
  view.setUint16(4, 2);
  ["name", "OS/2"].forEach((tag, index) => {
    const offset = 12 + index * 16;
    [...tag].forEach((character, characterIndex) =>
      view.setUint8(offset + characterIndex, character.charCodeAt(0)),
    );
    view.setUint32(offset + 8, index === 0 ? nameOffset : os2Offset);
    view.setUint32(offset + 12, index === 0 ? nameLength : 8);
  });
  view.setUint16(nameOffset + 2, values.length);
  view.setUint16(nameOffset + 4, 6 + values.length * 12);
  let stringOffset = 0;
  values.forEach((value, index) => {
    const record = nameOffset + 6 + index * 12;
    view.setUint16(record, 3);
    view.setUint16(record + 2, 1);
    view.setUint16(record + 4, 0x0409);
    view.setUint16(record + 6, records[index][0]);
    view.setUint16(record + 8, value.length);
    view.setUint16(record + 10, stringOffset);
    new Uint8Array(
      buffer,
      nameOffset + 6 + values.length * 12 + stringOffset,
      value.length,
    ).set(value);
    stringOffset += value.length;
  });
  view.setUint16(os2Offset + 4, weight);
  return buffer;
}

const metadata = parseOpenTypeFontMetadata(testFont());
assert(
  metadata?.family === "Test Sans" &&
    metadata.postScriptName === "TestSans-Bold" &&
    metadata.weight === 700,
  "OpenType metadata should expose family, PostScript name, and weight.",
);

const geistLikeMetadata = parseOpenTypeFontMetadata(
  testFont(
    [
      [1, "Geist Mono Medium"],
      [2, "Regular"],
      [4, "Geist Mono Medium"],
      [6, "GeistMono-Medium"],
      [16, "Geist Mono"],
      [17, "Medium"],
    ],
    500,
  ),
);
clearFontInspectionCacheForTests();
const firstInspection = await inspectOpenTypeFontBinary(testFont());
const cachedInspection = await inspectOpenTypeFontBinary(testFont());
assert(
  firstInspection === cachedInspection &&
    firstInspection.binaryHash.length === 64 &&
    firstInspection.faces.length === 1,
  "Binary inspection should be SHA-keyed and reuse the parsed face report for identical bytes.",
);
assert(
  geistLikeMetadata?.family === "Geist Mono" &&
    geistLikeMetadata.typographicFamily === "Geist Mono" &&
    geistLikeMetadata.legacyFamily === "Geist Mono Medium" &&
    geistLikeMetadata.fullName === "Geist Mono Medium" &&
    geistLikeMetadata.postScriptName === "GeistMono-Medium" &&
    geistLikeMetadata.weight === 500,
  "Typographic family and subfamily must take precedence while legacy and full-name records remain preserved.",
);

const packageValue = structuredClone(
  figmaPluginV041 as unknown as TemplatePackageV1,
);
packageValue.fontRequirements = [
  {
    id: "font:test-sans:700:normal",
    family: "Test Sans",
    style: "Bold",
    cssStyle: "normal",
    weight: 700,
    postScriptName: "TestSans-Bold",
    usedBy: [packageValue.rootNodeId],
    characters: "Test",
    editable: false,
    mixedStyle: false,
    source: "figma",
    availableInFigma: true,
  },
];
assert(
  metadata &&
    fontMetadataMatchesRequirement(
      metadata,
      packageValue.fontRequirements[0],
    ).matches,
  "An exact font binary should match its exported requirement.",
);

assert(
  geistLikeMetadata &&
    fontMetadataMatchesRequirement(geistLikeMetadata, {
      ...packageValue.fontRequirements[0],
      id: "font:geist-mono:500:normal",
      family: "Geist Mono",
      style: "Medium",
      cssStyle: "normal",
      weight: 500,
      postScriptName: null,
    }).matches,
  "A Geist Mono Medium face whose legacy family contains the style name must match the typographic Geist Mono 500 request.",
);

const attached = await attachFontBinary(
  packageValue,
  packageValue.fontRequirements[0].id,
  testFont(),
  { mimeType: "font/ttf", fileName: "TestSans-Bold.ttf" },
);
assert(
  !packageValue.fontRequirements[0].assetId &&
    Boolean(attached.packageValue.fontRequirements?.[0].assetId) &&
    attached.packageValue.assets[attached.assetId]?.type === "font",
  "Attaching a font should preserve the original package and add a linked font asset to the working copy.",
);
