import type { CommandDefinition, GlobalOptions } from "./types.js";
/**
 * Ensures a command definition is valid before registration.
 */
export declare const assertValidCommandDefinition: (
  command: CommandDefinition,
) => void;
/**
 * Ensures global options remain safe and predictable.
 */
export declare const assertValidGlobalOptions: (options: GlobalOptions) => void;
