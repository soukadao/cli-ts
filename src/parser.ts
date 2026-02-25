import {
  BOOLEAN_FALSE,
  BOOLEAN_TRUE,
  EMPTY,
  EQUALS_SEPARATOR,
  LONG_PREFIX,
  OPTION_TERMINATOR,
  SHORT_PREFIX,
  SINGLE_CHAR_LENGTH,
} from "./constants.js";
import { buildLongFlag, buildShortFlag } from "./option-utils.js";
import { findClosest } from "./suggest.js";
import type {
  ArgumentDefinition,
  CommandDefinition,
  OptionDefinition,
  ParseError,
  ParseOutcome,
} from "./types.js";

const DEFAULT_BOOLEAN_VALUE = false;

const hasOwn = <T extends object>(value: T, key: string): boolean =>
  Object.hasOwn(value, key);

const splitOnEquals = (
  token: string,
): { head: string; value: string | undefined } => {
  const index = token.indexOf(EQUALS_SEPARATOR);
  if (index === -1) {
    return { head: token, value: undefined };
  }

  return {
    head: token.slice(EMPTY, index),
    value: token.slice(index + SINGLE_CHAR_LENGTH),
  };
};

const createError = (
  kind: ParseError["kind"],
  message: string,
): ParseError => ({
  kind,
  message,
});

const getTypeLabel = (type: OptionDefinition["type"]): string => type;

const formatValue = (value: unknown): string => {
  if (Array.isArray(value)) {
    return `[${value.map((item) => formatValue(item)).join(", ")}]`;
  }

  if (typeof value === "string") {
    return `"${value}"`;
  }

  return String(value);
};

const normalizeChoices = (choices: unknown[] | undefined): string => {
  if (!choices || choices.length === EMPTY) {
    return "";
  }

  const formatted = choices.map((choice) => formatValue(choice)).join(", ");
  return ` (choices: ${formatted})`;
};

const coerceValue = (
  raw: string,
  type: OptionDefinition["type"],
): { ok: true; value: unknown } | { ok: false } => {
  switch (type) {
    case "string":
      return { ok: true, value: raw };
    case "number": {
      const value = Number(raw);
      if (Number.isNaN(value)) {
        return { ok: false };
      }
      return { ok: true, value };
    }
    case "boolean":
      if (raw === BOOLEAN_TRUE) {
        return { ok: true, value: true };
      }
      if (raw === BOOLEAN_FALSE) {
        return { ok: true, value: false };
      }
      return { ok: false };
  }
};

const applyChoices = (
  value: unknown,
  definition: OptionDefinition | ArgumentDefinition,
): boolean => {
  if (!definition.choices) {
    return true;
  }

  return definition.choices.some((choice) => choice === value);
};

const isKnownOptionToken = (
  token: string,
  longOptions: Map<string, OptionDefinition>,
  shortOptions: Map<string, OptionDefinition>,
): boolean => {
  if (!token.startsWith(SHORT_PREFIX)) {
    return false;
  }

  if (token.startsWith(LONG_PREFIX)) {
    const { head } = splitOnEquals(token);
    const longName = head.slice(LONG_PREFIX.length);
    return longOptions.has(longName);
  }

  const shortName = token.slice(SHORT_PREFIX.length, SHORT_PREFIX.length + 1);
  return shortOptions.has(shortName);
};

const initializeOptionValues = (
  options: OptionDefinition[],
): Record<string, unknown> => {
  const initial: Record<string, unknown> = {};
  for (const option of options) {
    if (hasOwn(option, "default")) {
      initial[option.name] = option.default;
    } else if (option.type === "boolean") {
      initial[option.name] = DEFAULT_BOOLEAN_VALUE;
    }
  }
  return initial;
};

const buildOptionMaps = (options: OptionDefinition[]) => {
  const longOptions = new Map<string, OptionDefinition>();
  const shortOptions = new Map<string, OptionDefinition>();

  for (const option of options) {
    longOptions.set(option.name, option);
    if (option.short) {
      shortOptions.set(option.short, option);
    }
  }

  return { longOptions, shortOptions };
};

const parseOptionValue = (
  option: OptionDefinition,
  raw: string,
  label: string,
): { value?: unknown; error?: ParseError } => {
  const parsed = coerceValue(raw, option.type);
  if (!parsed.ok) {
    return {
      error: createError(
        "InvalidOptionValue",
        `Invalid value for option: ${label} (expected ${getTypeLabel(option.type)})`,
      ),
    };
  }

  if (!applyChoices(parsed.value, option)) {
    return {
      error: createError(
        "InvalidOptionValue",
        `Invalid value for option: ${label}${normalizeChoices(option.choices)}`,
      ),
    };
  }

  return { value: parsed.value };
};

const parseArgumentValue = (
  argument: ArgumentDefinition,
  raw: string,
): { value?: unknown; error?: ParseError } => {
  const parsed = coerceValue(raw, argument.type);
  if (!parsed.ok) {
    return {
      error: createError(
        "InvalidArgumentValue",
        `Invalid value for argument: ${argument.name} (expected ${getTypeLabel(argument.type)})`,
      ),
    };
  }

  if (!applyChoices(parsed.value, argument)) {
    return {
      error: createError(
        "InvalidArgumentValue",
        `Invalid value for argument: ${argument.name}${normalizeChoices(argument.choices)}`,
      ),
    };
  }

  return { value: parsed.value };
};

const parseArguments = (
  positionals: string[],
  argumentsDefinition: ArgumentDefinition[],
): { args: Record<string, unknown>; errors: ParseError[] } => {
  const args: Record<string, unknown> = {};
  const errors: ParseError[] = [];

  const variadicIndex = argumentsDefinition.findIndex(
    (definition) => definition.variadic === true,
  );

  if (variadicIndex === -1 && positionals.length > argumentsDefinition.length) {
    const extras = positionals.slice(argumentsDefinition.length).join(", ");
    errors.push(
      createError("TooManyArguments", `Too many arguments: ${extras}`),
    );
  }

  for (let index = 0; index < argumentsDefinition.length; index += 1) {
    const definition = argumentsDefinition[index];
    if (!definition) {
      continue;
    }

    if (definition.variadic) {
      const rest = positionals.slice(index);
      const values: unknown[] = [];

      if (rest.length === EMPTY && definition.required) {
        errors.push(
          createError(
            "MissingRequiredArgument",
            `Missing required argument: ${definition.name}`,
          ),
        );
      }

      for (const raw of rest) {
        const { value, error } = parseArgumentValue(definition, raw);
        if (error) {
          errors.push(error);
        } else {
          values.push(value);
        }
      }

      args[definition.name] = values;
      break;
    }

    const raw = positionals[index];
    if (raw === undefined) {
      if (definition.required) {
        errors.push(
          createError(
            "MissingRequiredArgument",
            `Missing required argument: ${definition.name}`,
          ),
        );
      } else if (hasOwn(definition, "default")) {
        args[definition.name] = definition.default;
      } else {
        args[definition.name] = undefined;
      }
      continue;
    }

    const { value, error } = parseArgumentValue(definition, raw);
    if (error) {
      errors.push(error);
    } else {
      args[definition.name] = value;
    }
  }

  return { args, errors };
};

const registerOptionValue = (
  option: OptionDefinition,
  raw: string,
  label: string,
  values: Record<string, unknown>,
  errors: ParseError[],
  presentOptions: Set<string>,
): void => {
  const parsed = parseOptionValue(option, raw, label);
  if (parsed.error) {
    errors.push(parsed.error);
    return;
  }

  values[option.name] = parsed.value;
  presentOptions.add(option.name);
};

const buildUnknownOptionMessage = (
  token: string,
  candidates: string[],
): string => {
  const suggestion = findClosest(token, candidates);
  if (suggestion) {
    return `Unknown option: ${token}. Did you mean ${suggestion}?`;
  }
  return `Unknown option: ${token}.`;
};

/**
 * Parses the command arguments and options.
 */
export const parseCommandInput = (
  argv: string[],
  command: CommandDefinition,
): ParseOutcome => {
  const optionDefinitions = command.options ?? [];
  const argumentDefinitions = command.args ?? [];
  const { longOptions, shortOptions } = buildOptionMaps(optionDefinitions);

  const values = initializeOptionValues(optionDefinitions);
  const presentOptions = new Set<string>();
  const positionals: string[] = [];
  const errors: ParseError[] = [];

  let index = 0;
  let allowOptions = true;

  while (index < argv.length) {
    const token = argv[index];
    if (token === undefined) {
      index += 1;
      continue;
    }

    if (allowOptions && token === OPTION_TERMINATOR) {
      allowOptions = false;
      index += 1;
      continue;
    }

    if (
      allowOptions &&
      token.startsWith(LONG_PREFIX) &&
      token.length > LONG_PREFIX.length
    ) {
      const { head, value } = splitOnEquals(token);
      const longName = head.slice(LONG_PREFIX.length);
      const option = longOptions.get(longName);

      if (!option) {
        const candidates = optionDefinitions.map((definition) =>
          buildLongFlag(definition.name),
        );
        errors.push(
          createError(
            "UnknownOption",
            buildUnknownOptionMessage(token, candidates),
          ),
        );
        index += 1;
        continue;
      }

      const label = buildLongFlag(option.name);
      if (option.type === "boolean") {
        if (value === undefined) {
          values[option.name] = true;
          presentOptions.add(option.name);
        } else {
          registerOptionValue(
            option,
            value,
            label,
            values,
            errors,
            presentOptions,
          );
        }
        index += 1;
        continue;
      }

      if (value === undefined) {
        const next = argv[index + 1];
        if (
          next === undefined ||
          next === OPTION_TERMINATOR ||
          isKnownOptionToken(next, longOptions, shortOptions)
        ) {
          errors.push(
            createError(
              "MissingOptionValue",
              `Missing value for option: ${label}`,
            ),
          );
          index += 1;
          continue;
        }
        registerOptionValue(
          option,
          next,
          label,
          values,
          errors,
          presentOptions,
        );
        index += 2;
        continue;
      }

      registerOptionValue(option, value, label, values, errors, presentOptions);
      index += 1;
      continue;
    }

    if (
      allowOptions &&
      token.startsWith(SHORT_PREFIX) &&
      token.length > SHORT_PREFIX.length
    ) {
      const { head, value } = splitOnEquals(token);
      const shortBody = head.slice(SHORT_PREFIX.length);

      if (shortBody.length > SINGLE_CHAR_LENGTH) {
        if (value !== undefined) {
          errors.push(
            createError(
              "InvalidOptionBundle",
              `Invalid option bundle: ${token}`,
            ),
          );
          index += 1;
          continue;
        }

        let bundleError = false;
        for (const shortName of shortBody) {
          const option = shortOptions.get(shortName);
          if (!option) {
            const candidates = optionDefinitions.flatMap((definition) =>
              definition.short
                ? [
                    buildShortFlag(definition.short),
                    buildLongFlag(definition.name),
                  ]
                : [buildLongFlag(definition.name)],
            );
            errors.push(
              createError(
                "UnknownOption",
                buildUnknownOptionMessage(
                  buildShortFlag(shortName),
                  candidates,
                ),
              ),
            );
            bundleError = true;
            break;
          }

          if (option.type !== "boolean") {
            errors.push(
              createError(
                "InvalidOptionBundle",
                `Invalid option bundle: ${token}`,
              ),
            );
            bundleError = true;
            break;
          }

          values[option.name] = true;
          presentOptions.add(option.name);
        }

        if (bundleError) {
          index += 1;
          continue;
        }

        index += 1;
        continue;
      }

      const option = shortOptions.get(shortBody);
      if (!option) {
        const candidates = optionDefinitions.flatMap((definition) =>
          definition.short
            ? [buildShortFlag(definition.short), buildLongFlag(definition.name)]
            : [buildLongFlag(definition.name)],
        );
        errors.push(
          createError(
            "UnknownOption",
            buildUnknownOptionMessage(buildShortFlag(shortBody), candidates),
          ),
        );
        index += 1;
        continue;
      }

      const label = buildShortFlag(option.short ?? shortBody);

      if (option.type === "boolean") {
        values[option.name] = true;
        presentOptions.add(option.name);
        index += 1;
        continue;
      }

      if (value === undefined) {
        const next = argv[index + 1];
        if (
          next === undefined ||
          next === OPTION_TERMINATOR ||
          isKnownOptionToken(next, longOptions, shortOptions)
        ) {
          errors.push(
            createError(
              "MissingOptionValue",
              `Missing value for option: ${label}`,
            ),
          );
          index += 1;
          continue;
        }
        registerOptionValue(
          option,
          next,
          label,
          values,
          errors,
          presentOptions,
        );
        index += 2;
        continue;
      }

      registerOptionValue(option, value, label, values, errors, presentOptions);
      index += 1;
      continue;
    }

    positionals.push(token);
    index += 1;
  }

  for (const option of optionDefinitions) {
    if (option.required && !presentOptions.has(option.name)) {
      errors.push(
        createError(
          "MissingRequiredOption",
          `Missing required option: ${buildLongFlag(option.name)}`,
        ),
      );
    }
  }

  const { args, errors: argumentErrors } = parseArguments(
    positionals,
    argumentDefinitions,
  );

  errors.push(...argumentErrors);

  if (errors.length > EMPTY) {
    return { ok: false, errors };
  }

  return { ok: true, args, options: values };
};
