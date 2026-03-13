import assert from "assert/strict";
import { describe, it } from "mocha";
import { RelativePattern, workspace } from "vscode";
import { DrupalWorkspace } from "./drupal-workspace";
import { DrupalWorkspaceProviderWithWatcher } from "./drupal-workspace-provider-with-watcher";

class ConcreteProviderWithWatcher extends DrupalWorkspaceProviderWithWatcher {
  get name(): string {
    return "test-provider-with-watcher";
  }
}

describe("src/base/drupal-workspace-provider-with-watcher", () => {
  const workspaceFolder = workspace.workspaceFolders![0];

  it("should create watcher and add to disposables", () => {
    const drupalWorkspace = new DrupalWorkspace(workspaceFolder);
    const include = "**/*.php";
    const expectedPattern = new RelativePattern(
      drupalWorkspace.workspaceFolder,
      include,
    );

    const provider = new ConcreteProviderWithWatcher({
      drupalWorkspace,
      include,
    });

    assert.ok(provider.watcher);
    assert.deepEqual(provider.pattern, expectedPattern);
    assert.ok(provider.disposables.includes(provider.watcher));
  });

  it("should inherit from DrupalWorkspaceProvider", () => {
    const drupalWorkspace = new DrupalWorkspace(workspaceFolder);
    const include = "**/*.php";

    const provider = new ConcreteProviderWithWatcher({
      drupalWorkspace,
      include,
    });

    assert.ok(provider.drupalWorkspace === drupalWorkspace);
    // Check that getters work
    assert.equal(provider.name, "test-provider-with-watcher");
    assert.equal(provider.configName, "drupal.test-provider-with-watcher");
    assert.ok(provider.config);
    assert.equal(provider.source, "Drupal: test-provider-with-watcher");
  });
});
