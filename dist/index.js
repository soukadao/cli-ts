// src/constants.ts
var EXIT_SUCCESS = 0;
var EXIT_FAILURE = 1;
var ARGV_OFFSET = 2;
var EMPTY = 0;
var SINGLE_CHAR_LENGTH = 1;
var COLUMN_GAP = 2;
var INDENT = "  ";
var SHORT_PREFIX = "-";
var LONG_PREFIX = "--";
var OPTION_TERMINATOR = "--";
var EQUALS_SEPARATOR = "=";
var BOOLEAN_TRUE = "true";
var BOOLEAN_FALSE = "false";
var MAX_SUGGESTION_DISTANCE = 2;
var USAGE_COMMAND_PLACEHOLDER = "<command>";
var USAGE_OPTIONS_PLACEHOLDER = "[options]";
var SHORT_NAME_LENGTH = 1;

// src/option-utils.ts
var buildLongFlag = (name) => `${LONG_PREFIX}${name}`;
var buildShortFlag = (short) => `${SHORT_PREFIX}${short}`;
var getOptionFlags = (option) =>
  option.short
    ? [buildShortFlag(option.short), buildLongFlag(option.name)]
    : [buildLongFlag(option.name)];
var getValueHint = (type) => (type === "boolean" ? "" : ` <${type}>`);
var formatOptionLabel = (option) => {
  const flags = getOptionFlags(option).join(", ");
  return `${flags}${getValueHint(option.type)}`;
};

// src/help.ts
var hasOwn = (value, key) => Object.hasOwn(value, key);
var formatValue = (value) => {
  if (Array.isArray(value)) {
    return `[${value.map((item) => formatValue(item)).join(", ")}]`;
  }
  if (typeof value === "string") {
    return `"${value}"`;
  }
  return String(value);
};
var formatDescription = (definition) => {
  const suffixes = [];
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
var formatArgumentUsage = (definition) => {
  const name = definition.variadic ? `${definition.name}...` : definition.name;
  return definition.required ? `<${name}>` : `[${name}]`;
};
var buildUsage = (context, command) => {
  const segments = [context.name];
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
var renderCommands = (commands) => {
  const lines = ["", "Commands:"];
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
var renderOptions = (title, options) => {
  const lines = ["", title];
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
var renderArguments = (args) => {
  const lines = ["", "Arguments:"];
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
var renderGlobalHelp = (context) => {
  const lines = [buildUsage(context)];
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
var renderCommandHelp = (context, command) => {
  const lines = [buildUsage(context, command)];
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

// src/suggest.ts
var NORMALIZE_PATTERN = /^-+/;
var levenshteinDistance = (source, target) => {
  if (source === target) {
    return 0;
  }
  const sourceLength = source.length;
  const targetLength = target.length;
  if (sourceLength === 0) {
    return targetLength;
  }
  if (targetLength === 0) {
    return sourceLength;
  }
  const matrix = Array.from({ length: sourceLength + 1 }, () =>
    Array.from({ length: targetLength + 1 }, () => 0),
  );
  for (let i = 0; i <= sourceLength; i += 1) {
    matrix[i][0] = i;
  }
  for (let j = 0; j <= targetLength; j += 1) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= sourceLength; i += 1) {
    for (let j = 1; j <= targetLength; j += 1) {
      const substitutionCost = source[i - 1] === target[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + substitutionCost,
      );
    }
  }
  return matrix[sourceLength][targetLength];
};
var normalizeCandidate = (value) => value.replace(NORMALIZE_PATTERN, "");
var findClosest = (value, candidates) => {
  const normalized = normalizeCandidate(value);
  let bestCandidate;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const candidate of candidates) {
    const distance = levenshteinDistance(
      normalizeCandidate(candidate),
      normalized,
    );
    if (distance < bestDistance) {
      bestDistance = distance;
      bestCandidate = candidate;
    }
  }
  if (bestDistance <= MAX_SUGGESTION_DISTANCE) {
    return bestCandidate;
  }
  return void 0;
};

// src/parser.ts
var DEFAULT_BOOLEAN_VALUE = false;
var hasOwn2 = (value, key) => Object.hasOwn(value, key);
var splitOnEquals = (token) => {
  const index = token.indexOf(EQUALS_SEPARATOR);
  if (index === -1) {
    return { head: token, value: void 0 };
  }
  return {
    head: token.slice(EMPTY, index),
    value: token.slice(index + SINGLE_CHAR_LENGTH),
  };
};
var createError = (kind, message) => ({
  kind,
  message,
});
var getTypeLabel = (type) => type;
var formatValue2 = (value) => {
  if (Array.isArray(value)) {
    return `[${value.map((item) => formatValue2(item)).join(", ")}]`;
  }
  if (typeof value === "string") {
    return `"${value}"`;
  }
  return String(value);
};
var normalizeChoices = (choices) => {
  if (!choices || choices.length === EMPTY) {
    return "";
  }
  const formatted = choices.map((choice) => formatValue2(choice)).join(", ");
  return ` (choices: ${formatted})`;
};
var coerceValue = (raw, type) => {
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
var applyChoices = (value, definition) => {
  if (!definition.choices) {
    return true;
  }
  return definition.choices.some((choice) => choice === value);
};
var isKnownOptionToken = (token, longOptions, shortOptions) => {
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
var initializeOptionValues = (options) => {
  const initial = {};
  for (const option of options) {
    if (hasOwn2(option, "default")) {
      initial[option.name] = option.default;
    } else if (option.type === "boolean") {
      initial[option.name] = DEFAULT_BOOLEAN_VALUE;
    }
  }
  return initial;
};
var buildOptionMaps = (options) => {
  const longOptions = /* @__PURE__ */ new Map();
  const shortOptions = /* @__PURE__ */ new Map();
  for (const option of options) {
    longOptions.set(option.name, option);
    if (option.short) {
      shortOptions.set(option.short, option);
    }
  }
  return { longOptions, shortOptions };
};
var parseOptionValue = (option, raw, label) => {
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
var parseArgumentValue = (argument, raw) => {
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
var parseArguments = (positionals, argumentsDefinition) => {
  const args = {};
  const errors = [];
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
      const values = [];
      if (rest.length === EMPTY && definition.required) {
        errors.push(
          createError(
            "MissingRequiredArgument",
            `Missing required argument: ${definition.name}`,
          ),
        );
      }
      for (const raw2 of rest) {
        const { value: value2, error: error2 } = parseArgumentValue(
          definition,
          raw2,
        );
        if (error2) {
          errors.push(error2);
        } else {
          values.push(value2);
        }
      }
      args[definition.name] = values;
      break;
    }
    const raw = positionals[index];
    if (raw === void 0) {
      if (definition.required) {
        errors.push(
          createError(
            "MissingRequiredArgument",
            `Missing required argument: ${definition.name}`,
          ),
        );
      } else if (hasOwn2(definition, "default")) {
        args[definition.name] = definition.default;
      } else {
        args[definition.name] = void 0;
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
var registerOptionValue = (
  option,
  raw,
  label,
  values,
  errors,
  presentOptions,
) => {
  const parsed = parseOptionValue(option, raw, label);
  if (parsed.error) {
    errors.push(parsed.error);
    return;
  }
  values[option.name] = parsed.value;
  presentOptions.add(option.name);
};
var buildUnknownOptionMessage = (token, candidates) => {
  const suggestion = findClosest(token, candidates);
  if (suggestion) {
    return `Unknown option: ${token}. Did you mean ${suggestion}?`;
  }
  return `Unknown option: ${token}.`;
};
var parseCommandInput = (argv, command) => {
  const optionDefinitions = command.options ?? [];
  const argumentDefinitions = command.args ?? [];
  const { longOptions, shortOptions } = buildOptionMaps(optionDefinitions);
  const values = initializeOptionValues(optionDefinitions);
  const presentOptions = /* @__PURE__ */ new Set();
  const positionals = [];
  const errors = [];
  let index = 0;
  let allowOptions = true;
  while (index < argv.length) {
    const token = argv[index];
    if (token === void 0) {
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
        if (value === void 0) {
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
      if (value === void 0) {
        const next = argv[index + 1];
        if (
          next === void 0 ||
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
        if (value !== void 0) {
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
          const option2 = shortOptions.get(shortName);
          if (!option2) {
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
          if (option2.type !== "boolean") {
            errors.push(
              createError(
                "InvalidOptionBundle",
                `Invalid option bundle: ${token}`,
              ),
            );
            bundleError = true;
            break;
          }
          values[option2.name] = true;
          presentOptions.add(option2.name);
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
      if (value === void 0) {
        const next = argv[index + 1];
        if (
          next === void 0 ||
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

// src/validation.ts
var NAME_PATTERN = /^\S+$/;
var assertUnique = (values, label) => {
  const seen = /* @__PURE__ */ new Set();
  for (const value of values) {
    if (seen.has(value)) {
      throw new Error(`Duplicate ${label}: ${value}`);
    }
    seen.add(value);
  }
};
var assertOption = (option) => {
  if (!NAME_PATTERN.test(option.name)) {
    throw new Error(`Invalid option name: ${option.name}`);
  }
  if (option.name.startsWith(SHORT_PREFIX)) {
    throw new Error(`Invalid option name: ${option.name}`);
  }
  if (option.short !== void 0 && option.short.length !== SHORT_NAME_LENGTH) {
    throw new Error(`Invalid option short name: ${option.short}`);
  }
  if (option.short === SHORT_PREFIX) {
    throw new Error(`Invalid option short name: ${option.short}`);
  }
};
var assertValidCommandDefinition = (command) => {
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
    options.map((option) => option.short).filter((value) => value !== void 0),
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
var assertValidGlobalOptions = (options) => {
  if (options.help.type !== "boolean") {
    throw new Error("The help option must be boolean.");
  }
  if (options.version.type !== "boolean") {
    throw new Error("The version option must be boolean.");
  }
  assertOption(options.help);
  assertOption(options.version);
};

// src/cli.ts
var DEFAULT_IO = {
  stdout: (text) =>
    process.stdout.write(`${text}
`),
  stderr: (text) =>
    process.stderr.write(`${text}
`),
};
var DEFAULT_GLOBAL_OPTIONS = {
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
var resolveGlobalOptions = (override) => {
  const resolved = {
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
var formatError = (error) => {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
};
var findCommandIndex = (argv) => {
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === void 0) {
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
var buildCommandSuggestion = (name, commands) => {
  const candidate = findClosest(
    name,
    commands.map((command) => command.name),
  );
  if (!candidate) {
    return void 0;
  }
  return `Did you mean ${candidate}?`;
};
var buildHelpContext = (cli, commands) => ({
  name: cli.name,
  version: cli.version,
  description: cli.description,
  commands,
  globalOptions: cli.options,
});
var CLI = class {
  name;
  version;
  description;
  options;
  commands = /* @__PURE__ */ new Map();
  /**
   * Creates a new CLI instance.
   */
  constructor(name, version, description, options) {
    this.name = name;
    this.version = version;
    this.description = description;
    this.options = resolveGlobalOptions(options);
  }
  /**
   * Registers a command definition.
   */
  command(definition) {
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
  async run(argv = process.argv.slice(ARGV_OFFSET), io = DEFAULT_IO) {
    const helpFlags = getOptionFlags(this.options.help);
    const versionFlags = getOptionFlags(this.options.version);
    const helpRequested = argv.some((arg) => helpFlags.includes(arg));
    const versionRequested = argv.some((arg) => versionFlags.includes(arg));
    const commandIndex = findCommandIndex(argv);
    const commandName = commandIndex >= EMPTY ? argv[commandIndex] : void 0;
    const commandArgs =
      commandIndex >= EMPTY ? argv.slice(commandIndex + 1) : [];
    const sortedCommands = this.listCommands();
    const helpContext = buildHelpContext(this, sortedCommands);
    if (helpRequested) {
      if (commandName) {
        const command2 = this.commands.get(commandName);
        if (command2) {
          io.stdout(renderCommandHelp(helpContext, command2));
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
    const context = {
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
   * Returns registered commands in name order.
   */
  listCommands() {
    return [...this.commands.values()].sort((left, right) =>
      left.name.localeCompare(right.name),
    );
  }
};
export { CLI };
//# sourceMappingURL=index.js.map
