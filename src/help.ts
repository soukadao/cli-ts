import {
  COLUMN_GAP,
  EMPTY,
  INDENT,
  USAGE_COMMAND_PLACEHOLDER,
  USAGE_OPTIONS_PLACEHOLDER,
} from "./constants.js";
import { formatOptionLabel } from "./option-utils.js";
import type {
  ArgumentDefinition,
  CommandDefinition,
  HelpContext,
  OptionDefinition,
} from "./types.js";

const hasOwn = <T extends object>(value: T, key: string): boolean =>
  Object.hasOwn(value, key);

const formatValue = (value: unknown): string => {
  if (Array.isArray(value)) {
    return `[${value.map((item) => formatValue(item)).join(", ")}]`;
  }

  if (typeof value === "string") {
    return `"${value}"`;
  }

  return String(value);
};

const formatDescription = (
  definition: OptionDefinition | ArgumentDefinition,
): string => {
  const suffixes: string[] = [];

  if (definition.required) {
    suffixes.push("required");
  }

  if (hasOwn(definition, "default")) {
    suffixes.push(`default: ${formatValue(definition.default)}`);
  }

  if (definition.choices && definition.choices.length > EMPTY) {
    suffixes.push(
      `choices: ${definition.choices.map((choice) => formatValue(choice)).join(", ")}`,
    );
  }

  if (suffixes.length === EMPTY) {
    return definition.description;
  }

  return `${definition.description} (${suffixes.join(", ")})`;
};

const formatArgumentUsage = (definition: ArgumentDefinition): string => {
  const name = definition.variadic ? `${definition.name}...` : definition.name;
  return definition.required ? `<${name}>` : `[${name}]`;
};

const buildUsage = (
  context: HelpContext,
  command?: CommandDefinition,
): string => {
  const segments: string[] = [context.name];

  if (command) {
    segments.push(command.name);
  } else {
    segments.push(USAGE_COMMAND_PLACEHOLDER);
  }

  segments.push(USAGE_OPTIONS_PLACEHOLDER);

  if (command?.args && command.args.length > EMPTY) {
    segments.push(command.args.map(formatArgumentUsage).join(" "));
  }

  return `Usage: ${segments.join(" ")}`;
};

const renderCommands = (commands: CommandDefinition[]): string[] => {
  const lines: string[] = ["", "Commands:"];

  if (commands.length === EMPTY) {
    lines.push(`${INDENT}(none)`);
    return lines;
  }

  const nameWidth = Math.max(
    ...commands.map((command) => command.name.length),
    EMPTY,
  );

  for (const command of commands) {
    lines.push(
      `${INDENT}${command.name.padEnd(nameWidth)}${" ".repeat(COLUMN_GAP)}${command.description}`,
    );
  }

  return lines;
};

const renderOptions = (
  title: string,
  options: OptionDefinition[],
): string[] => {
  const lines: string[] = ["", title];

  const labelWidth = Math.max(
    ...options.map((option) => formatOptionLabel(option).length),
    EMPTY,
  );

  for (const option of options) {
    const label = formatOptionLabel(option);
    lines.push(
      `${INDENT}${label.padEnd(labelWidth)}${" ".repeat(COLUMN_GAP)}${formatDescription(option)}`,
    );
  }

  return lines;
};

const renderArguments = (args: ArgumentDefinition[]): string[] => {
  const lines: string[] = ["", "Arguments:"];

  if (args.length === EMPTY) {
    lines.push(`${INDENT}(none)`);
    return lines;
  }

  const nameWidth = Math.max(...args.map((arg) => arg.name.length), EMPTY);

  for (const arg of args) {
    lines.push(
      `${INDENT}${arg.name.padEnd(nameWidth)}${" ".repeat(COLUMN_GAP)}${formatDescription(arg)}`,
    );
  }

  return lines;
};

/**
 * Renders the global help text.
 */
export const renderGlobalHelp = (context: HelpContext): string => {
  const lines: string[] = [buildUsage(context)];

  if (context.description) {
    lines.push("", context.description);
  }

  lines.push(...renderCommands(context.commands));
  lines.push(
    ...renderOptions("Options:", [
      context.globalOptions.help,
      context.globalOptions.version,
    ]),
  );

  return lines.join("\n");
};

/**
 * Renders the command-specific help text.
 */
export const renderCommandHelp = (
  context: HelpContext,
  command: CommandDefinition,
): string => {
  const lines: string[] = [buildUsage(context, command)];

  if (command.description) {
    lines.push("", command.description);
  }

  lines.push(...renderArguments(command.args ?? []));
  lines.push(
    ...renderOptions("Options:", [
      ...(command.options ?? []),
      context.globalOptions.help,
      context.globalOptions.version,
    ]),
  );

  return lines.join("\n");
};
