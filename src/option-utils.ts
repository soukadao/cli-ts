import { LONG_PREFIX, SHORT_PREFIX } from "./constants.js";
import type { OptionDefinition, ValueType } from "./types.js";

/**
 * Builds the long flag form for an option name.
 */
export const buildLongFlag = (name: string): string => `${LONG_PREFIX}${name}`;

/**
 * Builds the short flag form for an option short name.
 */
export const buildShortFlag = (short: string): string =>
  `${SHORT_PREFIX}${short}`;

/**
 * Returns the available flags for an option.
 */
export const getOptionFlags = (option: OptionDefinition): string[] =>
  option.short
    ? [buildShortFlag(option.short), buildLongFlag(option.name)]
    : [buildLongFlag(option.name)];

const getValueHint = (type: ValueType): string =>
  type === "boolean" ? "" : ` <${type}>`;

/**
 * Formats the option label for help output.
 */
export const formatOptionLabel = (option: OptionDefinition): string => {
  const flags = getOptionFlags(option).join(", ");
  return `${flags}${getValueHint(option.type)}`;
};
