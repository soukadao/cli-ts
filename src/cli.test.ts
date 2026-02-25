import { describe, expect, it } from "vitest";

import { Cli } from "./cli.js";
import type { CommandContext, CommandDefinition } from "./types.js";

const createIo = () => {
  const stdout: string[] = [];
  const stderr: string[] = [];

  return {
    io: {
      stdout: (text: string) => stdout.push(text),
      stderr: (text: string) => stderr.push(text),
    },
    stdout,
    stderr,
  };
};

describe("Cli", () => {
  it("prints global help when no arguments are provided", async () => {
    const { io, stdout, stderr } = createIo();
    const cli = new Cli("demo", "1.0.0", "Demo CLI");

    const exitCode = await cli.run([], io);

    expect(exitCode).toBe(0);
    expect(stderr).toHaveLength(0);
    expect(stdout[0]).toContain("Usage: demo <command>");
  });

  it("runs a command with parsed input", async () => {
    const { io, stdout, stderr } = createIo();
    const cli = new Cli("demo", "1.0.0", "Demo CLI");

    let captured: CommandContext | null = null;

    const command: CommandDefinition = {
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
          name: "force",
          short: "f",
          description: "Force run",
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
      ],
      action: (context) => {
        captured = context;
      },
    };

    cli.command(command);

    const exitCode = await cli.run(
      ["build", "entry.ts", "--output", "dist", "-f"],
      io,
    );

    expect(exitCode).toBe(0);
    expect(stderr).toHaveLength(0);
    expect(stdout).toHaveLength(0);
    expect(captured).not.toBeNull();
    expect(captured?.options).toEqual({ output: "dist", force: true });
    expect(captured?.args).toEqual({ entry: "entry.ts" });
  });

  it("prints version when --version is provided", async () => {
    const { io, stdout, stderr } = createIo();
    const cli = new Cli("demo", "2.0.0", "Demo CLI");

    const exitCode = await cli.run(["--version"], io);

    expect(exitCode).toBe(0);
    expect(stderr).toHaveLength(0);
    expect(stdout[0]).toBe("demo 2.0.0");
  });

  it("reports unknown commands with suggestions", async () => {
    const { io, stdout, stderr } = createIo();
    const cli = new Cli("demo", "1.0.0", "Demo CLI");

    cli.command({
      name: "build",
      description: "Build the project",
      action: () => {},
    });

    const exitCode = await cli.run(["buid"], io);

    expect(exitCode).toBe(1);
    expect(stdout).toHaveLength(0);
    expect(stderr[0]).toContain("Did you mean build?");
  });
});
