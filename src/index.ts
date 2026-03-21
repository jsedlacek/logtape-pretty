export { getPrettyFormatter } from "./formatter.ts";
export type { PrettyFormatterOptions, LogRecord, LogLevel, TextFormatter } from "./types.ts";

import { getPrettyFormatter } from "./formatter.ts";

/** Pre-configured formatter with default options. */
export const prettyFormatter = getPrettyFormatter();
