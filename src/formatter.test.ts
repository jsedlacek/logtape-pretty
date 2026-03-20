import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { getPrettyFormatter } from "./formatter.ts";
import type { LogRecord } from "./types.ts";

function makeRecord(overrides: Partial<LogRecord> = {}): LogRecord {
  return {
    category: [],
    level: "info",
    message: ["Hello, world!"],
    rawMessage: "Hello, world!",
    timestamp: Date.UTC(2024, 2, 15, 8, 11, 46, 123),
    properties: {},
    ...overrides,
  };
}

describe("getPrettyFormatter", () => {
  describe("basic output", () => {
    const fmt = getPrettyFormatter({ colorize: false, translateTime: "UTC:HH:MM:ss" });

    it("formats a simple log record", () => {
      const result = fmt(makeRecord());
      assert.equal(result, "[08:11:46] INFO: Hello, world!\n");
    });

    it("formats with properties", () => {
      const result = fmt(makeRecord({ properties: { identifier: "145/1988" } }));
      assert.equal(
        result,
        '[08:11:46] INFO: Hello, world!\n    identifier: "145/1988"\n',
      );
    });

    it("formats with category", () => {
      const result = fmt(makeRecord({ category: ["my", "app", "db"] }));
      assert.equal(result, "[08:11:46] INFO (my.app.db): Hello, world!\n");
    });

    it("formats different log levels", () => {
      assert.match(fmt(makeRecord({ level: "trace" })), /TRACE/);
      assert.match(fmt(makeRecord({ level: "debug" })), /DEBUG/);
      assert.match(fmt(makeRecord({ level: "warning" })), /WARN:/);
      assert.match(fmt(makeRecord({ level: "error" })), /ERROR/);
      assert.match(fmt(makeRecord({ level: "fatal" })), /FATAL/);
    });

    it("formats template messages with interpolation", () => {
      const result = fmt(makeRecord({
        message: ["User ", "alice", " logged in from ", "127.0.0.1"],
      }));
      assert.equal(result, "[08:11:46] INFO: User alice logged in from 127.0.0.1\n");
    });
  });

  describe("options", () => {
    it("levelFirst puts level before timestamp", () => {
      const fmt = getPrettyFormatter({
        colorize: false,
        translateTime: "UTC:HH:MM:ss",
        levelFirst: true,
      });
      const result = fmt(makeRecord());
      assert.equal(result, "INFO [08:11:46]: Hello, world!\n");
    });

    it("singleLine puts properties on same line", () => {
      const fmt = getPrettyFormatter({
        colorize: false,
        translateTime: "UTC:HH:MM:ss",
        singleLine: true,
      });
      const result = fmt(makeRecord({
        properties: { user: "alice", count: 42 },
      }));
      assert.equal(
        result,
        '[08:11:46] INFO: Hello, world! (user: "alice") (count: 42)\n',
      );
    });

    it("hideObject suppresses properties", () => {
      const fmt = getPrettyFormatter({
        colorize: false,
        translateTime: "UTC:HH:MM:ss",
        hideObject: true,
      });
      const result = fmt(makeRecord({ properties: { secret: "hidden" } }));
      assert.equal(result, "[08:11:46] INFO: Hello, world!\n");
    });

    it("translateTime: false disables timestamps", () => {
      const fmt = getPrettyFormatter({ colorize: false, translateTime: false });
      const result = fmt(makeRecord());
      assert.equal(result, "INFO: Hello, world!\n");
    });

    it("ignore filters out specified keys", () => {
      const fmt = getPrettyFormatter({
        colorize: false,
        translateTime: "UTC:HH:MM:ss",
        ignore: "secret,internal",
      });
      const result = fmt(makeRecord({
        properties: { user: "alice", secret: "hidden", internal: "data" },
      }));
      assert.match(result, /user/);
      assert.doesNotMatch(result, /secret/);
      assert.doesNotMatch(result, /internal/);
    });

    it("ignore works with Set", () => {
      const fmt = getPrettyFormatter({
        colorize: false,
        translateTime: "UTC:HH:MM:ss",
        ignore: new Set(["secret"]),
      });
      const result = fmt(makeRecord({
        properties: { user: "alice", secret: "hidden" },
      }));
      assert.match(result, /user/);
      assert.doesNotMatch(result, /secret/);
    });

    it("include shows only specified keys", () => {
      const fmt = getPrettyFormatter({
        colorize: false,
        translateTime: "UTC:HH:MM:ss",
        include: "user",
      });
      const result = fmt(makeRecord({
        properties: { user: "alice", secret: "hidden" },
      }));
      assert.match(result, /user/);
      assert.doesNotMatch(result, /secret/);
    });

    it("custom translateTime format", () => {
      const fmt = getPrettyFormatter({
        colorize: false,
        translateTime: "UTC:yyyy-mm-dd HH:MM:ss",
      });
      const result = fmt(makeRecord());
      assert.equal(result, "[2024-03-15 08:11:46] INFO: Hello, world!\n");
    });

    it("messageFormat with template placeholders", () => {
      const fmt = getPrettyFormatter({
        colorize: false,
        translateTime: "UTC:HH:MM:ss",
        messageFormat: "Request to {path} returned {status}",
      });
      const result = fmt(makeRecord({
        properties: { path: "/api", status: 200 },
        hideObject: true,
      } as Partial<LogRecord>));
      assert.match(result, /Request to \/api returned 200/);
    });

    it("messageFormat hides properties when hideObject is set", () => {
      const fmt = getPrettyFormatter({
        colorize: false,
        translateTime: "UTC:HH:MM:ss",
        messageFormat: "Request to {path} returned {status}",
        hideObject: true,
      });
      const result = fmt(makeRecord({
        properties: { path: "/api", status: 200 },
      }));
      assert.equal(result, "[08:11:46] INFO: Request to /api returned 200\n");
    });

    it("messageFormat with function", () => {
      const fmt = getPrettyFormatter({
        colorize: false,
        translateTime: "UTC:HH:MM:ss",
        messageFormat: (record) => `[custom] ${record.message.join("")}`,
      });
      const result = fmt(makeRecord());
      assert.equal(result, "[08:11:46] INFO: [custom] Hello, world!\n");
    });
  });

  describe("value formatting", () => {
    const fmt = getPrettyFormatter({ colorize: false, translateTime: false });

    it("formats string values with quotes", () => {
      const result = fmt(makeRecord({ properties: { name: "alice" } }));
      assert.match(result, /name: "alice"/);
    });

    it("formats numbers without quotes", () => {
      const result = fmt(makeRecord({ properties: { count: 42 } }));
      assert.match(result, /count: 42/);
    });

    it("formats booleans", () => {
      const result = fmt(makeRecord({ properties: { active: true } }));
      assert.match(result, /active: true/);
    });

    it("formats null and undefined", () => {
      const result = fmt(makeRecord({ properties: { a: null, b: undefined } }));
      assert.match(result, /a: null/);
      assert.match(result, /b: undefined/);
    });

    it("formats arrays", () => {
      const result = fmt(makeRecord({ properties: { tags: ["a", "b"] } }));
      assert.match(result, /tags: \["a", "b"\]/);
    });

    it("formats nested objects", () => {
      const result = fmt(makeRecord({ properties: { user: { name: "alice" } } }));
      assert.match(result, /user: \{"name": "alice"\}/);
    });
  });

  describe("error formatting", () => {
    const fmt = getPrettyFormatter({ colorize: false, translateTime: false });

    it("formats error-like objects with stack", () => {
      const result = fmt(makeRecord({
        properties: {
          err: {
            message: "Something went wrong",
            stack: "Error: Something went wrong\n    at foo (bar.js:1:1)",
          },
        },
      }));
      assert.match(result, /err\.message: Something went wrong/);
      assert.match(result, /Error: Something went wrong/);
      assert.match(result, /at foo/);
    });
  });

  describe("colors", () => {
    it("produces ANSI codes when colorize is true", () => {
      const fmt = getPrettyFormatter({ colorize: true, translateTime: false });
      const result = fmt(makeRecord());
      assert.match(result, /\x1b\[/);
    });

    it("produces no ANSI codes when colorize is false", () => {
      const fmt = getPrettyFormatter({ colorize: false, translateTime: false });
      const result = fmt(makeRecord());
      assert.doesNotMatch(result, /\x1b\[/);
    });
  });
});
