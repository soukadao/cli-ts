import { MAX_SUGGESTION_DISTANCE } from "./constants.js";

const NORMALIZE_PATTERN = /^-+/;

/**
 * Calculates the Levenshtein distance between two strings.
 */
export const levenshteinDistance = (source: string, target: string): number => {
  if (source === target) {
    return 0;
  }

  const sourceLength = source.length;
  const targetLength = target.length;

  if (sourceLength === 0) {
    return targetLength;
  }

  if (targetLength === 0) {
    return sourceLength;
  }

  const matrix: number[][] = Array.from({ length: sourceLength + 1 }, () =>
    Array.from({ length: targetLength + 1 }, () => 0),
  );

  for (let i = 0; i <= sourceLength; i += 1) {
    matrix[i][0] = i;
  }

  for (let j = 0; j <= targetLength; j += 1) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= sourceLength; i += 1) {
    for (let j = 1; j <= targetLength; j += 1) {
      const substitutionCost = source[i - 1] === target[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + substitutionCost,
      );
    }
  }

  return matrix[sourceLength][targetLength];
};

const normalizeCandidate = (value: string): string =>
  value.replace(NORMALIZE_PATTERN, "");

/**
 * Finds the closest candidate within a threshold distance.
 */
export const findClosest = (
  value: string,
  candidates: string[],
): string | undefined => {
  const normalized = normalizeCandidate(value);

  let bestCandidate: string | undefined;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const candidate of candidates) {
    const distance = levenshteinDistance(
      normalizeCandidate(candidate),
      normalized,
    );
    if (distance < bestDistance) {
      bestDistance = distance;
      bestCandidate = candidate;
    }
  }

  if (bestDistance <= MAX_SUGGESTION_DISTANCE) {
    return bestCandidate;
  }

  return undefined;
};
