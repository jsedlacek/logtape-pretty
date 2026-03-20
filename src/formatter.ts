import { type Colorize, createColorize, detectColorSupport, getLevelColorFn } from "./colors.ts";
import { formatTime } from "./time.ts";
import type { LogLevel, LogRecord, PrettyFormatterOptions, TextFormatter } from "./types.ts";

interface FormatterContext {
  readonly colorize: Colorize;
  readonly customColors: PrettyFormatterOptions["customColors"];
  readonly translateTime: string | false;
  readonly levelFirst: boolean;
  readonly singleLine: boolean;
  readonly hideObject: boolean;
  readonly messageFormat: PrettyFormatterOptions["messageFormat"];
  readonly ignoreSet: Set<string> | null;
  readonly includeSet: Set<string> | null;
  readonly errorKeys: Set<string>;
}

const LEVEL_LABELS: Record<LogLevel, string> = {
  trace: "TRACE",
  debug: "DEBUG",
  info: "INFO",
  warning: "WARN",
  error: "ERROR",
  fatal: "FATAL",
};

function parseKeySet(input: string | Set<string> | undefined): Set<string> | null {
  if (!input) return null;
  if (input instanceof Set) return input.size > 0 ? input : null;
  const keys = input.split(",").map((k) => k.trim()).filter(Boolean);
  return keys.length > 0 ? new Set(keys) : null;
}

function formatValue(value: unknown, indent: string | null, depth: number = 0): string {
  if (depth > 4) return "[...]";
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value === "string") return `"${value}"`;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (typeof value === "bigint") return `${value}n`;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    if (indent === null) {
      return `[${value.map((v) => formatValue(v, null, depth + 1)).join(", ")}]`;
    }
    const innerIndent = indent + "  ";
    const items = value.map((v) => `${innerIndent}${formatValue(v, innerIndent, depth + 1)}`);
    return `[\n${items.join(",\n")}\n${indent}]`;
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return "{}";
    if (indent === null) {
      return `{${entries.map(([k, v]) => `"${k}": ${formatValue(v, null, depth + 1)}`).join(", ")}}`;
    }
    const innerIndent = indent + "  ";
    const items = entries.map(([k, v]) => `${innerIndent}"${k}": ${formatValue(v, innerIndent, depth + 1)}`);
    return `{\n${items.join(",\n")}\n${indent}}`;
  }
  return String(value);
}

const ERROR_PRIORITY_KEYS = ["name", "message", "stack", "cause"];

function collectErrorEntries(value: object): [string, unknown][] {
  const err = value as Record<string, unknown>;
  const seen = new Set<string>();
  const entries: [string, unknown][] = [];
  // Show well-known error properties first in a predictable order
  for (const k of ERROR_PRIORITY_KEYS) {
    if (err[k] !== undefined) {
      entries.push([k, err[k]]);
      seen.add(k);
    }
  }
  // Add any remaining own properties (including non-enumerable ones)
  for (const k of Object.getOwnPropertyNames(err)) {
    if (!seen.has(k)) {
      entries.push([k, err[k]]);
    }
  }
  return entries;
}

function formatMessage(record: LogRecord): string {
  return record.message.map(String).join("");
}

function applyMessageFormat(
  format: string,
  record: LogRecord,
): string {
  return format.replace(/\{(\w+(?:\.\w+)*)}/g, (_match, key: string) => {
    const parts = key.split(".");
    let value: unknown = record.properties;
    for (const part of parts) {
      if (value == null || typeof value !== "object") return "";
      value = (value as Record<string, unknown>)[part];
    }
    return value != null ? String(value) : "";
  });
}

function formatTimestamp(record: LogRecord, ctx: FormatterContext): string {
  if (ctx.translateTime === false) return "";
  return `[${formatTime(record.timestamp, ctx.translateTime)}]`;
}

function formatLevel(record: LogRecord, ctx: FormatterContext): string {
  const label = LEVEL_LABELS[record.level] ?? record.level.toUpperCase();
  const colorFn = getLevelColorFn(record.level, ctx.colorize, ctx.customColors);
  return colorFn(label);
}

function formatCategory(record: LogRecord, ctx: FormatterContext): string {
  if (record.category.length === 0) return "";
  return ` ${ctx.colorize.gray(`(${record.category.join(".")})`)}`;
}

function formatMsg(record: LogRecord, ctx: FormatterContext): string {
  if (!ctx.messageFormat) return formatMessage(record);
  if (typeof ctx.messageFormat === "function") return ctx.messageFormat(record);
  return applyMessageFormat(ctx.messageFormat, record);
}

function assembleLine(
  timestamp: string,
  level: string,
  category: string,
  msg: string,
  ctx: FormatterContext,
): string {
  const coloredMsg = ctx.colorize.cyan(msg);
  if (ctx.levelFirst) {
    return timestamp
      ? `${level} ${timestamp}${category}: ${coloredMsg}`
      : `${level}${category}: ${coloredMsg}`;
  }
  return timestamp
    ? `${timestamp} ${level}${category}: ${coloredMsg}`
    : `${level}${category}: ${coloredMsg}`;
}

function isErrorLike(value: unknown): value is object {
  return value != null && typeof value === "object" && ("message" in value || "stack" in value || value instanceof Error);
}

function formatErrorEntries(
  entries: [string, unknown][],
  indent: string,
  ctx: FormatterContext,
): string {
  let out = "";
  const childIndent = indent + "    ";
  for (const [k, v] of entries) {
    if (k === "stack" && typeof v === "string") {
      const stackLines = v.split("\n").map((s) => s.replace(/^ +/, ""));
      out += `\n${indent}${ctx.colorize.magenta(`${k}:`)} ${stackLines[0]}`;
      for (let i = 1; i < stackLines.length; i++) {
        out += `\n${childIndent}${ctx.colorize.gray(stackLines[i])}`;
      }
    } else if (isErrorLike(v)) {
      out += `\n${indent}${ctx.colorize.magenta(`${k}:`)}`;
      out += formatErrorEntries(collectErrorEntries(v), indent + "    ", ctx);
    } else if (v != null && typeof v === "object") {
      out += `\n${indent}${ctx.colorize.magenta(`${k}:`)} ${formatValue(v, indent, 0)}`;
    } else {
      out += `\n${indent}${ctx.colorize.magenta(`${k}:`)} ${String(v)}`;
    }
  }
  return out;
}

function formatErrorProperty(key: string, value: object, ctx: FormatterContext): string {
  const errEntries = collectErrorEntries(value);
  if (ctx.singleLine) {
    const parts = errEntries.map(([k, v]) =>
      typeof v === "string" && v.includes("\n")
        ? `${k}: ${v.replace(/\n/g, " ")}`
        : `${k}: ${String(v)}`
    );
    return ` ${ctx.colorize.red(`(${key}: ${parts.join(", ")})`)}`;
  }
  let out = `\n    ${ctx.colorize.magenta(`${key}:`)}`;
  out += formatErrorEntries(errEntries, "        ", ctx);
  return out;
}

function formatRegularProperty(key: string, value: unknown, ctx: FormatterContext): string {
  if (ctx.singleLine) {
    return ` ${ctx.colorize.gray(`(${key}: ${formatValue(value, null)})`)}`;
  }
  return `\n    ${ctx.colorize.magenta(`${key}:`)} ${formatValue(value, "    ", 0)}`;
}

function formatProperties(record: LogRecord, ctx: FormatterContext): string {
  if (ctx.hideObject) return "";
  let result = "";
  for (const [key, value] of Object.entries(record.properties)) {
    if (ctx.ignoreSet?.has(key)) continue;
    if (ctx.includeSet && !ctx.includeSet.has(key)) continue;
    if (ctx.errorKeys.has(key) && value != null && typeof value === "object") {
      result += formatErrorProperty(key, value, ctx);
    } else {
      result += formatRegularProperty(key, value, ctx);
    }
  }
  return result;
}

export function getPrettyFormatter(
  options: PrettyFormatterOptions = {},
): TextFormatter {
  const ctx: FormatterContext = {
    colorize: createColorize(options.colorize ?? detectColorSupport()),
    customColors: options.customColors,
    translateTime: options.translateTime ?? "HH:MM:ss",
    levelFirst: options.levelFirst ?? false,
    singleLine: options.singleLine ?? false,
    hideObject: options.hideObject ?? false,
    messageFormat: options.messageFormat,
    ignoreSet: parseKeySet(options.ignore),
    includeSet: parseKeySet(options.include),
    errorKeys: new Set(options.errorLikeObjectKeys ?? ["err", "error"]),
  };

  return (record: LogRecord): string => {
    const timestamp = formatTimestamp(record, ctx);
    const level = formatLevel(record, ctx);
    const category = formatCategory(record, ctx);
    const msg = formatMsg(record, ctx);
    const line = assembleLine(timestamp, level, category, msg, ctx);
    return line + formatProperties(record, ctx) + "\n";
  };
}
