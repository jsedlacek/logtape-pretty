export type LogLevel = "trace" | "debug" | "info" | "warning" | "error" | "fatal";

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
  /** Timestamp format: a preset name, a custom formatting function, or `false` to disable.
   *  Presets: `"time"` (HH:MM:ss), `"datetime"` (yyyy-mm-dd HH:MM:ss), `"date"` (yyyy-mm-dd).
   *  Defaults to `"time"`. */
  timestamp?: "time" | "datetime" | "date" | ((date: Date) => string) | false | undefined;
}
