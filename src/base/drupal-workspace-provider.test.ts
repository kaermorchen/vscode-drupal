import assert from "assert/strict";
import { describe, it } from "mocha";
import { workspace, WorkspaceConfiguration } from "vscode";
import { DrupalWorkspace } from "./drupal-workspace";
import { DrupalWorkspaceProvider } from "./drupal-workspace-provider";

class ConcreteProvider extends DrupalWorkspaceProvider {
  get name(): string {
    return "test-provider";
  }
}

describe("src/base/drupal-workspace-provider", () => {
  const workspaceFolder = workspace.workspaceFolders![0];

  it("should store drupalWorkspace", () => {
    const drupalWorkspace = new DrupalWorkspace(workspaceFolder);
    const provider = new ConcreteProvider({ drupalWorkspace });
    assert.equal(provider.drupalWorkspace, drupalWorkspace);
  });

  it("should throw error when name getter is not implemented", () => {
    const drupalWorkspace = new DrupalWorkspace(workspaceFolder);
    const provider = new DrupalWorkspaceProvider({ drupalWorkspace });
    assert.throws(() => provider.name, /Getter name not implemented/);
  });

  it("should compute configName based on name", () => {
    const drupalWorkspace = new DrupalWorkspace(workspaceFolder);
    const provider = new ConcreteProvider({ drupalWorkspace });
    assert.equal(provider.configName, "drupal.test-provider");
  });

  it("should return configuration", () => {
    const drupalWorkspace = new DrupalWorkspace(workspaceFolder);
    const provider = new ConcreteProvider({ drupalWorkspace });
    const config = provider.config;

    assert.ok(typeof config.get === "function");
    assert.ok(typeof config.update === "function");
  });

  it("should return source string", () => {
    const drupalWorkspace = new DrupalWorkspace(workspaceFolder);
    const provider = new ConcreteProvider({ drupalWorkspace });
    assert.equal(provider.source, "Drupal: test-provider");
  });
});
