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
  colorize?: boolean;
  /** Show level before timestamp. */
  levelFirst?: boolean;
  /** Display properties on the same line as the message. */
  singleLine?: boolean;
  /** Hide properties entirely. */
  hideObject?: boolean;
  /** Timestamp format string, or `false` to disable timestamps.
   *  Supports: `yyyy`, `mm`, `dd`, `HH`, `MM`, `ss`, `l`.
   *  Prefix with `UTC:` for UTC mode. */
  translateTime?: string | false;
  /** Property keys to exclude. Comma-separated string or Set. */
  ignore?: string | Set<string>;
  /** Only show these property keys. Comma-separated string or Set. */
  include?: string | Set<string>;
  /** Custom color overrides per level. Values are color names:
   *  "red", "green", "yellow", "blue", "gray", "cyan", "white", "magenta", "bgRed". */
  customColors?: Partial<Record<LogLevel, string>>;
  /** Property keys whose values should be treated as errors (stack trace formatting). */
  errorLikeObjectKeys?: string[];
  /** Custom message format. Use `{key}` placeholders for property interpolation,
   *  or provide a function. */
  messageFormat?: string | ((record: LogRecord) => string);
}
