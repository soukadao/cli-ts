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

  it("parses boolean options with explicit values", () => {
    const result = parseCommandInput(
      ["--output", "dist", "--force=false", "entry.ts"],
      baseCommand,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.options.output).toBe("dist");
    expect(result.options.force).toBe(false);
  });

  it("reports missing values for long options when followed by another option", () => {
    const command: CommandDefinition = {
      name: "build",
      description: "Build the project",
      options: [
        {
          name: "output",
          description: "Output directory",
          type: "string",
        },
        {
          name: "force",
          description: "Force run",
          type: "boolean",
        },
      ],
      action: () => {},
    };

    const result = parseCommandInput(["--output", "--force"], command);

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(
      result.errors.some((error) => error.kind === "MissingOptionValue"),
    ).toBe(true);
  });

  it("reports missing values for short options when followed by another option", () => {
    const command: CommandDefinition = {
      name: "build",
      description: "Build the project",
      options: [
        {
          name: "output",
          short: "o",
          description: "Output directory",
          type: "string",
        },
        {
          name: "force",
          short: "f",
          description: "Force run",
          type: "boolean",
        },
      ],
      action: () => {},
    };

    const result = parseCommandInput(["-o", "-f"], command);

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(
      result.errors.some((error) => error.kind === "MissingOptionValue"),
    ).toBe(true);
  });

  it("reports invalid option values", () => {
    const command: CommandDefinition = {
      name: "build",
      description: "Build the project",
      options: [
        {
          name: "count",
          description: "Repeat count",
          type: "number",
        },
      ],
      action: () => {},
    };

    const result = parseCommandInput(["--count", "nope"], command);

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.errors[0]?.kind).toBe("InvalidOptionValue");
    expect(result.errors[0]?.message).toContain("expected number");
  });

  it("reports invalid option choices", () => {
    const command: CommandDefinition = {
      name: "build",
      description: "Build the project",
      options: [
        {
          name: "mode",
          description: "Mode",
          type: "string",
          choices: ["dev", "prod"],
        },
      ],
      action: () => {},
    };

    const result = parseCommandInput(["--mode", "test"], command);

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.errors[0]?.kind).toBe("InvalidOptionValue");
    expect(result.errors[0]?.message).toContain("choices:");
  });

  it("rejects option bundles with values", () => {
    const command: CommandDefinition = {
      name: "build",
      description: "Build the project",
      options: [
        {
          name: "verbose",
          short: "v",
          description: "Verbose output",
          type: "boolean",
        },
        {
          name: "force",
          short: "f",
          description: "Force run",
          type: "boolean",
        },
      ],
      action: () => {},
    };

    const result = parseCommandInput(["-vf=true"], command);

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.errors[0]?.kind).toBe("InvalidOptionBundle");
  });

  it("reports unknown options inside bundles", () => {
    const command: CommandDefinition = {
      name: "build",
      description: "Build the project",
      options: [
        {
          name: "verbose",
          short: "v",
          description: "Verbose output",
          type: "boolean",
        },
      ],
      action: () => {},
    };

    const result = parseCommandInput(["-vx"], command);

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.errors[0]?.kind).toBe("UnknownOption");
    expect(result.errors[0]?.message).toContain("Unknown option: -x.");
  });

  it("rejects bundles that include non-boolean options", () => {
    const command: CommandDefinition = {
      name: "build",
      description: "Build the project",
      options: [
        {
          name: "output",
          short: "o",
          description: "Output directory",
          type: "string",
        },
        {
          name: "verbose",
          short: "v",
          description: "Verbose output",
          type: "boolean",
        },
      ],
      action: () => {},
    };

    const result = parseCommandInput(["-ov"], command);

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.errors[0]?.kind).toBe("InvalidOptionBundle");
  });

  it("reports unknown long options without suggestions when distant", () => {
    const command: CommandDefinition = {
      name: "build",
      description: "Build the project",
      options: [
        {
          name: "output",
          description: "Output directory",
          type: "string",
        },
      ],
      action: () => {},
    };

    const result = parseCommandInput(["--xyz"], command);

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.errors[0]?.kind).toBe("UnknownOption");
    expect(result.errors[0]?.message).toBe("Unknown option: --xyz.");
  });

  it("reports too many arguments when no variadic is defined", () => {
    const command: CommandDefinition = {
      name: "build",
      description: "Build the project",
      args: [
        {
          name: "entry",
          description: "Entry file",
          type: "string",
          required: true,
        },
      ],
      action: () => {},
    };

    const result = parseCommandInput(["entry.ts", "extra.ts"], command);

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.errors[0]?.kind).toBe("TooManyArguments");
    expect(result.errors[0]?.message).toContain("extra.ts");
  });

  it("uses defaults for optional arguments and keeps undefined when missing", () => {
    const command: CommandDefinition = {
      name: "build",
      description: "Build the project",
      args: [
        {
          name: "config",
          description: "Config file",
          type: "string",
          default: "default.json",
        },
        {
          name: "mode",
          description: "Mode",
          type: "string",
        },
      ],
      action: () => {},
    };

    const result = parseCommandInput([], command);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.args).toEqual({
      config: "default.json",
      mode: undefined,
    });
  });

  it("reports missing required variadic arguments", () => {
    const command: CommandDefinition = {
      name: "build",
      description: "Build the project",
      args: [
        {
          name: "files",
          description: "Input files",
          type: "string",
          variadic: true,
          required: true,
        },
      ],
      action: () => {},
    };

    const result = parseCommandInput([], command);

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.errors[0]?.kind).toBe("MissingRequiredArgument");
  });

  it("reports invalid argument value types", () => {
    const command: CommandDefinition = {
      name: "build",
      description: "Build the project",
      args: [
        {
          name: "count",
          description: "Repeat count",
          type: "number",
          required: true,
        },
      ],
      action: () => {},
    };

    const result = parseCommandInput(["nope"], command);

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.errors[0]?.kind).toBe("InvalidArgumentValue");
    expect(result.errors[0]?.message).toContain("expected number");
  });

  it("reports invalid argument choices", () => {
    const command: CommandDefinition = {
      name: "build",
      description: "Build the project",
      args: [
        {
          name: "mode",
          description: "Mode",
          type: "string",
          required: true,
          choices: ["dev", "prod"],
        },
      ],
      action: () => {},
    };

    const result = parseCommandInput(["test"], command);

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.errors[0]?.kind).toBe("InvalidArgumentValue");
    expect(result.errors[0]?.message).toContain("choices:");
  });
});
