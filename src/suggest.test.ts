import { describe, expect, it } from "vitest";

import { findClosest, levenshteinDistance } from "./suggest.js";

const DISTANCE_ZERO = 0;
const LENGTH_CLI = "cli".length;
const LENGTH_TOOL = "tool".length;

describe("suggest", () => {
  it("returns zero distance for identical strings", () => {
    expect(levenshteinDistance("build", "build")).toBe(DISTANCE_ZERO);
  });

  it("handles empty strings", () => {
    expect(levenshteinDistance("", "cli")).toBe(LENGTH_CLI);
    expect(levenshteinDistance("tool", "")).toBe(LENGTH_TOOL);
  });

  it("finds the closest candidate after normalization", () => {
    const result = findClosest("--hep", ["--help", "--version"]);

    expect(result).toBe("--help");
  });

  it("returns undefined when no candidate is close enough", () => {
    const result = findClosest("unknown", ["help", "version"]);

    expect(result).toBeUndefined();
  });
});
