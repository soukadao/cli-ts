import { afterEach, describe, expect, it, vi } from "vitest";

import { CLI } from "./cli.js";
import { EMPTY, EXIT_FAILURE, EXIT_SUCCESS } from "./constants.js";
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

afterEach(() => {
  vi.restoreAllMocks();
});

describe("CLI", () => {
  it("prints global help when no arguments are provided", async () => {
    const { io, stdout, stderr } = createIo();
    const cli = new CLI("demo", "1.0.0", "Demo CLI");

    const exitCode = await cli.run([], io);

    expect(exitCode).toBe(EXIT_SUCCESS);
    expect(stderr).toHaveLength(0);
    expect(stdout[0]).toContain("Usage: demo <command>");
  });

  it("runs a command with parsed input", async () => {
    const { io, stdout, stderr } = createIo();
    const cli = new CLI("demo", "1.0.0", "Demo CLI");

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

    expect(exitCode).toBe(EXIT_SUCCESS);
    expect(stderr).toHaveLength(0);
    expect(stdout).toHaveLength(0);
    expect(captured).not.toBeNull();
    expect(captured?.options).toEqual({ output: "dist", force: true });
    expect(captured?.args).toEqual({ entry: "entry.ts" });
  });

  it("prints version when --version is provided", async () => {
    const { io, stdout, stderr } = createIo();
    const cli = new CLI("demo", "2.0.0", "Demo CLI");

    const exitCode = await cli.run(["--version"], io);

    expect(exitCode).toBe(EXIT_SUCCESS);
    expect(stderr).toHaveLength(0);
    expect(stdout[0]).toBe("demo 2.0.0");
  });

  it("treats --version after a command as a command option", async () => {
    const { io, stdout, stderr } = createIo();
    const cli = new CLI("demo", "1.0.0", "Demo CLI");

    cli.command({
      name: "build",
      description: "Build the project",
      action: () => {},
    });

    const exitCode = await cli.run(["build", "--version"], io);

    expect(exitCode).toBe(EXIT_FAILURE);
    expect(stdout).toHaveLength(EMPTY);
    expect(stderr[0]).toBe("Unknown option: --version.");
    expect(stderr[1]).toBe("Run demo build --help for usage.");
  });

  it("reports unknown commands with suggestions", async () => {
    const { io, stdout, stderr } = createIo();
    const cli = new CLI("demo", "1.0.0", "Demo CLI");

    cli.command({
      name: "build",
      description: "Build the project",
      action: () => {},
    });

    const exitCode = await cli.run(["buid"], io);

    expect(exitCode).toBe(EXIT_FAILURE);
    expect(stdout).toHaveLength(0);
    expect(stderr[0]).toContain("Did you mean build?");
  });

  it("prints command help when --help is used with a command", async () => {
    const { io, stdout, stderr } = createIo();
    const cli = new CLI("demo", "1.0.0", "Demo CLI");

    cli.command({
      name: "build",
      description: "Build the project",
      action: () => {},
    });

    const exitCode = await cli.run(["build", "--help"], io);

    expect(exitCode).toBe(EXIT_SUCCESS);
    expect(stderr).toHaveLength(0);
    expect(stdout[0]).toContain("Usage: demo build [options]");
    expect(stdout[0]).toContain("Arguments:");
  });

  it("prints global help when --help is used with an unknown command", async () => {
    const { io, stdout, stderr } = createIo();
    const cli = new CLI("demo", "1.0.0", "Demo CLI");

    const exitCode = await cli.run(["unknown", "--help"], io);

    expect(exitCode).toBe(EXIT_SUCCESS);
    expect(stderr).toHaveLength(0);
    expect(stdout[0]).toContain("Usage: demo <command> [options]");
    expect(stdout[0]).toContain("Commands:");
  });

  it("reports unknown commands without suggestions when distance is too large", async () => {
    const { io, stdout, stderr } = createIo();
    const cli = new CLI("demo", "1.0.0", "Demo CLI");

    cli.command({
      name: "build",
      description: "Build the project",
      action: () => {},
    });

    const exitCode = await cli.run(["xyz"], io);

    expect(exitCode).toBe(EXIT_FAILURE);
    expect(stdout).toHaveLength(0);
    expect(stderr[0]).toBe("Unknown command: xyz.");
  });

  it("reports parse errors with a usage hint", async () => {
    const { io, stdout, stderr } = createIo();
    const cli = new CLI("demo", "1.0.0", "Demo CLI");

    cli.command({
      name: "build",
      description: "Build the project",
      options: [
        {
          name: "output",
          description: "Output directory",
          type: "string",
          required: true,
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
      action: () => {},
    });

    const exitCode = await cli.run(["build"], io);

    expect(exitCode).toBe(EXIT_FAILURE);
    expect(stdout).toHaveLength(0);
    expect(stderr[0]).toContain("Missing required option: --output");
    expect(stderr[0]).toContain("Missing required argument: entry");
    expect(stderr[1]).toBe("Run demo build --help for usage.");
  });

  it("formats non-Error throwables", async () => {
    const { io, stdout, stderr } = createIo();
    const cli = new CLI("demo", "1.0.0", "Demo CLI");

    cli.command({
      name: "boom",
      description: "Explode",
      action: () => {
        throw "boom";
      },
    });

    const exitCode = await cli.run(["boom"], io);

    expect(exitCode).toBe(EXIT_FAILURE);
    expect(stdout).toHaveLength(0);
    expect(stderr[0]).toBe("boom");
  });

  it("prevents duplicate command registration", () => {
    const cli = new CLI("demo", "1.0.0", "Demo CLI");
    const command: CommandDefinition = {
      name: "build",
      description: "Build the project",
      action: () => {},
    };

    cli.command(command);

    expect(() => cli.command(command)).toThrow(
      "Command already registered: build",
    );
  });

  it("uses default IO when none is provided", async () => {
    const stdoutSpy = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
    const stderrSpy = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);
    const cli = new CLI("demo", "1.0.0", "Demo CLI");

    const exitCode = await cli.run([]);

    expect(exitCode).toBe(EXIT_SUCCESS);
    expect(stdoutSpy).toHaveBeenCalled();
    expect(stderrSpy).not.toHaveBeenCalled();
  });

  it("exits the process after running a command", async () => {
    const { io, stderr } = createIo();
    const cli = new CLI("demo", "1.0.0", "Demo CLI");
    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation((() => undefined) as never);

    await cli.runAndExit(["--version"], io);

    expect(stderr).toHaveLength(0);
    expect(exitSpy).toHaveBeenCalledWith(EXIT_SUCCESS);
  });
});
