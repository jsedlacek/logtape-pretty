import { createColorize, detectColorSupport, getLevelColorFn } from "./colors.ts";
import { formatTime } from "./time.ts";
import type { LogLevel, LogRecord, PrettyFormatterOptions, TextFormatter } from "./types.ts";

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

function formatValue(value: unknown, indent: string, depth: number = 0): string {
  if (depth > 4) return "[...]";
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value === "string") return `"${value}"`;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (typeof value === "bigint") return `${value}n`;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    const innerIndent = indent + "  ";
    const items = value.map((v) => `${innerIndent}${formatValue(v, innerIndent, depth + 1)}`);
    return `[\n${items.join(",\n")}\n${indent}]`;
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return "{}";
    const innerIndent = indent + "  ";
    const items = entries.map(([k, v]) => `${innerIndent}"${k}": ${formatValue(v, innerIndent, depth + 1)}`);
    return `{\n${items.join(",\n")}\n${indent}}`;
  }
  return String(value);
}

function formatValueCompact(value: unknown, depth: number = 0): string {
  if (depth > 4) return "[...]";
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value === "string") return `"${value}"`;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (typeof value === "bigint") return `${value}n`;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    return `[${value.map((v) => formatValueCompact(v, depth + 1)).join(", ")}]`;
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return "{}";
    return `{${entries.map(([k, v]) => `"${k}": ${formatValueCompact(v, depth + 1)}`).join(", ")}}`;
  }
  return String(value);
}

function formatErrorStack(stack: string, indent: string): string {
  return stack
    .split("\n")
    .map((line) => `${indent}${line}`)
    .join("\n");
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

export function getPrettyFormatter(
  options: PrettyFormatterOptions = {},
): TextFormatter {
  const {
    levelFirst = false,
    singleLine = false,
    hideObject = false,
    translateTime = "HH:MM:ss",
    errorLikeObjectKeys = ["err", "error"],
    messageFormat,
    customColors,
  } = options;

  const colorEnabled = options.colorize ?? detectColorSupport();
  const colorize = createColorize(colorEnabled);

  const ignoreSet = parseKeySet(options.ignore);
  const includeSet = parseKeySet(options.include);
  const errorKeys = new Set(errorLikeObjectKeys);

  return (record: LogRecord): string => {
    // Timestamp
    let timestamp = "";
    if (translateTime !== false) {
      const timeStr = formatTime(record.timestamp, translateTime);
      timestamp = `[${timeStr}]`;
    }

    // Level
    const levelLabel = LEVEL_LABELS[record.level] ?? record.level.toUpperCase();
    const levelColorFn = getLevelColorFn(record.level, colorize, customColors);
    const level = levelColorFn(levelLabel);

    // Category
    let category = "";
    if (record.category.length > 0) {
      category = ` ${colorize.yellow(`(${record.category.join(".")})`)}`;
    }

    // Message
    let msg: string;
    if (messageFormat) {
      if (typeof messageFormat === "function") {
        msg = messageFormat(record);
      } else {
        msg = applyMessageFormat(messageFormat, record);
      }
    } else {
      msg = formatMessage(record);
    }

    // Assemble main line
    let line: string;
    if (levelFirst) {
      line = timestamp
        ? `${level} ${timestamp}${category}: ${colorize.cyan(msg)}`
        : `${level}${category}: ${colorize.cyan(msg)}`;
    } else {
      line = timestamp
        ? `${timestamp} ${level}${category}: ${colorize.cyan(msg)}`
        : `${level}${category}: ${colorize.cyan(msg)}`;
    }

    // Properties
    if (!hideObject) {
      const propEntries = Object.entries(record.properties);

      for (const [key, value] of propEntries) {
        if (ignoreSet?.has(key)) continue;
        if (includeSet && !includeSet.has(key)) continue;

        if (errorKeys.has(key) && value != null && typeof value === "object") {
          const err = value as Record<string, unknown>;
          if (err.message) {
            line += singleLine ? " " : "\n";
            line += `${singleLine ? "" : "    "}${colorize.red(`${key}.message: ${String(err.message)}`)}`;
          }
          if (err.stack && typeof err.stack === "string") {
            line += singleLine ? " " : "\n";
            const stackStr = singleLine
              ? err.stack.replace(/\n/g, " ")
              : formatErrorStack(err.stack, "    ");
            line += colorize.red(singleLine ? `${key}.stack: ${stackStr}` : stackStr);
          }
        } else {
          if (singleLine) {
            const formatted = formatValueCompact(value);
            line += ` ${colorize.gray(`(${key}: ${formatted})`)}`;
          } else {
            const formatted = formatValue(value, "    ", 0);
            line += `\n    ${colorize.magenta(`${key}:`)} ${formatted}`;
          }
        }
      }
    }

    return line + "\n";
  };
}
