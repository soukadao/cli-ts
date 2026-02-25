export type ValueType = "string" | "number" | "boolean";
export type CommandAction = (context: CommandContext) => Promise<void> | void;
export interface CommandContext {
    args: Record<string, unknown>;
    options: Record<string, unknown>;
    rawArgs: string[];
}
export interface OptionDefinition<T = unknown> {
    name: string;
    description: string;
    type: ValueType;
    short?: string;
    required?: boolean;
    default?: T;
    choices?: T[];
}
export interface ArgumentDefinition<T = unknown> {
    name: string;
    description: string;
    type: ValueType;
    required?: boolean;
    default?: T;
    choices?: T[];
    variadic?: boolean;
}
export interface CommandDefinition {
    name: string;
    description: string;
    options?: OptionDefinition[];
    args?: ArgumentDefinition[];
    action: CommandAction;
}
export interface CliIO {
    stdout: (text: string) => void;
    stderr: (text: string) => void;
}
export interface GlobalOptionsOverride {
    help?: OptionDefinition;
    version?: OptionDefinition;
}
export interface GlobalOptions {
    help: OptionDefinition;
    version: OptionDefinition;
}
export type ParseErrorKind = "UnknownOption" | "MissingOptionValue" | "InvalidOptionValue" | "MissingRequiredOption" | "MissingRequiredArgument" | "TooManyArguments" | "InvalidArgumentValue" | "InvalidOptionBundle";
export interface ParseError {
    kind: ParseErrorKind;
    message: string;
}
export type ParseOutcome = {
    ok: true;
    args: Record<string, unknown>;
    options: Record<string, unknown>;
} | {
    ok: false;
    errors: ParseError[];
};
export interface HelpContext {
    name: string;
    version: string;
    description: string;
    commands: CommandDefinition[];
    globalOptions: GlobalOptions;
}
