import assert from "assert/strict";
import { describe, it } from "mocha";
import { parsePHPDocSummary } from "./doc-parser";

describe("src/utils/doc-parser", () => {
  describe("parsePHPDocSummary", () => {
    it("should extract single-line summary", () => {
      const doc = `/**
       * This is a summary.
       * This is a description.
       */`;
      const summary = parsePHPDocSummary(doc);
      assert.equal(summary, "This is a summary.\nThis is a description.");
    });

    it("should return undefined when first child is not text", () => {
      const doc = `/**
       * @param string $foo
       */`;
      const summary = parsePHPDocSummary(doc);
      assert.equal(summary, undefined);
    });

    it("should trim whitespace", () => {
      const doc = `/**
       *   Summary with spaces
       */`;
      const summary = parsePHPDocSummary(doc);
      assert.equal(summary, "Summary with spaces");
    });

    it("should handle empty doc block", () => {
      const doc = `/** */`;
      const summary = parsePHPDocSummary(doc);
      assert.equal(summary, undefined);
    });

    it("should handle multiline summary", () => {
      const doc = `/**
       * This is a summary
       * that continues on second line.
       * More description.
       */`;
      const summary = parsePHPDocSummary(doc);
      assert.equal(
        summary,
        "This is a summary\nthat continues on second line.\nMore description.",
      );
    });
  });
});
