import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { createColorize, getLevelColorFn } from "./colors.ts";

describe("createColorize", () => {
  it("returns identity functions when disabled", () => {
    const c = createColorize(false);
    assert.equal(c.red("hello"), "hello");
    assert.equal(c.green("hello"), "hello");
    assert.equal(c.bold("hello"), "hello");
  });

  it("returns ANSI-wrapped strings when enabled", () => {
    const c = createColorize(true);
    assert.equal(c.red("hello"), "\x1b[31mhello\x1b[39m");
    assert.equal(c.green("hello"), "\x1b[32mhello\x1b[39m");
    assert.equal(c.bold("hello"), "\x1b[1mhello\x1b[22m");
    assert.equal(c.bgRed("hello"), "\x1b[41mhello\x1b[49m");
  });
});

describe("getLevelColorFn", () => {
  const c = createColorize(true);

  it("uses default level colors", () => {
    assert.equal(getLevelColorFn("info", c)("X"), c.green("X"));
    assert.equal(getLevelColorFn("error", c)("X"), c.red("X"));
    assert.equal(getLevelColorFn("warning", c)("X"), c.yellow("X"));
    assert.equal(getLevelColorFn("debug", c)("X"), c.blue("X"));
    assert.equal(getLevelColorFn("trace", c)("X"), c.gray("X"));
    assert.equal(getLevelColorFn("fatal", c)("X"), c.bgRed("X"));
  });

  it("uses custom colors when provided", () => {
    const result = getLevelColorFn("info", c, { info: "cyan" })("X");
    assert.equal(result, c.cyan("X"));
  });
});
