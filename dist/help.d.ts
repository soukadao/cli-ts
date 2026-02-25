import type { CommandDefinition, HelpContext } from "./types.js";
/**
 * Renders the global help text.
 */
export declare const renderGlobalHelp: (context: HelpContext) => string;
/**
 * Renders the command-specific help text.
 */
export declare const renderCommandHelp: (context: HelpContext, command: CommandDefinition) => string;
