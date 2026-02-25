import {
  ARGV_OFFSET,
  EMPTY,
  EXIT_FAILURE,
  EXIT_SUCCESS,
  OPTION_TERMINATOR,
  SHORT_PREFIX,
} from "./constants.js";
import { renderCommandHelp, renderGlobalHelp } from "./help.js";
import { buildLongFlag, getOptionFlags } from "./option-utils.js";
import { parseCommandInput } from "./parser.js";
import { findClosest } from "./suggest.js";
import type {
  CliIO,
  CommandContext,
  CommandDefinition,
  GlobalOptions,
  GlobalOptionsOverride,
  HelpContext,
} from "./types.js";
import {
  assertValidCommandDefinition,
  assertValidGlobalOptions,
} from "./validation.js";

const DEFAULT_IO: CliIO = {
  stdout: (text) => process.stdout.write(`${text}\n`),
  stderr: (text) => process.stderr.write(`${text}\n`),
};

const DEFAULT_GLOBAL_OPTIONS: GlobalOptions = {
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
};

const resolveGlobalOptions = (
  override: GlobalOptionsOverride | undefined,
): GlobalOptions => {
  const resolved: GlobalOptions = {
    help: {
      ...DEFAULT_GLOBAL_OPTIONS.help,
      ...override?.help,
      name: DEFAULT_GLOBAL_OPTIONS.help.name,
      type: DEFAULT_GLOBAL_OPTIONS.help.type,
    },
    version: {
      ...DEFAULT_GLOBAL_OPTIONS.version,
      ...override?.version,
      name: DEFAULT_GLOBAL_OPTIONS.version.name,
      type: DEFAULT_GLOBAL_OPTIONS.version.type,
    },
  };

  assertValidGlobalOptions(resolved);
  return resolved;
};

const formatError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
};

const findCommandIndex = (argv: string[]): number => {
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === undefined) {
      continue;
    }

    if (token === OPTION_TERMINATOR) {
      return index + 1 < argv.length ? index + 1 : -1;
    }

    if (!token.startsWith(SHORT_PREFIX)) {
      return index;
    }
  }

  return -1;
};

const buildCommandSuggestion = (
  name: string,
  commands: CommandDefinition[],
): string | undefined => {
  const candidate = findClosest(
    name,
    commands.map((command) => command.name),
  );
  if (!candidate) {
    return undefined;
  }

  return `Did you mean ${candidate}?`;
};

const buildHelpContext = (
  cli: CLI,
  commands: CommandDefinition[],
): HelpContext => ({
  name: cli.name,
  version: cli.version,
  description: cli.description,
  commands,
  globalOptions: cli.options,
});

class CLI {
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly options: GlobalOptions;
  private commands = new Map<string, CommandDefinition>();

  /**
   * Creates a new CLI instance.
   */
  constructor(
    name: string,
    version: string,
    description: string,
    options?: GlobalOptionsOverride,
  ) {
    this.name = name;
    this.version = version;
    this.description = description;
    this.options = resolveGlobalOptions(options);
  }

  /**
   * Registers a command definition.
   */
  command(definition: CommandDefinition): this {
    assertValidCommandDefinition(definition);

    if (this.commands.has(definition.name)) {
      throw new Error(`Command already registered: ${definition.name}`);
    }

    this.commands.set(definition.name, definition);
    return this;
  }

  /**
   * Runs the CLI and returns an exit code.
   */
  async run(
    argv: string[] = process.argv.slice(ARGV_OFFSET),
    io: CliIO = DEFAULT_IO,
  ): Promise<number> {
    const helpFlags = getOptionFlags(this.options.help);
    const versionFlags = getOptionFlags(this.options.version);

    const helpRequested = argv.some((arg) => helpFlags.includes(arg));
    const versionRequested = argv.some((arg) => versionFlags.includes(arg));

    const commandIndex = findCommandIndex(argv);
    const commandName = commandIndex >= EMPTY ? argv[commandIndex] : undefined;
    const commandArgs =
      commandIndex >= EMPTY ? argv.slice(commandIndex + 1) : [];

    const sortedCommands = this.listCommands();
    const helpContext = buildHelpContext(this, sortedCommands);

    if (helpRequested) {
      if (commandName) {
        const command = this.commands.get(commandName);
        if (command) {
          io.stdout(renderCommandHelp(helpContext, command));
          return EXIT_SUCCESS;
        }
      }

      io.stdout(renderGlobalHelp(helpContext));
      return EXIT_SUCCESS;
    }

    if (versionRequested) {
      io.stdout(`${this.name} ${this.version}`);
      return EXIT_SUCCESS;
    }

    if (!commandName) {
      io.stdout(renderGlobalHelp(helpContext));
      return EXIT_SUCCESS;
    }

    const command = this.commands.get(commandName);
    if (!command) {
      const suggestion = buildCommandSuggestion(commandName, sortedCommands);
      const message = suggestion
        ? `Unknown command: ${commandName}. ${suggestion}`
        : `Unknown command: ${commandName}.`;
      io.stderr(message);
      return EXIT_FAILURE;
    }

    const parseResult = parseCommandInput(commandArgs, command);
    if (!parseResult.ok) {
      const message = parseResult.errors
        .map((error) => error.message)
        .join("\n");
      io.stderr(message);
      io.stderr(
        `Run ${this.name} ${command.name} ${buildLongFlag(this.options.help.name)} for usage.`,
      );
      return EXIT_FAILURE;
    }

    const context: CommandContext = {
      args: parseResult.args,
      options: parseResult.options,
      rawArgs: commandArgs,
    };

    try {
      await command.action(context);
      return EXIT_SUCCESS;
    } catch (error) {
      io.stderr(formatError(error));
      return EXIT_FAILURE;
    }
  }

  /**
   * Runs the CLI and exits the process with the resulting exit code.
   */
  async runAndExit(
    argv: string[] = process.argv.slice(ARGV_OFFSET),
    io: CliIO = DEFAULT_IO,
  ): Promise<void> {
    const exitCode = await this.run(argv, io);
    process.exit(exitCode);
  }

  /**
   * Returns registered commands in name order.
   */
  private listCommands(): CommandDefinition[] {
    return [...this.commands.values()].sort((left, right) =>
      left.name.localeCompare(right.name),
    );
  }
}

export { CLI };
