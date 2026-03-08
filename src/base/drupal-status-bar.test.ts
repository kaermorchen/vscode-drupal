import assert from "assert/strict";
import { describe, it } from "mocha";
import { DrupalStatusBar } from "./drupal-status-bar";

describe("src/base/drupal-status-bar", () => {
  it("should create a status bar item with correct properties", () => {
    const statusBar = new DrupalStatusBar();

    assert.ok(statusBar.statusBarItem);
    assert.equal(statusBar.statusBarItem.name, "Drupal");
    assert.equal(statusBar.statusBarItem.command, "drupal.show-output-channel");
    assert.equal(statusBar.statusBarItem.text, "$(drupal-logo) Drupal");
    // alignment and priority are internal, but we can check they exist
    assert.ok(statusBar.statusBarItem.alignment);
    assert.ok(statusBar.statusBarItem.priority);
  });

  it("should add status bar item to disposables", () => {
    const statusBar = new DrupalStatusBar();
    assert.ok(statusBar.disposables.includes(statusBar.statusBarItem));
  });

  it("should return itself from constructor", () => {
    const statusBar = new DrupalStatusBar();
    assert.ok(statusBar instanceof DrupalStatusBar);
  });
});
