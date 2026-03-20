import type { LogLevel } from "./types.ts";

type ColorFn = (s: string) => string;

const esc = (open: number, close: number): ColorFn =>
  (s) => `\x1b[${open}m${s}\x1b[${close}m`;

const colors = {
  red: esc(31, 39),
  green: esc(32, 39),
  yellow: esc(33, 39),
  blue: esc(34, 39),
  magenta: esc(35, 39),
  cyan: esc(36, 39),
  white: esc(37, 39),
  gray: esc(90, 39),
  bgRed: esc(41, 49),
  bold: esc(1, 22),
} as const;

type ColorName = keyof typeof colors;

const identity: ColorFn = (s) => s;

const noColors: Record<ColorName, ColorFn> = Object.fromEntries(
  Object.keys(colors).map((k) => [k, identity]),
) as Record<ColorName, ColorFn>;

export interface Colorize {
  red: ColorFn;
  green: ColorFn;
  yellow: ColorFn;
  blue: ColorFn;
  magenta: ColorFn;
  cyan: ColorFn;
  white: ColorFn;
  gray: ColorFn;
  bgRed: ColorFn;
  bold: ColorFn;
}

export function createColorize(enabled: boolean): Colorize {
  return enabled ? { ...colors } : { ...noColors };
}

export function detectColorSupport(): boolean {
  try {
    if (typeof process !== "undefined") {
      if (process.env.NO_COLOR !== undefined) return false;
      if (process.env.FORCE_COLOR !== undefined) return true;
      return !!process.stdout?.isTTY;
    }
  } catch {
    // non-Node environment
  }
  return false;
}

const LEVEL_COLOR_MAP: Record<LogLevel, ColorName> = {
  trace: "gray",
  debug: "blue",
  info: "green",
  warning: "yellow",
  error: "red",
  fatal: "bgRed",
};

export function getLevelColorFn(
  level: LogLevel,
  colorize: Colorize,
  customColors?: Partial<Record<LogLevel, string>>,
): ColorFn {
  const colorName = customColors?.[level] ?? LEVEL_COLOR_MAP[level];
  if (colorName && colorName in colorize) {
    return colorize[colorName as ColorName];
  }
  return identity;
}

export function isColorName(name: string): name is ColorName {
  return name in colors;
}
