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

/** Fixed UTC formatter for deterministic tests. */
const utcTime = (d: Date) =>
  `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}:${String(d.getUTCSeconds()).padStart(2, "0")}`;

describe("getPrettyFormatter", () => {
  describe("basic output", () => {
    const fmt = getPrettyFormatter({ color: false, timestamp: utcTime });

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

  describe("timestamp option", () => {
    it("timestamp: false disables timestamps", () => {
      const fmt = getPrettyFormatter({ color: false, timestamp: false });
      const result = fmt(makeRecord());
      assert.equal(result, "INFO: Hello, world!\n");
    });

    it("timestamp: 'time' shows HH:MM:ss (local)", () => {
      const fmt = getPrettyFormatter({ color: false, timestamp: "time" });
      const result = fmt(makeRecord());
      assert.match(result, /^\[\d{2}:\d{2}:\d{2}\] INFO: Hello, world!\n$/);
    });

    it("timestamp: 'datetime' shows yyyy-mm-dd HH:MM:ss (local)", () => {
      const fmt = getPrettyFormatter({ color: false, timestamp: "datetime" });
      const result = fmt(makeRecord());
      assert.match(result, /^\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\] INFO:/);
    });

    it("timestamp: 'date' shows yyyy-mm-dd (local)", () => {
      const fmt = getPrettyFormatter({ color: false, timestamp: "date" });
      const result = fmt(makeRecord());
      assert.match(result, /^\[\d{4}-\d{2}-\d{2}\] INFO:/);
    });

    it("custom function", () => {
      const fmt = getPrettyFormatter({
        color: false,
        timestamp: (d) => d.toISOString(),
      });
      const result = fmt(makeRecord());
      assert.equal(result, "[2024-03-15T08:11:46.123Z] INFO: Hello, world!\n");
    });

    it("defaults to 'time' when omitted", () => {
      const fmt = getPrettyFormatter({ color: false });
      const result = fmt(makeRecord());
      assert.match(result, /^\[\d{2}:\d{2}:\d{2}\] INFO:/);
    });
  });

  describe("value formatting", () => {
    const fmt = getPrettyFormatter({ color: false, timestamp: false });

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
      assert.match(result, /tags: \[\n\s+"a",\n\s+"b"\n\s+\]/);
    });

    it("formats nested objects", () => {
      const result = fmt(makeRecord({ properties: { user: { name: "alice" } } }));
      assert.match(result, /user: \{\n\s+"name": "alice"\n\s+\}/);
    });

    it("formats objects with toJSON()", () => {
      const obj = { toJSON: () => ({ status: 200, url: "https://example.com" }) };
      const result = fmt(makeRecord({ properties: { response: obj } }));
      assert.match(result, /"status": 200/);
      assert.match(result, /"url": "https:\/\/example.com"/);
    });

    it("formats objects with toJSON() returning a primitive", () => {
      const obj = { toJSON: () => "custom-value" };
      const result = fmt(makeRecord({ properties: { token: obj } }));
      assert.match(result, /token: "custom-value"/);
    });
  });

  describe("error formatting", () => {
    const fmt = getPrettyFormatter({ color: false, timestamp: false });

    it("formats Error with stack trace", () => {
      const result = fmt(makeRecord({ properties: { error: new Error("Oops") } }));
      assert.match(result, /error: Error: Oops/);
      assert.match(result, /at /);
    });

    it("formats Error with cause", () => {
      const err = new Error("Oops", { cause: new Error("root cause") });
      const result = fmt(makeRecord({ properties: { error: err } }));
      assert.match(result, /error: Error: Oops/);
      assert.match(result, /cause: Error: root cause/);
    });

    it("formats AggregateError", () => {
      const err = new AggregateError(
        [new TypeError("bad type"), new RangeError("out of bounds")],
        "Multiple failures",
      );
      const result = fmt(makeRecord({ properties: { error: err } }));
      assert.match(result, /AggregateError: Multiple failures/);
      assert.match(result, /TypeError: bad type/);
      assert.match(result, /RangeError: out of bounds/);
    });
  });

  describe("color option", () => {
    it("produces ANSI codes when color is true", () => {
      const fmt = getPrettyFormatter({ color: true, timestamp: false });
      const result = fmt(makeRecord());
      assert.match(result, /\x1b\[/);
    });

    it("produces no ANSI codes when color is false", () => {
      const fmt = getPrettyFormatter({ color: false, timestamp: false });
      const result = fmt(makeRecord());
      assert.doesNotMatch(result, /\x1b\[/);
    });
  });
});
