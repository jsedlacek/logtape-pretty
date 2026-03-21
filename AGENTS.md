# logtape-pretty

Pretty formatter for [LogTape](https://logtape.org/) with pino-pretty-style output. Zero dependencies.

## Tech stack

- TypeScript, ESM + CJS dual build
- [tsup](https://tsup.egoist.dev/) for bundling
- Node built-in test runner (`node:test`)
- pnpm package manager

## Commands

```sh
pnpm install          # install dependencies
pnpm run build        # build with tsup
pnpm test             # run tests
pnpm run lint         # type-check with tsc
pnpm run demo         # run demo with logtape integration
pnpm run generate-svg # regenerate SVG screenshots
```

## Workflow

After each change:

1. Run `pnpm test` and `pnpm run lint`
2. If both pass, **commit immediately** without asking — do not wait for the user to say "commit"
3. Then move on to the next change

Each logical change should be its own commit. Do not batch multiple changes into one commit.
