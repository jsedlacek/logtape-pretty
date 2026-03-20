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
    const fmt = getPrettyFormatter({ color: false, timestamp: "UTC:HH:MM:ss" });

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

    it("timestamp: 'time' shows HH:MM:ss", () => {
      const fmt = getPrettyFormatter({ color: false, timestamp: "UTC:time" });
      const result = fmt(makeRecord());
      assert.equal(result, "[08:11:46] INFO: Hello, world!\n");
    });

    it("timestamp: 'datetime' shows yyyy-mm-dd HH:MM:ss", () => {
      const fmt = getPrettyFormatter({ color: false, timestamp: "UTC:datetime" });
      const result = fmt(makeRecord());
      assert.equal(result, "[2024-03-15 08:11:46] INFO: Hello, world!\n");
    });

    it("timestamp: 'date' shows yyyy-mm-dd", () => {
      const fmt = getPrettyFormatter({ color: false, timestamp: "UTC:date" });
      const result = fmt(makeRecord());
      assert.equal(result, "[2024-03-15] INFO: Hello, world!\n");
    });

    it("custom format string", () => {
      const fmt = getPrettyFormatter({
        color: false,
        timestamp: "UTC:yyyy-mm-dd HH:MM:ss",
      });
      const result = fmt(makeRecord());
      assert.equal(result, "[2024-03-15 08:11:46] INFO: Hello, world!\n");
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
