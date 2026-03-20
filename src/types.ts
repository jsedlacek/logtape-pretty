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
  colorize?: boolean | undefined;
  /** Show level before timestamp. */
  levelFirst?: boolean | undefined;
  /** Display properties on the same line as the message. */
  singleLine?: boolean | undefined;
  /** Hide properties entirely. */
  hideObject?: boolean | undefined;
  /** Timestamp format string, or `false` to disable timestamps.
   *  Supports: `yyyy`, `mm`, `dd`, `HH`, `MM`, `ss`, `l`.
   *  Prefix with `UTC:` for UTC mode. */
  translateTime?: string | false | undefined;
  /** Property keys to exclude. Comma-separated string or Set. */
  ignore?: string | Set<string> | undefined;
  /** Only show these property keys. Comma-separated string or Set. */
  include?: string | Set<string> | undefined;
  /** Custom color overrides per level. Values are color names:
   *  "red", "green", "yellow", "blue", "gray", "cyan", "white", "magenta", "bgRed". */
  customColors?: Partial<Record<LogLevel, string>> | undefined;
  /** Property keys whose values should be treated as errors (stack trace formatting). */
  errorLikeObjectKeys?: string[] | undefined;
  /** Custom message format. Use `{key}` placeholders for property interpolation,
   *  or provide a function. */
  messageFormat?: string | ((record: LogRecord) => string) | undefined;
}
