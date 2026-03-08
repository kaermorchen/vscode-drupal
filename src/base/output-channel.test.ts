import assert from "assert/strict";
import { describe, it } from "mocha";
import { outputChannel } from "./output-channel";

describe("src/base/output-channel", () => {
  it('should create an output channel with name "Drupal"', () => {
    assert.ok(outputChannel);
    assert.equal(outputChannel.name, "Drupal");
  });

  it("should have methods for output", () => {
    assert.ok(typeof outputChannel.append === "function");
    assert.ok(typeof outputChannel.appendLine === "function");
    assert.ok(typeof outputChannel.clear === "function");
    assert.ok(typeof outputChannel.show === "function");
    assert.ok(typeof outputChannel.hide === "function");
    assert.ok(typeof outputChannel.dispose === "function");
  });
});
