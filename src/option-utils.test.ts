import { describe, expect, it } from "vitest";

import {
  buildLongFlag,
  buildShortFlag,
  formatOptionLabel,
  getOptionFlags,
} from "./option-utils.js";
import type { OptionDefinition } from "./types.js";

describe("option utils", () => {
  it("builds long and short flags", () => {
    expect(buildLongFlag("output")).toBe("--output");
    expect(buildShortFlag("o")).toBe("-o");
  });

  it("returns flags for short and long options", () => {
    const option: OptionDefinition = {
      name: "output",
      short: "o",
      description: "Output directory",
      type: "string",
    };

    expect(getOptionFlags(option)).toEqual(["-o", "--output"]);
  });

  it("returns only the long flag when short is missing", () => {
    const option: OptionDefinition = {
      name: "count",
      description: "Repeat count",
      type: "number",
    };

    expect(getOptionFlags(option)).toEqual(["--count"]);
  });

  it("formats option labels with type hints when needed", () => {
    const stringOption: OptionDefinition = {
      name: "output",
      short: "o",
      description: "Output directory",
      type: "string",
    };

    const booleanOption: OptionDefinition = {
      name: "force",
      short: "f",
      description: "Force run",
      type: "boolean",
    };

    expect(formatOptionLabel(stringOption)).toBe("-o, --output <string>");
    expect(formatOptionLabel(booleanOption)).toBe("-f, --force");
  });
});
