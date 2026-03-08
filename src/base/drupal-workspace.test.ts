import assert from "assert/strict";
import { describe, it } from "mocha";
import { workspace, Uri, RelativePattern } from "vscode";
import { DrupalWorkspace } from "./drupal-workspace";

describe("src/base/drupal-workspace", () => {
  const workspaceFolder = workspace.workspaceFolders![0];

  it("should initialize with workspace folder", () => {
    const drupalWorkspace = new DrupalWorkspace(workspaceFolder);
    assert.ok(drupalWorkspace.workspaceFolder);
    assert.equal(drupalWorkspace.workspaceFolder.name, "drupal-10");
  });

  it("should add providers to disposables", () => {
    const drupalWorkspace = new DrupalWorkspace(workspaceFolder);
    // Check that disposables contains providers (at least one)
    const providerNames = [
      "GlobalVariablesCompletionProvider",
      "RoutingCompletionProvider",
      "HookCompletionProvider",
      "ServicesCompletionProvider",
      "TranslationProvider",
      "TwigCompletionProvider",
      "PHPCBFProvider",
      "PHPCSProvider",
      "PHPStanProvider",
    ];
    // Cannot directly check types, but can ensure disposables is not empty
    assert.ok(drupalWorkspace.disposables.length >= providerNames.length);
  });

  it("should create composer.lock watcher", () => {
    const drupalWorkspace = new DrupalWorkspace(workspaceFolder);
    // @ts-ignore - access private field for testing
    const watcher = drupalWorkspace.composerLockWatcher;
    assert.ok(watcher);
    assert.ok(drupalWorkspace.disposables.includes(watcher));
  });

  describe("hasFile", () => {
    it("should return true for file in workspace", () => {
      const drupalWorkspace = new DrupalWorkspace(workspaceFolder);
      const uri = Uri.joinPath(
        drupalWorkspace.workspaceFolder.uri,
        "composer.json",
      );
      const result = drupalWorkspace.hasFile(uri);
      assert.equal(result, true);
    });

    it("should return false for file outside workspace", () => {
      const drupalWorkspace = new DrupalWorkspace(workspaceFolder);
      const uri = Uri.file("/tmp/outside");
      const result = drupalWorkspace.hasFile(uri);
      assert.equal(result, false);
    });
  });

  describe("getRelativePattern", () => {
    it("should return RelativePattern with correct workspace folder", () => {
      const drupalWorkspace = new DrupalWorkspace(workspaceFolder);
      const pattern = drupalWorkspace.getRelativePattern("**/*.php");
      assert.ok(pattern instanceof RelativePattern);
      assert.equal(pattern.base, drupalWorkspace.workspaceFolder.uri.fsPath);
      assert.equal(pattern.pattern, "**/*.php");
    });
  });

  describe("findFile", () => {
    it("should find existing file", async () => {
      const drupalWorkspace = new DrupalWorkspace(workspaceFolder);
      const uri = await drupalWorkspace.findFile("composer.json");
      assert.ok(uri);
      assert.equal(uri?.fsPath.endsWith("composer.json"), true);
    });

    it("should return undefined for non-existent file", async () => {
      const drupalWorkspace = new DrupalWorkspace(workspaceFolder);
      const uri = await drupalWorkspace.findFile("non-existent-file.xyz");
      assert.equal(uri, undefined);
    });
  });

  describe("findFiles", () => {
    it("should find multiple files", async () => {
      const drupalWorkspace = new DrupalWorkspace(workspaceFolder);
      const uris = await drupalWorkspace.findFiles("**/*.yml", null, 5);
      assert.ok(Array.isArray(uris));
      assert.ok(uris.length <= 5);
    });
  });

  describe("getDrupalVersion", () => {
    it("should return a number for Drupal 10 workspace", async () => {
      const drupalWorkspace = new DrupalWorkspace(workspaceFolder);
      const version = await drupalWorkspace.getDrupalVersion();
      // In the test workspace drupal-10 version should be 10.x
      assert.ok(typeof version === "number");
      assert.ok(version >= 10);
    });

    it("should cache version after first call", async () => {
      const drupalWorkspace = new DrupalWorkspace(workspaceFolder);
      const first = await drupalWorkspace.getDrupalVersion();
      const second = await drupalWorkspace.getDrupalVersion();
      assert.equal(first, second);
    });
  });
});
