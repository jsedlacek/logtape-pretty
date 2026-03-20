# @jsedlacek/logtape-pretty

Pretty formatter for [LogTape](https://logtape.org/). Produces clean, human-readable log output with colors, timestamps, and structured properties.

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/jsedlacek/logtape-pretty/main/assets/example-dark.svg">
  <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/jsedlacek/logtape-pretty/main/assets/example-light.svg">
  <img alt="Example output" src="https://raw.githubusercontent.com/jsedlacek/logtape-pretty/main/assets/example-light.svg">
</picture>

## Install

```sh
npm install @jsedlacek/logtape-pretty
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
| `color` | `boolean` | auto-detect | Enable ANSI colors |
| `timestamp` | `"time" \| "datetime" \| "date" \| (date: Date) => string \| false` | `"time"` | Timestamp format |

### Timestamp presets

| Preset | Output |
|--------|--------|
| `"time"` | `08:11:46` |
| `"datetime"` | `2024-03-15 08:11:46` |
| `"date"` | `2024-03-15` |

Pass a function for custom formatting, or `false` to disable timestamps:

```typescript
// ISO format
getPrettyFormatter({ timestamp: (d) => d.toISOString() });
// [2024-03-15T08:11:46.123Z] INFO: Hello, world!

// No timestamps
getPrettyFormatter({ timestamp: false });
// INFO: Hello, world!

// No colors
getPrettyFormatter({ color: false });
```

## License

MIT
