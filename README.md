# @jsedlacek/logtape-pretty

Pretty formatter for [LogTape](https://logtape.org/). Produces clean, human-readable log output with colors, timestamps, and structured properties.

![Example output](assets/example-dark.svg#gh-dark-mode-only)
![Example output](assets/example-light.svg#gh-light-mode-only)

## Install

```sh
pnpm add @jsedlacek/logtape-pretty
```

## Usage

```typescript
import { configure } from "@logtape/logtape";
import { getStreamSink } from "@logtape/logtape";
import { getPrettyFormatter } from "@jsedlacek/logtape-pretty";

await configure({
  sinks: {
    console: getStreamSink(process.stdout, {
      formatter: getPrettyFormatter(),
    }),
  },
  loggers: [{ category: ["my", "app"], sinks: ["console"], lowestLevel: "debug" }],
});
```

Or use the pre-configured default:

```typescript
import { prettyFormatter } from "@jsedlacek/logtape-pretty";
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `colorize` | `boolean` | auto-detect | Enable ANSI colors |
| `levelFirst` | `boolean` | `false` | Show level before timestamp |
| `singleLine` | `boolean` | `false` | Properties on same line |
| `hideObject` | `boolean` | `false` | Hide properties entirely |
| `translateTime` | `string \| false` | `"HH:MM:ss"` | Timestamp format or `false` to disable |
| `ignore` | `string \| Set<string>` | — | Property keys to exclude (comma-separated or Set) |
| `include` | `string \| Set<string>` | — | Only show these property keys |
| `customColors` | `Record<string, string>` | — | Color overrides per level |
| `errorLikeObjectKeys` | `string[]` | `["err", "error"]` | Keys to format with stack traces |
| `messageFormat` | `string \| function` | — | Custom message template with `{key}` placeholders |

### Timestamp format tokens

`yyyy` (year), `mm` (month), `dd` (day), `HH` (hours), `MM` (minutes), `ss` (seconds), `l` (milliseconds).

Prefix with `UTC:` for UTC mode (e.g., `"UTC:yyyy-mm-dd HH:MM:ss"`).

### Examples

```typescript
// Level first
getPrettyFormatter({ levelFirst: true });
// INFO [08:11:46]: Hello, world!

// Single line properties
getPrettyFormatter({ singleLine: true });
// [08:11:46] INFO: Hello (user: "alice") (count: 42)

// Full date-time
getPrettyFormatter({ translateTime: "yyyy-mm-dd HH:MM:ss.l" });
// [2024-03-15 08:11:46.123] INFO: Hello

// Custom message format
getPrettyFormatter({ messageFormat: "Request to {path} returned {status}" });
```

## Acknowledgements

Formatting style and options inspired by [pino-pretty](https://github.com/pinojs/pino-pretty).

## License

MIT
