import type { CommandDefinition, ParseOutcome } from "./types.js";
/**
 * Parses the command arguments and options.
 */
export declare const parseCommandInput: (
  argv: string[],
  command: CommandDefinition,
) => ParseOutcome;
