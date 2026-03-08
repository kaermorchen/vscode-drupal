import assert from "assert/strict";
import { describe, it } from "mocha";
import { workspace, Uri } from "vscode";
import { HookCompletionProvider } from "./hook-completion";
import { DrupalWorkspace } from "../base/drupal-workspace";

describe("src/providers/hook-completion", () => {
  it("Should return hook completion items", async () => {
    const workspaceFolder = workspace.workspaceFolders![0];
    assert.equal(workspaceFolder.name, "drupal-10");
    const drupalWorkspace = new DrupalWorkspace(workspaceFolder);

    const provider: HookCompletionProvider | undefined =
      drupalWorkspace.disposables.find(
        (d) => d instanceof HookCompletionProvider,
      );

    if (!provider) {
      throw new Error("HookCompletionProvider not found");
    }

    const moduleUri = Uri.joinPath(
      workspaceFolder.uri,
      "web/modules/menu_example/menu_example.module",
    );
    const document = await workspace.openTextDocument(moduleUri);

    const result = await provider.provideCompletionItems(document);

    assert.ok(Array.isArray(result));
    assert.ok(result.length >= 1);

    // Verify that each item is a hook (label starts with "hook_")
    for (const item of result) {
      assert.ok(typeof item.label === "string");
      assert.ok(item.label.startsWith("hook_"));
    }
  });
});
