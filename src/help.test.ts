import { describe, expect, it } from "vitest";

import { renderCommandHelp, renderGlobalHelp } from "./help.js";
import type {
  CommandDefinition,
  HelpContext,
  OptionDefinition,
} from "./types.js";

const DEFAULT_COUNT = 1;

const globalOptions = {
  help: {
    name: "help",
    short: "h",
    description: "Show help",
    type: "boolean",
  },
  version: {
    name: "version",
    short: "v",
    description: "Show version",
    type: "boolean",
  },
} satisfies { help: OptionDefinition; version: OptionDefinition };

const baseContext: HelpContext = {
  name: "demo",
  version: "1.0.0",
  description: "Demo CLI",
  commands: [],
  globalOptions,
};

describe("help rendering", () => {
  it("renders global help with description and empty commands", () => {
    const output = renderGlobalHelp(baseContext);

    expect(output).toContain("Usage: demo <command> [options]");
    expect(output).toContain("Demo CLI");
    expect(output).toContain("Commands:");
    expect(output).toContain("(none)");
    expect(output).toContain("-h, --help");
    expect(output).toContain("-v, --version");
  });

  it("renders command help with required, defaults, choices, and variadic args", () => {
    const command: CommandDefinition = {
      name: "build",
      description: "Build the project",
      options: [
        {
          name: "mode",
          short: "m",
          description: "Mode",
          type: "string",
          required: true,
          choices: ["dev", "prod"],
        },
        {
          name: "count",
          description: "Repeat count",
          type: "number",
          default: DEFAULT_COUNT,
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
          name: "files",
          description: "Input files",
          type: "string",
          variadic: true,
          required: true,
        },
      ],
      action: () => {},
    };

    const output = renderCommandHelp(
      { ...baseContext, commands: [command] },
      command,
    );

    expect(output).toContain("Usage: demo build [options] <entry> <files...>");
    expect(output).toContain("Arguments:");
    expect(output).toContain("Options:");
    expect(output).toContain("required");
    expect(output).toContain(`default: ${DEFAULT_COUNT}`);
    expect(output).toContain("choices:");
  });

  it("renders empty arguments section when none are defined", () => {
    const command: CommandDefinition = {
      name: "version",
      description: "Show version",
      action: () => {},
    };

    const output = renderCommandHelp(
      { ...baseContext, commands: [command] },
      command,
    );

    expect(output).toContain("Arguments:");
    expect(output).toContain("(none)");
  });
});
