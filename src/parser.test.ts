import { describe, expect, it } from "vitest";

import { parseCommandInput } from "./parser.js";
import type { CommandDefinition } from "./types.js";

const baseCommand: CommandDefinition = {
  name: "build",
  description: "Build the project",
  options: [
    {
      name: "output",
      short: "o",
      description: "Output directory",
      type: "string",
      required: true,
    },
    {
      name: "count",
      description: "Repeat count",
      type: "number",
      default: 1,
    },
    {
      name: "force",
      short: "f",
      description: "Force run",
      type: "boolean",
    },
    {
      name: "verbose",
      short: "v",
      description: "Verbose logging",
      type: "boolean",
    },
  ],
  args: [
    {
      name: "entry",
      description: "Entry file",
      type: "string",
      required: true,
    },
    {
      name: "extras",
      description: "Extra files",
      type: "string",
      variadic: true,
    },
  ],
  action: () => {},
};

describe("parseCommandInput", () => {
  it("parses options and args", () => {
    const result = parseCommandInput(
      [
        "--output",
        "dist",
        "entry.ts",
        "--count",
        "2",
        "-vf",
        "extra1",
        "extra2",
      ],
      baseCommand,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.options).toEqual({
      output: "dist",
      count: 2,
      force: true,
      verbose: true,
    });
    expect(result.args).toEqual({
      entry: "entry.ts",
      extras: ["extra1", "extra2"],
    });
  });

  it("reports unknown options with suggestion", () => {
    const result = parseCommandInput(
      ["--outpu", "dist", "entry.ts"],
      baseCommand,
    );

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.errors[0]?.message).toContain("Did you mean --output?");
  });

  it("treats values after -- as arguments", () => {
    const result = parseCommandInput(
      ["--output", "dist", "entry.ts", "--", "--not-an-option"],
      baseCommand,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.args).toEqual({
      entry: "entry.ts",
      extras: ["--not-an-option"],
    });
  });
});
