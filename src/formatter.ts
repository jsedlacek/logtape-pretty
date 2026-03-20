import {
  type Colorize,
  createColorize,
  detectColorSupport,
  getLevelColorFn,
} from "./colors.ts";
import { formatTime } from "./time.ts";
import type {
  LogLevel,
  LogRecord,
  PrettyFormatterOptions,
  TextFormatter,
} from "./types.ts";

interface FormatterContext {
  readonly colorize: Colorize;
  readonly timestampFormat: string | false;
}

const LEVEL_LABELS: Record<LogLevel, string> = {
  trace: "TRACE",
  debug: "DEBUG",
  info: "INFO",
  warning: "WARN",
  error: "ERROR",
  fatal: "FATAL",
};

const TIMESTAMP_PRESETS: Record<string, string> = {
  time: "HH:MM:ss",
  datetime: "yyyy-mm-dd HH:MM:ss",
  date: "yyyy-mm-dd",
};

function resolveTimestamp(
  value: PrettyFormatterOptions["timestamp"],
): string | false {
  if (value === false) return false;
  if (value === undefined) return TIMESTAMP_PRESETS.time;
  const utcPrefix = value.startsWith("UTC:") ? "UTC:" : "";
  const name = utcPrefix ? value.slice(4) : value;
  const resolved = TIMESTAMP_PRESETS[name] ?? name;
  return utcPrefix + resolved;
}

function formatValue(
  value: unknown,
  indent: string,
  depth: number = 0,
): string {
  if (depth > 4) return "[...]";
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value === "string") return `"${value}"`;
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  if (typeof value === "bigint") return `${value}n`;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    const innerIndent = indent + "  ";
    const items = value.map(
      (v) => `${innerIndent}${formatValue(v, innerIndent, depth + 1)}`,
    );
    return `[\n${items.join(",\n")}\n${indent}]`;
  }
  if (typeof value === "object") {
    if (
      "toJSON" in value &&
      typeof (value as Record<string, unknown>).toJSON === "function"
    ) {
      return formatValue(
        (value as { toJSON(): unknown }).toJSON(),
        indent,
        depth,
      );
    }
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return "{}";
    const innerIndent = indent + "  ";
    const items = entries.map(
      ([k, v]) =>
        `${innerIndent}"${k}": ${formatValue(v, innerIndent, depth + 1)}`,
    );
    return `{\n${items.join(",\n")}\n${indent}}`;
  }
  return String(value);
}

function formatMessage(record: LogRecord): string {
  return record.message.map(String).join("");
}

function formatTimestamp(record: LogRecord, ctx: FormatterContext): string {
  if (ctx.timestampFormat === false) return "";
  return `[${formatTime(record.timestamp, ctx.timestampFormat)}]`;
}

function formatLevel(record: LogRecord, ctx: FormatterContext): string {
  const label = LEVEL_LABELS[record.level] ?? record.level.toUpperCase();
  const colorFn = getLevelColorFn(record.level, ctx.colorize);
  return colorFn(label);
}

function formatCategory(record: LogRecord, ctx: FormatterContext): string {
  if (record.category.length === 0) return "";
  return ` ${ctx.colorize.gray(`(${record.category.join(".")})`)}`;
}

function formatProperties(record: LogRecord, ctx: FormatterContext): string {
  let result = "";
  for (const [key, value] of Object.entries(record.properties)) {
    result += `\n    ${ctx.colorize.magenta(`${key}:`)} ${formatValue(value, "    ", 0)}`;
  }
  return result;
}

export function getPrettyFormatter(
  options: PrettyFormatterOptions = {},
): TextFormatter {
  const ctx: FormatterContext = {
    colorize: createColorize(options.color ?? detectColorSupport()),
    timestampFormat: resolveTimestamp(options.timestamp),
  };

  return (record: LogRecord): string => {
    const timestamp = formatTimestamp(record, ctx);
    const level = formatLevel(record, ctx);
    const category = formatCategory(record, ctx);
    const msg = ctx.colorize.cyan(formatMessage(record));
    const line = timestamp
      ? `${timestamp} ${level}${category}: ${msg}`
      : `${level}${category}: ${msg}`;
    return line + formatProperties(record, ctx) + "\n";
  };
}
