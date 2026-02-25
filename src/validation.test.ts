import { describe, expect, it } from "vitest";
import type { CommandDefinition, GlobalOptions } from "./types.js";
import {
  assertValidCommandDefinition,
  assertValidGlobalOptions,
} from "./validation.js";

describe("validation", () => {
  it("rejects command names with whitespace", () => {
    const command: CommandDefinition = {
      name: "bad name",
      description: "Bad command",
      action: () => {},
    };

    expect(() => assertValidCommandDefinition(command)).toThrow(
      "Invalid command name: bad name",
    );
  });

  it("rejects command names starting with -", () => {
    const command: CommandDefinition = {
      name: "-bad",
      description: "Bad command",
      action: () => {},
    };

    expect(() => assertValidCommandDefinition(command)).toThrow(
      "Invalid command name: -bad",
    );
  });

  it("rejects duplicate option names", () => {
    const command: CommandDefinition = {
      name: "build",
      description: "Build",
      options: [
        {
          name: "output",
          description: "Output",
          type: "string",
        },
        {
          name: "output",
          description: "Output again",
          type: "string",
        },
      ],
      action: () => {},
    };

    expect(() => assertValidCommandDefinition(command)).toThrow(
      "Duplicate option name: output",
    );
  });

  it("rejects duplicate option short names", () => {
    const command: CommandDefinition = {
      name: "build",
      description: "Build",
      options: [
        {
          name: "output",
          short: "o",
          description: "Output",
          type: "string",
        },
        {
          name: "opt",
          short: "o",
          description: "Opt",
          type: "string",
        },
      ],
      action: () => {},
    };

    expect(() => assertValidCommandDefinition(command)).toThrow(
      "Duplicate option short name: o",
    );
  });

  it("rejects invalid option short names", () => {
    const command: CommandDefinition = {
      name: "build",
      description: "Build",
      options: [
        {
          name: "output",
          short: "ab",
          description: "Output",
          type: "string",
        },
      ],
      action: () => {},
    };

    expect(() => assertValidCommandDefinition(command)).toThrow(
      "Invalid option short name: ab",
    );
  });

  it("rejects option short names that are just -", () => {
    const command: CommandDefinition = {
      name: "build",
      description: "Build",
      options: [
        {
          name: "output",
          short: "-",
          description: "Output",
          type: "string",
        },
      ],
      action: () => {},
    };

    expect(() => assertValidCommandDefinition(command)).toThrow(
      "Invalid option short name: -",
    );
  });

  it("rejects variadic arguments that are not last", () => {
    const command: CommandDefinition = {
      name: "build",
      description: "Build",
      args: [
        {
          name: "files",
          description: "Input files",
          type: "string",
          variadic: true,
        },
        {
          name: "output",
          description: "Output directory",
          type: "string",
        },
      ],
      action: () => {},
    };

    expect(() => assertValidCommandDefinition(command)).toThrow(
      "Variadic arguments must be the last argument.",
    );
  });

  it("rejects required arguments after optional ones", () => {
    const command: CommandDefinition = {
      name: "build",
      description: "Build",
      args: [
        {
          name: "optional",
          description: "Optional",
          type: "string",
        },
        {
          name: "required",
          description: "Required",
          type: "string",
          required: true,
        },
      ],
      action: () => {},
    };

    expect(() => assertValidCommandDefinition(command)).toThrow(
      "Required arguments cannot follow optional arguments.",
    );
  });

  it("rejects invalid argument names", () => {
    const command: CommandDefinition = {
      name: "build",
      description: "Build",
      args: [
        {
          name: "bad name",
          description: "Bad",
          type: "string",
          required: true,
        },
      ],
      action: () => {},
    };

    expect(() => assertValidCommandDefinition(command)).toThrow(
      "Invalid argument name: bad name",
    );
  });

  it("requires global help and version options to be boolean", () => {
    const options: GlobalOptions = {
      help: {
        name: "help",
        description: "Help",
        type: "string",
      },
      version: {
        name: "version",
        description: "Version",
        type: "number",
      },
    };

    expect(() => assertValidGlobalOptions(options)).toThrow(
      "The help option must be boolean.",
    );
  });

  it("rejects non-boolean version options", () => {
    const options: GlobalOptions = {
      help: {
        name: "help",
        description: "Help",
        type: "boolean",
      },
      version: {
        name: "version",
        description: "Version",
        type: "string",
      },
    };

    expect(() => assertValidGlobalOptions(options)).toThrow(
      "The version option must be boolean.",
    );
  });
});
