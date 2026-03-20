import {
  type Colorize,
  createColorize,
  detectColorSupport,
  getLevelColorFn,
} from "./colors.ts";
import type {
  LogLevel,
  LogRecord,
  PrettyFormatterOptions,
  TextFormatter,
} from "./types.ts";

interface FormatterContext {
  readonly colorize: Colorize;
  readonly formatTimestamp: ((epochMs: number) => string) | false;
}

const LEVEL_LABELS: Record<LogLevel, string> = {
  trace: "TRACE",
  debug: "DEBUG",
  info: "INFO",
  warning: "WARN",
  error: "ERROR",
  fatal: "FATAL",
};

const pad2 = (n: number): string => String(n).padStart(2, "0");

function timePreset(date: Date): string {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
}

function datetimePreset(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())} ${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
}

function datePreset(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

const TIMESTAMP_PRESETS: Record<string, (date: Date) => string> = {
  time: timePreset,
  datetime: datetimePreset,
  date: datePreset,
};

function resolveTimestamp(
  value: PrettyFormatterOptions["timestamp"],
): ((epochMs: number) => string) | false {
  if (value === false) return false;
  const fn = typeof value === "function" ? value : TIMESTAMP_PRESETS[value ?? "time"];
  return (epochMs: number) => fn(new Date(epochMs));
}

function formatError(err: Error, indent: string, depth: number): string {
  if (depth > 4) return "[...]";
  const childIndent = indent + "    ";
  let out = "";
  if (err.stack) {
    const lines = err.stack.split("\n");
    out += lines[0];
    for (let i = 1; i < lines.length; i++) {
      out += `\n${childIndent}${lines[i].trimStart()}`;
    }
  } else {
    out += `${err.name}: ${err.message}`;
  }
  if (err.cause instanceof Error) {
    out += `\n${childIndent}cause: ${formatError(err.cause, childIndent, depth + 1)}`;
  } else if (err.cause !== undefined) {
    out += `\n${childIndent}cause: ${formatValue(err.cause, childIndent, depth + 1)}`;
  }
  if ("errors" in err && Array.isArray((err as { errors: unknown[] }).errors)) {
    const errors = (err as { errors: Error[] }).errors;
    for (const e of errors) {
      out += `\n${childIndent}${e instanceof Error ? formatError(e, childIndent, depth + 1) : formatValue(e, childIndent, depth + 1)}`;
    }
  }
  return out;
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
  if (value instanceof Error) {
    return formatError(value, indent, depth);
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
  if (ctx.formatTimestamp === false) return "";
  return `[${ctx.formatTimestamp(record.timestamp)}]`;
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
    formatTimestamp: resolveTimestamp(options.timestamp),
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
