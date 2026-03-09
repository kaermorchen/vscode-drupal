import assert from "assert/strict";
import { describe, it } from "mocha";
import { logger, outputChannel } from "./logger";
import { spyOn } from "../testing";

describe("src/utils/logger", () => {
  it("should log info", () => {
    const spy = spyOn(outputChannel, "appendLine");

    logger.info("test");

    assert.match(spy.calls[0][0], /^\[INFO \d\d:\d\d:\d\d:\d\d\d\] test$/);
  });

  it("should log warn", () => {
    const spy = spyOn(outputChannel, "appendLine");

    logger.warn("test");

    assert.match(spy.calls[0][0], /^\[WARN \d\d:\d\d:\d\d:\d\d\d\] test$/);
  });

  it("should log error", () => {
    const spy = spyOn(outputChannel, "appendLine");

    logger.error("test");

    assert.match(spy.calls[0][0], /^\[ERROR \d\d:\d\d:\d\d:\d\d\d\] test$/);
  });

  it("should open output channel", () => {
    const spy = spyOn(outputChannel, "show");

    logger.openOutput();

    assert.strictEqual(spy.calls.length, 1);
  });
});
