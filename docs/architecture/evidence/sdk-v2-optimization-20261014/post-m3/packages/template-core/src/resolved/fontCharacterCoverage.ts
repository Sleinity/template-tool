const emojiPattern = /^\p{Emoji}$/u;
const emojiPresentationPattern = /^\p{Emoji_Presentation}$/u;
const extendedPictographicPattern = /^\p{Extended_Pictographic}$/u;
const emojiModifierPattern = /^\p{Emoji_Modifier}$/u;
const emojiModifierBasePattern = /^\p{Emoji_Modifier_Base}$/u;
const regionalIndicatorPattern = /^\p{Regional_Indicator}$/u;

const emojiVariationSelector = "\uFE0F";
const textVariationSelector = "\uFE0E";
const zeroWidthJoiner = "\u200D";
const combiningKeycap = "\u20E3";

export interface FontCharacterCoveragePartition {
  textFaceCharacters: string;
  emojiFallbackSequences: string[];
}

function matches(
  pattern: RegExp,
  character: string | undefined,
): boolean {
  return Boolean(character && pattern.test(character));
}

function isKeycapBase(character: string | undefined): boolean {
  return Boolean(character && /^[#*0-9]$/u.test(character));
}

function keycapSequenceLength(
  characters: readonly string[],
  index: number,
): number {
  if (!isKeycapBase(characters[index])) return 0;
  if (characters[index + 1] === combiningKeycap) return 2;
  return (
    characters[index + 1] === emojiVariationSelector &&
    characters[index + 2] === combiningKeycap
  )
    ? 3
    : 0;
}

function isEmojiSequenceBase(character: string | undefined): boolean {
  return (
    matches(emojiPattern, character) ||
    matches(extendedPictographicPattern, character)
  );
}

function emojiSequenceLength(
  characters: readonly string[],
  index: number,
): number {
  const first = characters[index];
  if (!first) return 0;

  const keycapLength = keycapSequenceLength(characters, index);
  if (keycapLength) return keycapLength;

  if (
    matches(regionalIndicatorPattern, first) &&
    matches(regionalIndicatorPattern, characters[index + 1])
  ) {
    return 2;
  }

  const next = characters[index + 1];
  const explicitEmojiStart =
    matches(emojiPresentationPattern, first) ||
    (
      isEmojiSequenceBase(first) &&
      (
        next === emojiVariationSelector ||
        next === zeroWidthJoiner ||
        matches(emojiModifierPattern, next)
      )
    );
  if (!explicitEmojiStart) {
    return matches(emojiModifierPattern, first) ? 1 : 0;
  }

  let cursor = index + 1;
  if (characters[cursor] === emojiVariationSelector) cursor += 1;
  if (matches(emojiModifierPattern, characters[cursor])) cursor += 1;

  while (
    characters[cursor] === zeroWidthJoiner &&
    isEmojiSequenceBase(characters[cursor + 1])
  ) {
    cursor += 2;
    if (characters[cursor] === emojiVariationSelector) cursor += 1;
    if (matches(emojiModifierPattern, characters[cursor])) cursor += 1;
  }

  return cursor - index;
}

/**
 * Separates characters owned by the requested text face from explicit emoji
 * sequences intentionally painted by the platform emoji fallback.
 *
 * Text-presentation symbols remain text-face requirements. For example, `☀`
 * is required while `☀️` is delegated because U+FE0F explicitly requests
 * emoji presentation.
 */
export function partitionFontCharactersByCoverageAuthority(
  characters: string,
): FontCharacterCoveragePartition {
  const codePoints = Array.from(characters);
  const textFaceCharacters: string[] = [];
  const emojiFallbackSequences: string[] = [];

  for (let index = 0; index < codePoints.length;) {
    if (
      codePoints[index] === textVariationSelector &&
      isEmojiSequenceBase(codePoints[index - 1])
    ) {
      index += 1;
      continue;
    }
    const sequenceLength = emojiSequenceLength(codePoints, index);
    if (sequenceLength > 0) {
      emojiFallbackSequences.push(
        codePoints.slice(index, index + sequenceLength).join(""),
      );
      index += sequenceLength;
      continue;
    }
    textFaceCharacters.push(codePoints[index]);
    index += 1;
  }

  return {
    textFaceCharacters: textFaceCharacters.join(""),
    emojiFallbackSequences,
  };
}

export function fontUsesPlatformEmojiFallback(
  family: string,
  characters: string | null | undefined,
): boolean {
  return (
    Boolean(characters) &&
    !/emoji|symbol/i.test(family) &&
    partitionFontCharactersByCoverageAuthority(characters ?? "")
      .emojiFallbackSequences.length > 0
  );
}

export function textFaceCoverageCharacters(
  family: string,
  characters: string | null | undefined,
): string {
  if (!characters || /emoji|symbol/i.test(family)) return characters ?? "";
  return partitionFontCharactersByCoverageAuthority(characters)
    .textFaceCharacters;
}
