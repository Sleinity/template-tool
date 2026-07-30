import {
  fontUsesPlatformEmojiFallback,
  partitionFontCharactersByCoverageAuthority,
  textFaceCoverageCharacters,
} from "../src/resolved/fontCharacterCoverage";

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(message);
}

const explicitSun = partitionFontCharactersByCoverageAuthority(
  "Summer Sale ☀️",
);
assert(
  explicitSun.textFaceCharacters === "Summer Sale " &&
    explicitSun.emojiFallbackSequences.join("") === "☀️",
  "An explicit sun emoji sequence should be delegated without weakening ordinary text coverage.",
);

for (const sequence of [
  "😀",
  "👨‍👩‍👧‍👦",
  "👍🏽",
  "🇳🇱",
  "1️⃣",
]) {
  const result = partitionFontCharactersByCoverageAuthority(sequence);
  assert(
    result.textFaceCharacters === "" &&
      result.emojiFallbackSequences.join("") === sequence,
    `The explicit emoji sequence ${sequence} should use platform emoji fallback.`,
  );
}

for (const character of ["A", "é", "€", "Ω", "☀", "™"]) {
  const result = partitionFontCharactersByCoverageAuthority(character);
  assert(
    result.textFaceCharacters === character &&
      result.emojiFallbackSequences.length === 0,
    `${character} should remain required coverage for the uploaded text face.`,
  );
}
const textPresentationSun = partitionFontCharactersByCoverageAuthority("☀︎");
assert(
  textPresentationSun.textFaceCharacters === "☀" &&
    textPresentationSun.emojiFallbackSequences.length === 0,
  "A text-presentation selector should keep its base symbol under text-face coverage authority.",
);

assert(
  fontUsesPlatformEmojiFallback("Rethink Sans", "Summer Sale ☀️") &&
    !fontUsesPlatformEmojiFallback("Rethink Sans", "Summer Sale ☀") &&
    !fontUsesPlatformEmojiFallback("Noto Color Emoji", "☀️"),
  "Emoji fallback should apply only to explicit emoji sequences requested from a non-emoji text family.",
);
assert(
  textFaceCoverageCharacters("Rethink Sans", "A☀️€") === "A€" &&
    textFaceCoverageCharacters("Noto Color Emoji", "☀️") === "☀️",
  "Coverage input should retain strict text characters and keep emoji-family requirements authoritative.",
);

console.log("Portable font character coverage tests passed.");
