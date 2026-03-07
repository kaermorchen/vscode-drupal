import assert from "assert/strict";
import { describe, it } from "mocha";
import { workspace, Uri, TextDocument, Position } from "vscode";
import { TwigCompletionProvider } from "./twig-completion";
import { DrupalWorkspace } from "../base/drupal-workspace";

describe("src/providers/twig-completion", () => {
  it("Should be instantiated by DrupalWorkspace", () => {
    const workspaceFolder = workspace.workspaceFolders![0];
    assert.equal(workspaceFolder.name, "drupal-10");
    const drupalWorkspace = new DrupalWorkspace(workspaceFolder);

    const provider: TwigCompletionProvider | undefined =
      drupalWorkspace.disposables.find(
        (d) => d instanceof TwigCompletionProvider,
      );

    if (!provider) {
      throw new Error("TwigCompletionProvider not found");
    }

    assert.equal(provider.constructor.name, "TwigCompletionProvider");
  });

  it("Should provide completion items for twig functions", () => {
    const workspaceFolder = workspace.workspaceFolders![0];
    const drupalWorkspace = new DrupalWorkspace(workspaceFolder);
    const provider = drupalWorkspace.disposables.find(
      (d) => d instanceof TwigCompletionProvider,
    ) as TwigCompletionProvider;

    // Mock twig document inside workspace
    const document = {
      uri: Uri.joinPath(workspaceFolder.uri, "web/test.html.twig"),
      getText: () => "",
      languageId: "twig",
      lineAt: (line: number) => ({
        text: "",
        substring: (start: number, end: number) => "".substring(start, end),
      }),
    } as unknown as TextDocument;
    const position = new Position(0, 0);

    const completions = provider.provideCompletionItems(document, position);
    // Should return twigFunctions (list of functions)
    assert.ok(Array.isArray(completions));
    // There are 10 functions defined in twigFunctions
    assert.equal(completions.length, 10);
    // Check that each item has label and kind
    completions.forEach((item) => {
      assert.ok(item.label);
      assert.ok(item.kind !== undefined);
    });
  });

  it("Should provide completion items for twig filters after pipe", () => {
    const workspaceFolder = workspace.workspaceFolders![0];
    const drupalWorkspace = new DrupalWorkspace(workspaceFolder);
    const provider = drupalWorkspace.disposables.find(
      (d) => d instanceof TwigCompletionProvider,
    ) as TwigCompletionProvider;

    // Create a mock twig document with pipe prefix
    const document = {
      uri: Uri.joinPath(workspaceFolder.uri, "web/test.html.twig"),
      getText: () => "{{ variable | ",
      languageId: "twig",
      lineAt: (line: number) => ({
        text: "{{ variable | ",
        substring: (start: number, end: number) =>
          "{{ variable | ".substring(start, end),
      }),
    } as unknown as TextDocument;
    const position = new Position(0, 14); // after pipe and space

    const completions = provider.provideCompletionItems(document, position);
    // Should return twigAll (functions + filters)
    assert.ok(Array.isArray(completions));
    // There are 10 functions + 9 filters = 19 items
    assert.equal(completions.length, 19);
  });

  it("Should return empty array if document not in workspace", () => {
    const workspaceFolder = workspace.workspaceFolders![0];
    const drupalWorkspace = new DrupalWorkspace(workspaceFolder);
    const provider = drupalWorkspace.disposables.find(
      (d) => d instanceof TwigCompletionProvider,
    ) as TwigCompletionProvider;

    // Document outside workspace
    const document = {
      uri: Uri.file("/tmp/outside.html.twig"),
      getText: () => "",
      languageId: "twig",
      lineAt: (line: number) => ({ text: "", substring: () => "" }),
    } as unknown as TextDocument;
    const position = new Position(0, 0);

    const completions = provider.provideCompletionItems(document, position);
    assert.deepEqual(completions, []);
  });
});
