import assert from "assert/strict";
import { describe, it } from "mocha";
import {
  workspace,
  Uri,
  Position,
  window,
  ConfigurationTarget,
  extensions,
} from "vscode";
import { RoutingCompletionProvider } from "./routing";
import { DrupalWorkspace } from "../base/drupal-workspace";

describe("src/providers/routing", () => {
  it("Should return route completion items", async () => {
    const extension = extensions.getExtension("stanislav.vscode-drupal");

    if (extension) {
      await extension.activate();

      assert.strictEqual(extension.isActive, true);
    } else {
      assert.fail("Extension not found");
    }

    const config = workspace.getConfiguration("drupal.phpcs");

    await config.update("enabled", false, ConfigurationTarget.Global);

    const workspaceFolder = workspace.workspaceFolders![0];
    assert.equal(workspaceFolder.name, "drupal-10");
    const drupalWorkspace = new DrupalWorkspace(workspaceFolder);

    const provider: RoutingCompletionProvider | undefined =
      drupalWorkspace.disposables.find(
        (d) => d instanceof RoutingCompletionProvider,
      );

    if (!provider) {
      throw new Error("RoutingCompletionProvider not found");
    }

    const moduleUri = Uri.joinPath(
      workspaceFolder.uri,
      "web/modules/menu_example/menu_example.module",
    );
    const document = await workspace.openTextDocument(moduleUri);
    const editor = await window.showTextDocument(document);

    await editor.edit((editBuilder) => {
      editBuilder.insert(new Position(44, 0), 'new Url("');
    });

    const result = await provider.provideCompletionItems(
      document,
      new Position(43, 9),
    );

    assert.ok(Array.isArray(result));
    assert.ok(result.length > 0);
  });
});
