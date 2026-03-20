import { getPrettyFormatter } from "./src/index.ts";

const fmt = getPrettyFormatter({ colorize: true });

const now = Date.now();

process.stdout.write(fmt({
  category: ["my", "app"],
  level: "info",
  message: ["Missing legislation"],
  rawMessage: "Missing legislation",
  timestamp: now,
  properties: { identifier: "145/1988" },
}));

process.stdout.write(fmt({
  category: ["my", "app", "db"],
  level: "debug",
  message: ["Query executed in ", "42", "ms"],
  rawMessage: "Query executed in {duration}ms",
  timestamp: now,
  properties: { query: "SELECT * FROM laws", rows: 15 },
}));

process.stdout.write(fmt({
  category: ["my", "app"],
  level: "warning",
  message: ["Deprecated API called"],
  rawMessage: "Deprecated API called",
  timestamp: now,
  properties: { path: "/api/v1/old" },
}));

process.stdout.write(fmt({
  category: ["my", "app"],
  level: "error",
  message: ["Failed to connect"],
  rawMessage: "Failed to connect",
  timestamp: now,
  properties: {},
}));

process.stdout.write(fmt({
  category: ["my", "app"],
  level: "fatal",
  message: ["System shutting down"],
  rawMessage: "System shutting down",
  timestamp: now,
  properties: {},
}));
