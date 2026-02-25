import type { CliIO, CommandDefinition, GlobalOptions, GlobalOptionsOverride } from "./types.js";
declare class CLI {
    readonly name: string;
    readonly version: string;
    readonly description: string;
    readonly options: GlobalOptions;
    private commands;
    /**
     * Creates a new CLI instance.
     */
    constructor(name: string, version: string, description: string, options?: GlobalOptionsOverride);
    /**
     * Registers a command definition.
     */
    command(definition: CommandDefinition): this;
    /**
     * Runs the CLI and returns an exit code.
     */
    run(argv?: string[], io?: CliIO): Promise<number>;
    /**
     * Runs the CLI and exits the process with the resulting exit code.
     */
    runAndExit(argv?: string[], io?: CliIO): Promise<void>;
    /**
     * Returns registered commands in name order.
     */
    private listCommands;
}
export { CLI };
