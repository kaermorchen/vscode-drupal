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
import { ServicesCompletionProvider } from "./services";
import { DrupalWorkspace } from "../base/drupal-workspace";

describe("src/providers/services", () => {
  it("Should return service completion items", async () => {
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

    const provider: ServicesCompletionProvider | undefined =
      drupalWorkspace.disposables.find(
        (d) => d instanceof ServicesCompletionProvider,
      );

    if (!provider) {
      throw new Error("ServicesCompletionProvider not found");
    }

    const moduleUri = Uri.joinPath(
      workspaceFolder.uri,
      "web/modules/menu_example/menu_example.module",
    );
    const document = await workspace.openTextDocument(moduleUri);
    const editor = await window.showTextDocument(document);

    // Insert at the end of the document
    const insertPosition = new Position(document.lineCount, 0);
    await editor.edit((editBuilder) => {
      editBuilder.insert(insertPosition, 'Drupal::service("');
    });

    // After insertion, the new line is at index document.lineCount - 1
    const newLine = document.lineCount - 1;
    const lineText = document.lineAt(newLine).text;
    // Position at the end of the line (after the quote)
    const endPosition = new Position(newLine, lineText.length);
    const result = await provider.provideCompletionItems(document, endPosition);

    assert.ok(Array.isArray(result));
    assert.ok(result.length > 0);
  });
});
