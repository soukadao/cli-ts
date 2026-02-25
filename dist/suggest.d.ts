/**
 * Calculates the Levenshtein distance between two strings.
 */
export declare const levenshteinDistance: (source: string, target: string) => number;
/**
 * Finds the closest candidate within a threshold distance.
 */
export declare const findClosest: (value: string, candidates: string[]) => string | undefined;
