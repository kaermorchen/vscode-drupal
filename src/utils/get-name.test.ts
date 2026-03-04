import assert from "assert/strict";
import { describe, it } from "mocha";
import { getName } from "./get-name";
import type { Identifier } from "php-parser";

describe("src/utils/get-name", () => {
  it("should return the string when val is a string", () => {
    const result = getName("example");
    assert.equal(result, "example");
  });

  it("should return the name property when val is an Identifier", () => {
    const identifier = {
      name: "testIdentifier",
      kind: "identifier",
    } as Identifier;
    const result = getName(identifier);
    assert.equal(result, "testIdentifier");
  });
});
