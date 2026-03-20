import { writeFileSync } from "node:fs";
import { getPrettyFormatter } from "../src/index.ts";

// Fixed timestamp so SVGs are deterministic
// Use noon UTC so the displayed time (HH:MM:ss in local time) doesn't shift too much
const fixedDate = new Date("2025-01-15T08:11:46.000");
const now = fixedDate.getTime();

const fmt = getPrettyFormatter({ colorize: true });

const records = [
  {
    category: ["my", "app"],
    level: "info" as const,
    message: ["Missing legislation"],
    rawMessage: "Missing legislation",
    timestamp: now,
    properties: { identifier: "145/1988" },
  },
  {
    category: ["my", "app", "db"],
    level: "debug" as const,
    message: ["Query executed in ", "42", "ms"],
    rawMessage: "Query executed in {duration}ms",
    timestamp: now,
    properties: { query: "SELECT * FROM laws", rows: 15 },
  },
  {
    category: ["my", "app"],
    level: "warning" as const,
    message: ["Deprecated API called"],
    rawMessage: "Deprecated API called",
    timestamp: now,
    properties: { path: "/api/v1/old" },
  },
  {
    category: ["my", "app"],
    level: "error" as const,
    message: ["Failed to connect"],
    rawMessage: "Failed to connect",
    timestamp: now,
    properties: {},
  },
  {
    category: ["my", "app"],
    level: "fatal" as const,
    message: ["System shutting down"],
    rawMessage: "System shutting down",
    timestamp: now,
    properties: {},
  },
];

// Parse ANSI output into structured segments
interface Segment {
  text: string;
  fg?: number; // ANSI color code (31-37, 90)
  bg?: number; // ANSI bg code (41-47)
}

function parseAnsi(input: string): Segment[][] {
  const lines: Segment[][] = [];
  for (const rawLine of input.split("\n")) {
    if (rawLine === "") continue;
    const segments: Segment[] = [];
    let fg: number | undefined;
    let bg: number | undefined;
    let pos = 0;
    const re = /\x1b\[(\d+)m/g;
    let match;
    while ((match = re.exec(rawLine)) !== null) {
      if (match.index > pos) {
        segments.push({ text: rawLine.slice(pos, match.index), fg, bg });
      }
      const code = parseInt(match[1]);
      if (code === 39) fg = undefined;
      else if (code === 49) bg = undefined;
      else if (code >= 30 && code <= 37) fg = code;
      else if (code === 90) fg = 90;
      else if (code >= 40 && code <= 47) bg = code;
      pos = re.lastIndex;
    }
    if (pos < rawLine.length) {
      segments.push({ text: rawLine.slice(pos), fg, bg });
    }
    lines.push(segments);
  }
  return lines;
}

// Map ANSI codes to SVG colors
interface Theme {
  bg: string;
  stroke?: string;
  defaultFill: string;
  fatalText: string;
  colors: Record<number, string>;
}

const darkTheme: Theme = {
  bg: "#1c1c1c",
  defaultFill: "#cccccc",
  fatalText: "#ffffff",
  colors: {
    31: "#ff3b30", // red
    32: "#00c200", // green
    33: "#c7c400", // yellow
    34: "#4f76ff", // blue
    35: "#c930c7", // magenta
    36: "#00c5c7", // cyan
    37: "#cccccc", // white
    90: "#808080", // gray
    41: "#ff3b30", // bgRed
  },
};

const lightTheme: Theme = {
  bg: "#ffffff",
  stroke: "#d0d0d0",
  defaultFill: "#333333",
  fatalText: "#ffffff",
  colors: {
    31: "#c41a16",
    32: "#007f00",
    33: "#9c8500",
    34: "#0033b3",
    35: "#a626a4",
    36: "#007f7f",
    37: "#333333",
    90: "#808080",
    41: "#c41a16",
  },
};

const CHAR_WIDTH = 7.8;
const LINE_HEIGHT = 20;
const PADDING_X = 16;
const PADDING_Y = 24;
const FONT = "'SF Mono', 'Cascadia Code', 'Fira Code', Menlo, Consolas, monospace";

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function generateSvg(lines: Segment[][], theme: Theme): string {
  const height = PADDING_Y + lines.length * LINE_HEIGHT + 8;

  // Calculate width from longest line
  let maxChars = 0;
  for (const line of lines) {
    let chars = 0;
    for (const seg of line) chars += seg.text.length;
    if (chars > maxChars) maxChars = chars;
  }
  const width = PADDING_X * 2 + Math.ceil(maxChars * CHAR_WIDTH) + 16;

  const parts: string[] = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`);

  const strokeAttr = theme.stroke ? ` stroke="${theme.stroke}"` : "";
  parts.push(`  <rect width="${width}" height="${height}" rx="8" fill="${theme.bg}"${strokeAttr}/>`);

  for (let i = 0; i < lines.length; i++) {
    const y = PADDING_Y + i * LINE_HEIGHT;
    const segments = lines[i];
    let x = PADDING_X;

    // Check if this line has a bgRed segment (FATAL)
    const hasBg = segments.some((s) => s.bg);

    if (hasBg) {
      // Calculate x offset for the bg rect by counting chars before it
      let charsBeforeBg = 0;
      for (const seg of segments) {
        if (seg.bg) break;
        charsBeforeBg += seg.text.length;
      }
      const bgSeg = segments.find((s) => s.bg)!;
      const rectX = PADDING_X + charsBeforeBg * CHAR_WIDTH;
      const rectWidth = Math.ceil(bgSeg.text.length * CHAR_WIDTH) + 4;
      const bgColor = theme.colors[bgSeg.bg!] ?? theme.defaultFill;
      parts.push(`  <rect x="${Math.round(rectX - 1)}" y="${y - 13}" width="${rectWidth}" height="${17}" rx="2" fill="${bgColor}"/>`);

      // Render the whole line as a single <text> with <tspan>s, same as non-bg lines
      let textLine = `  <text x="${PADDING_X}" y="${y}" xml:space="preserve" font-family="${FONT}" font-size="13">`;
      for (const seg of segments) {
        const fill = seg.bg ? theme.fatalText : (seg.fg ? theme.colors[seg.fg] : theme.defaultFill);
        textLine += `<tspan fill="${fill ?? theme.defaultFill}">${escapeXml(seg.text)}</tspan>`;
      }
      textLine += `</text>`;
      parts.push(textLine);
    } else {
      // Render as a single <text> with <tspan>s
      let textLine = `  <text x="${PADDING_X}" y="${y}" xml:space="preserve" font-family="${FONT}" font-size="13">`;
      for (const seg of segments) {
        const fill = seg.fg ? theme.colors[seg.fg] : theme.defaultFill;
        textLine += `<tspan fill="${fill ?? theme.defaultFill}">${escapeXml(seg.text)}</tspan>`;
      }
      textLine += `</text>`;
      parts.push(textLine);
    }
  }

  parts.push(`</svg>`);
  return parts.join("\n") + "\n";
}

// Generate output
const output = records.map((r) => fmt(r)).join("");
const lines = parseAnsi(output);

writeFileSync("assets/example-dark.svg", generateSvg(lines, darkTheme));
writeFileSync("assets/example-light.svg", generateSvg(lines, lightTheme));

console.log("Generated assets/example-dark.svg and assets/example-light.svg");
