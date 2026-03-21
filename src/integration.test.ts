import { afterEach, describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { configure, dispose, getLogger } from "@logtape/logtape";
import { getPrettyFormatter } from "./formatter.ts";
import type { LogRecord } from "./types.ts";

const fmt = getPrettyFormatter({ color: false, timestamp: false });

function createCaptureSink() {
  const lines: string[] = [];
  const sink = (record: LogRecord) => {
    lines.push(fmt(record));
  };
  return { sink, lines };
}

describe("integration: getPrettyFormatter with real LogTape", () => {
  let lines: string[];

  afterEach(async () => {
    await dispose();
  });

  async function setup(category: string[] = ["test"]) {
    const capture = createCaptureSink();
    lines = capture.lines;
    await configure({
      reset: true,
      sinks: { capture: capture.sink },
      loggers: [
        { category: ["logtape", "meta"], lowestLevel: "warning" },
        { category, sinks: ["capture"], lowestLevel: "trace" },
      ],
    });
    return getLogger(category);
  }

  describe("message syntax variants", () => {
    it("formats string with property substitution", async () => {
      const logger = await setup();
      logger.info("Server on port {port}", { port: 3000 });
      assert.equal(lines.length, 1);
      assert.match(lines[0], /Server on port 3000/);
      assert.match(lines[0], /port: 3000/);
    });

    it("formats template literal messages", async () => {
      const logger = await setup();
      logger.info`User ${"alice"} logged in`;
      assert.equal(lines.length, 1);
      assert.match(lines[0], /User alice logged in/);
    });

    it("formats plain string messages", async () => {
      const logger = await setup();
      logger.info("simple message");
      assert.equal(lines.length, 1);
      assert.match(lines[0], /INFO.*simple message/);
    });

    it("formats properties-only messages", async () => {
      const logger = await setup();
      logger.info({ method: "GET", url: "/api" });
      assert.equal(lines.length, 1);
      assert.match(lines[0], /method: "GET"/);
      assert.match(lines[0], /url: "\/api"/);
    });
  });

  describe("error overloads", () => {
    it("formats Error-only argument", async () => {
      const logger = await setup();
      logger.error(new Error("boom"));
      assert.equal(lines.length, 1);
      assert.match(lines[0], /boom/);
    });

    it("formats string + Error argument", async () => {
      const logger = await setup();
      logger.error("operation failed", new Error("detail"));
      assert.equal(lines.length, 1);
      assert.match(lines[0], /operation failed/);
      assert.match(lines[0], /Error: detail/);
    });

    it("formats Error with cause chain", async () => {
      const logger = await setup();
      logger.error(new Error("outer", { cause: new Error("inner") }));
      assert.equal(lines.length, 1);
      assert.match(lines[0], /outer/);
      assert.match(lines[0], /inner/);
    });

    it("formats AggregateError", async () => {
      const logger = await setup();
      logger.error(
        new AggregateError(
          [new TypeError("bad type"), new RangeError("out of bounds")],
          "Multiple failures",
        ),
      );
      assert.equal(lines.length, 1);
      assert.match(lines[0], /Multiple failures/);
      assert.match(lines[0], /bad type/);
      assert.match(lines[0], /out of bounds/);
    });

    it("formats Error in properties", async () => {
      const logger = await setup();
      logger.error("failed", { error: new Error("detail") });
      assert.equal(lines.length, 1);
      assert.match(lines[0], /failed/);
      assert.match(lines[0], /error: Error: detail/);
      assert.match(lines[0], /at /); // stack trace
    });
  });

  describe("logger features", () => {
    it("formats lazy callback messages", async () => {
      const logger = await setup();
      logger.info((l) => l`lazy ${"value"}`);
      assert.equal(lines.length, 1);
      assert.match(lines[0], /lazy value/);
    });

    it("formats contextual properties from logger.with()", async () => {
      const logger = await setup();
      const child = logger.with({ requestId: "abc-123" });
      child.info("hello");
      assert.equal(lines.length, 1);
      assert.match(lines[0], /hello/);
      assert.match(lines[0], /requestId: "abc-123"/);
    });

    it("formats child logger category", async () => {
      const logger = await setup(["my", "app"]);
      const child = logger.getChild("db");
      child.info("connected");
      assert.equal(lines.length, 1);
      assert.match(lines[0], /\(my\.app\.db\)/);
      assert.match(lines[0], /connected/);
    });
  });

  describe("formatting", () => {
    it("formats all log levels", async () => {
      const logger = await setup();
      logger.trace("t");
      logger.debug("d");
      logger.info("i");
      logger.warn("w");
      logger.error("e");
      logger.fatal("f");
      assert.equal(lines.length, 6);
      assert.match(lines[0], /TRACE/);
      assert.match(lines[1], /DEBUG/);
      assert.match(lines[2], /INFO/);
      assert.match(lines[3], /WARN/);
      assert.match(lines[4], /ERROR/);
      assert.match(lines[5], /FATAL/);
    });

    it("formats category path", async () => {
      const logger = await setup(["my", "app"]);
      logger.info("hello");
      assert.equal(lines.length, 1);
      assert.match(lines[0], /\(my\.app\)/);
    });
  });
});
