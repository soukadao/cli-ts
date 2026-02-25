import type { OptionDefinition } from "./types.js";
/**
 * Builds the long flag form for an option name.
 */
export declare const buildLongFlag: (name: string) => string;
/**
 * Builds the short flag form for an option short name.
 */
export declare const buildShortFlag: (short: string) => string;
/**
 * Returns the available flags for an option.
 */
export declare const getOptionFlags: (option: OptionDefinition) => string[];
/**
 * Formats the option label for help output.
 */
export declare const formatOptionLabel: (option: OptionDefinition) => string;
