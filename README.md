# cli-ts

A small, safe, and modular CLI foundation.

## Features
- Declarative command definitions with typed options and arguments.
- Safe parsing with clear error messages and suggestions.
- Command and global help generation.
- Pure, testable modules (parser/help/validation are decoupled from execution).

## Usage
```ts
import { Cli } from "./src/index.js";
import pkg from "../package.json" with { type: "json" }; 

const cli = new Cli(pkg.name, pkg.version, pkg.description);

cli.command({
  name: "build",
  description: "Build the project",
  options: [
    {
      name: "output",
      short: "o",
      description: "Output directory",
      type: "string",
      required: true
    },
    {
      name: "force",
      short: "f",
      description: "Force execution",
      type: "boolean"
    }
  ],
  args: [
    {
      name: "entry",
      description: "Entry file",
      type: "string",
      required: true
    }
  ],
  action: ({ args, options }) => {
    console.log(args.entry, options.output, options.force);
  }
});

cli.run();
```

## Conventions
- Global flags: `-h, --help` and `-v, --version`.
- Unknown options/commands are treated as errors.
- Use `--` to stop option parsing when passing values that start with `-`.
- Short flag bundles (e.g. `-vf`) are supported only for boolean options.

## API
- `Cli`: registers commands and runs the CLI.
- `CommandDefinition`: defines name, description, options, args, and action.
- `OptionDefinition`: defines option name, type, short flag, defaults, and choices.
- `ArgumentDefinition`: defines positional arguments, including optional or variadic.
- `CommandContext`: passed to actions with parsed `args`, `options`, and `rawArgs`.
