import { SHORT_NAME_LENGTH, SHORT_PREFIX } from "./constants.js";
import type {
  CommandDefinition,
  GlobalOptions,
  OptionDefinition,
} from "./types.js";

const NAME_PATTERN = /^\S+$/;

const assertUnique = (values: string[], label: string): void => {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) {
      throw new Error(`Duplicate ${label}: ${value}`);
    }
    seen.add(value);
  }
};

const assertOption = (option: OptionDefinition): void => {
  if (!NAME_PATTERN.test(option.name)) {
    throw new Error(`Invalid option name: ${option.name}`);
  }

  if (option.name.startsWith(SHORT_PREFIX)) {
    throw new Error(`Invalid option name: ${option.name}`);
  }

  if (option.short !== undefined && option.short.length !== SHORT_NAME_LENGTH) {
    throw new Error(`Invalid option short name: ${option.short}`);
  }

  if (option.short === SHORT_PREFIX) {
    throw new Error(`Invalid option short name: ${option.short}`);
  }
};

/**
 * Ensures a command definition is valid before registration.
 */
export const assertValidCommandDefinition = (
  command: CommandDefinition,
): void => {
  if (!NAME_PATTERN.test(command.name)) {
    throw new Error(`Invalid command name: ${command.name}`);
  }

  if (command.name.startsWith(SHORT_PREFIX)) {
    throw new Error(`Invalid command name: ${command.name}`);
  }

  const options = command.options ?? [];
  options.forEach(assertOption);

  assertUnique(
    options.map((option) => option.name),
    "option name",
  );

  assertUnique(
    options
      .map((option) => option.short)
      .filter((value): value is string => value !== undefined),
    "option short name",
  );

  const args = command.args ?? [];
  const variadicIndex = args.findIndex((arg) => arg.variadic === true);

  if (variadicIndex !== -1 && variadicIndex !== args.length - 1) {
    throw new Error("Variadic arguments must be the last argument.");
  }

  let hasOptional = false;
  for (const arg of args) {
    if (!NAME_PATTERN.test(arg.name)) {
      throw new Error(`Invalid argument name: ${arg.name}`);
    }

    if (!arg.required) {
      hasOptional = true;
    } else if (hasOptional) {
      throw new Error("Required arguments cannot follow optional arguments.");
    }
  }
};

/**
 * Ensures global options remain safe and predictable.
 */
export const assertValidGlobalOptions = (options: GlobalOptions): void => {
  if (options.help.type !== "boolean") {
    throw new Error("The help option must be boolean.");
  }

  if (options.version.type !== "boolean") {
    throw new Error("The version option must be boolean.");
  }

  assertOption(options.help);
  assertOption(options.version);
};
