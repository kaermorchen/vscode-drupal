import assert from "assert/strict";
import { describe, it } from "mocha";
import { workspace } from "vscode";
import { GlobalVariablesCompletionProvider } from "./global-variables";
import { DrupalWorkspace } from "../base/drupal-workspace";

describe("src/providers/global-variables", () => {
  let provider: GlobalVariablesCompletionProvider | undefined;

  it("Should return completion items", async () => {
    const workspaceFolder = workspace.workspaceFolders![0];
    assert.equal(workspaceFolder.name, "drupal-10");
    const drupalWorkspace = new DrupalWorkspace(workspaceFolder);

    provider = drupalWorkspace.disposables.find(
      (d) => d instanceof GlobalVariablesCompletionProvider,
    );

    if (!provider) {
      throw new Error("GlobalVariablesCompletionProvider not found");
    }

    const result = await provider?.provideCompletionItems();

    assert.ok(Array.isArray(result));
    assert.strictEqual(result.length, 8);
  });
});
