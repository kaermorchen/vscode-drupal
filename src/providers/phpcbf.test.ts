import assert from "assert/strict";
import { describe, it } from "mocha";
import { workspace, Uri, TextDocument, CancellationToken } from "vscode";
import { spawn } from "child_process";
import { PHPCBFProvider } from "./phpcbf";
import { DrupalWorkspace } from "../base/drupal-workspace";

describe("src/providers/phpcbf", () => {
  it("Should not format when disabled", async () => {
    const config = workspace.getConfiguration("drupal.phpcbf");
    const original = config.get("enabled");
    // Temporarily disable
    await config.update("enabled", false, true);

    try {
      const workspaceFolder = workspace.workspaceFolders![0];
      const drupalWorkspace = new DrupalWorkspace(workspaceFolder);
      const provider = drupalWorkspace.disposables.find(
        (d) => d instanceof PHPCBFProvider,
      ) as PHPCBFProvider;

      if (provider === undefined) {
        throw new Error("PHPCBFProvider not found");
      }

      // Mock document
      const document = {
        uri: Uri.file("/tmp/test.php"),
        getText: () => '<?php echo "hi";',
        languageId: "php",
      } as unknown as TextDocument;

      const edits = await provider.provideDocumentFormattingEdits(document);

      assert.deepEqual(edits, []);
    } finally {
      await config.update("enabled", original, true);
    }
  });

  it("Should return TextEdit when formatting changes text", async () => {
    const config = workspace.getConfiguration("drupal.phpcbf");
    const originalEnabled = config.get("enabled");
    const originalArgs = config.get("args");
    // Enable and set empty args to avoid external dependencies
    await config.update("enabled", true, true);
    await config.update("args", [], true);

    // Mock spawn
    const originalSpawn = spawn;
    let spawned = false;
    (spawn as any) = (executablePath: string, args: string[], options: any) => {
      spawned = true;
      // Return a mock child process that emits formatted text
      const mockProcess = {
        stdin: {
          write: (data: string) => {},
          end: () => {},
        },
        stdout: {
          on: (event: string, callback: (data: Buffer) => void) => {
            if (event === "data") {
              // Simulate phpcbf output (formatted text)
              const formatted = '<?php echo "hi";\n'; // different from original
              setImmediate(() => callback(Buffer.from(formatted)));
            }
          },
        },
        stderr: {
          on: (event: string, callback: (data: Buffer) => void) => {},
        },
        on: (event: string, callback: (code: number) => void) => {
          if (event === "close") {
            setImmediate(() => callback(0));
          }
        },
      };
      return mockProcess;
    };

    try {
      const workspaceFolder = workspace.workspaceFolders![0];
      const drupalWorkspace = new DrupalWorkspace(workspaceFolder);
      const provider = drupalWorkspace.disposables.find(
        (d) => d instanceof PHPCBFProvider,
      ) as PHPCBFProvider;

      // Create a mock document with known text inside workspace
      const documentUri = Uri.joinPath(workspaceFolder.uri, "web/test.php");
      const originalText = '<?php echo "hi";';
      const document = {
        uri: documentUri,
        getText: () => originalText,
        languageId: "php",
        positionAt: (offset: number) => {
          // Simplified implementation for test
          const lines = originalText.substring(0, offset).split("\n");
          const line = lines.length - 1;
          const character = lines[line]?.length || 0;
          return { line, character };
        },
        lineAt: (line: number) => ({
          text: originalText.split("\n")[line] || "",
          range: { start: { line, character: 0 }, end: { line, character: 0 } },
        }),
        lineCount: originalText.split("\n").length,
      } as unknown as TextDocument;

      const edits = await provider.provideDocumentFormattingEdits(document);
      // Check that spawn was called
      assert.ok(spawned, "spawn should have been called");
      // Should have one TextEdit
      assert.equal(edits.length, 1);
      const edit = edits[0];
      assert.equal(edit.newText, '<?php echo "hi";\n');
      // Range should cover whole document
      assert.equal(edit.range.start.line, 0);
      assert.equal(edit.range.start.character, 0);
      // end position should be end of original text
      assert.equal(edit.range.end.line, 0);
      assert.equal(edit.range.end.character, originalText.length);
    } finally {
      // Restore spawn
      (spawn as any) = originalSpawn;
      await config.update("enabled", originalEnabled, true);
      await config.update("args", originalArgs, true);
    }
  });

  it("Should return empty array when formatting does not change text", async () => {
    const config = workspace.getConfiguration("drupal.phpcbf");
    const originalEnabled = config.get("enabled");
    const originalArgs = config.get("args");
    await config.update("enabled", true, true);
    await config.update("args", [], true);

    const originalSpawn = spawn;
    let spawned = false;
    (spawn as any) = (executablePath: string, args: string[], options: any) => {
      spawned = true;
      const mockProcess = {
        stdin: {
          write: (data: string) => {},
          end: () => {},
        },
        stdout: {
          on: (event: string, callback: (data: Buffer) => void) => {
            if (event === "data") {
              // Output same as input
              const original = '<?php echo "hi";';
              setImmediate(() => callback(Buffer.from(original)));
            }
          },
        },
        stderr: {
          on: (event: string, callback: (data: Buffer) => void) => {},
        },
        on: (event: string, callback: (code: number) => void) => {
          if (event === "close") {
            setImmediate(() => callback(0));
          }
        },
      };
      return mockProcess;
    };

    try {
      const workspaceFolder = workspace.workspaceFolders![0];
      const drupalWorkspace = new DrupalWorkspace(workspaceFolder);
      const provider = drupalWorkspace.disposables.find(
        (d) => d instanceof PHPCBFProvider,
      ) as PHPCBFProvider;

      // Mock document with same text as output
      const documentUri = Uri.joinPath(workspaceFolder.uri, "web/test.php");
      const originalText = '<?php echo "hi";';
      const document = {
        uri: documentUri,
        getText: () => originalText,
        languageId: "php",
        positionAt: (offset: number) => ({ line: 0, character: offset }),
        lineAt: (line: number) => ({
          text: originalText,
          range: {
            start: { line, character: 0 },
            end: { line, character: originalText.length },
          },
        }),
        lineCount: 1,
      } as unknown as TextDocument;

      const edits = await provider.provideDocumentFormattingEdits(document);
      assert.ok(spawned, "spawn should have been called");
      assert.deepEqual(edits, []);
    } finally {
      (spawn as any) = originalSpawn;
      await config.update("enabled", originalEnabled, true);
      await config.update("args", originalArgs, true);
    }
  });
});
