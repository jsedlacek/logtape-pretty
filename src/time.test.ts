import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { formatTime } from "./time.ts";

describe("formatTime", () => {
  // 2024-03-15 08:11:46.123 UTC
  const epoch = Date.UTC(2024, 2, 15, 8, 11, 46, 123);

  it("formats HH:MM:ss (default pino-pretty format)", () => {
    assert.equal(formatTime(epoch, "UTC:HH:MM:ss"), "08:11:46");
  });

  it("formats with milliseconds", () => {
    assert.equal(formatTime(epoch, "UTC:HH:MM:ss.l"), "08:11:46.123");
  });

  it("formats full date-time", () => {
    assert.equal(
      formatTime(epoch, "UTC:yyyy-mm-dd HH:MM:ss"),
      "2024-03-15 08:11:46",
    );
  });

  it("formats date only", () => {
    assert.equal(formatTime(epoch, "UTC:yyyy-mm-dd"), "2024-03-15");
  });

  it("handles local time", () => {
    const date = new Date(epoch);
    const expected = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}:${String(date.getSeconds()).padStart(2, "0")}`;
    assert.equal(formatTime(epoch, "HH:MM:ss"), expected);
  });

  it("pads single-digit values", () => {
    // 2024-01-05 03:04:05.007 UTC
    const epoch2 = Date.UTC(2024, 0, 5, 3, 4, 5, 7);
    assert.equal(
      formatTime(epoch2, "UTC:yyyy-mm-dd HH:MM:ss.l"),
      "2024-01-05 03:04:05.007",
    );
  });
});
