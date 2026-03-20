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
pnpm run demo         # run demo script
pnpm run release      # release patch version (bump, tag, push, GitHub release)
pnpm run release:minor
pnpm run release:major
pnpm run generate-svg # regenerate SVG screenshots
```
