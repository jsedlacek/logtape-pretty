export type LogLevel =
  | "trace"
  | "debug"
  | "info"
  | "warning"
  | "error"
  | "fatal";

export interface LogRecord {
  readonly category: readonly string[];
  readonly level: LogLevel;
  readonly message: readonly unknown[];
  readonly rawMessage: string | TemplateStringsArray;
  readonly timestamp: number;
  readonly properties: Record<string, unknown>;
}

export type TextFormatter = (record: LogRecord) => string;

export interface PrettyFormatterOptions {
  /** Enable ANSI colors. Defaults to auto-detect based on TTY/env vars. */
  color?: boolean | undefined;
  /** Timestamp format: preset name, custom format string, or `false` to disable.
   *  Presets: `"time"` (HH:MM:ss), `"datetime"` (yyyy-mm-dd HH:MM:ss), `"date"` (yyyy-mm-dd).
   *  Custom format tokens: `yyyy`, `mm`, `dd`, `HH`, `MM`, `ss`, `l`.
   *  Prefix with `UTC:` for UTC mode. Defaults to `"time"`. */
  timestamp?: "time" | "datetime" | "date" | (string & {}) | false | undefined;
}
