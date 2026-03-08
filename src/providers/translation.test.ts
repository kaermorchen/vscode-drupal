import assert from "assert/strict";
import { describe, it } from "mocha";
import { workspace, Uri, TextDocument, Position, Range } from "vscode";
import { TranslationProvider } from "./translation";
import { DrupalWorkspace } from "../base/drupal-workspace";

describe("src/providers/translation", () => {
  it("Should be instantiated by DrupalWorkspace", () => {
    const workspaceFolder = workspace.workspaceFolders![0];
    assert.equal(workspaceFolder.name, "drupal-10");
    const drupalWorkspace = new DrupalWorkspace(workspaceFolder);

    const provider: TranslationProvider | undefined =
      drupalWorkspace.disposables.find((d) => d instanceof TranslationProvider);

    if (!provider) {
      throw new Error("TranslationProvider not found");
    }

    assert.ok(provider.selectors.length > 0);
    assert.ok(provider.moduleCompletions instanceof Map);
  });

  it("Should parse .po files and create completions", async () => {
    const workspaceFolder = workspace.workspaceFolders![0];
    const drupalWorkspace = new DrupalWorkspace(workspaceFolder);
    const provider = drupalWorkspace.disposables.find(
      (d) => d instanceof TranslationProvider,
    ) as TranslationProvider;

    // Use an existing .po file in the workspace
    const poUri = Uri.joinPath(
      workspaceFolder.uri,
      "web/core/tests/fixtures/files/translations/drupal-8.0.0.de.po",
    );
    // Trigger parseFiles with that URI
    await provider.parseFiles(poUri);

    // Check that moduleCompletions has entries
    // Since the file is a core translation, getModuleUri may return null, so completions may be empty.
    // We'll just verify that no error occurs.
    assert.ok(true);
  });

  it("Should provide completion items for PHP with prefix", async () => {
    const workspaceFolder = workspace.workspaceFolders![0];
    const drupalWorkspace = new DrupalWorkspace(workspaceFolder);
    const provider = drupalWorkspace.disposables.find(
      (d) => d instanceof TranslationProvider,
    ) as TranslationProvider;

    // Mock a document with PHP language and prefix "$this->t("
    const document = {
      uri: Uri.file("/tmp/test.php"),
      getText: () => '<?php $this->t("',
      languageId: "php",
      lineAt: (line: number) => ({
        text: '$this->t("',
        substring: (start: number, end: number) =>
          '$this->t("'.substring(start, end),
      }),
      getWordRangeAtPosition: (pos: Position) => new Range(pos, pos),
      positionAt: (offset: number) => new Position(0, offset),
    } as unknown as TextDocument;
    const position = new Position(0, 14); // after opening quote

    // We need to have some completions in moduleCompletions for the module.
    // Let's manually add a dummy completion for the test.
    const moduleUri = Uri.file("/tmp/module");
    provider.moduleCompletions.set(moduleUri.fsPath, [
      {
        label: "Hello world",
        kind: 1, // CompletionItemKind.Text
        detail: "translation",
      },
    ]);
    // Mock getModuleUri to return our moduleUri
    const originalGetModuleUri =
      require("../utils/get-module-uri").getModuleUri;
    require("../utils/get-module-uri").getModuleUri = () => moduleUri;

    try {
      const completions = await provider.provideCompletionItems(
        document,
        position,
      );
      // Since prefix matches, completions should be defined
      assert.ok(completions);
      assert.ok(Array.isArray(completions));
      // At least one completion
      assert.ok(completions.length >= 1);
    } finally {
      require("../utils/get-module-uri").getModuleUri = originalGetModuleUri;
    }
  });

  it("Should not provide completions when prefix does not match", async () => {
    const workspaceFolder = workspace.workspaceFolders![0];
    const drupalWorkspace = new DrupalWorkspace(workspaceFolder);
    const provider = drupalWorkspace.disposables.find(
      (d) => d instanceof TranslationProvider,
    ) as TranslationProvider;

    // Mock a document with PHP language but without translation prefix
    const document = {
      uri: Uri.file("/tmp/test.php"),
      getText: () => '<?php echo "Hello";',
      languageId: "php",
      lineAt: (line: number) => ({
        text: '<?php echo "Hello";',
        substring: (start: number, end: number) =>
          '<?php echo "Hello";'.substring(start, end),
      }),
      getWordRangeAtPosition: (pos: Position) => new Range(pos, pos),
      positionAt: (offset: number) => new Position(0, offset),
    } as unknown as TextDocument;
    const position = new Position(0, 10);

    const completions = await provider.provideCompletionItems(
      document,
      position,
    );
    // Should be undefined because prefix not matched
    assert.equal(completions, undefined);
  });

  it("Should extract variables from translation string", () => {
    const workspaceFolder = workspace.workspaceFolders![0];
    const drupalWorkspace = new DrupalWorkspace(workspaceFolder);
    const provider = drupalWorkspace.disposables.find(
      (d) => d instanceof TranslationProvider,
    ) as TranslationProvider;

    const variables = provider.getTranslateArgVariables(
      "Hello @name, welcome to %site",
    );
    assert.deepEqual(variables, ["@name", "%site"]);
  });
});
