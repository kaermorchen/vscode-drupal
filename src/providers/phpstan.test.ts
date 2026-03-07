import assert from "assert/strict";
import { describe, it } from "mocha";
import { workspace, Uri, TextDocument, languages } from "vscode";
import { spawn } from "child_process";
import { PHPStanProvider } from "./phpstan";
import { DrupalWorkspace } from "../base/drupal-workspace";

describe("src/providers/phpstan", () => {
  it("Should be instantiated by DrupalWorkspace", () => {
    const workspaceFolder = workspace.workspaceFolders![0];
    assert.equal(workspaceFolder.name, "drupal-10");
    const drupalWorkspace = new DrupalWorkspace(workspaceFolder);

    const provider: PHPStanProvider | undefined =
      drupalWorkspace.disposables.find((d) => d instanceof PHPStanProvider);

    if (!provider) {
      throw new Error("PHPStanProvider not found");
    }

    assert.equal(provider.name, "phpstan");
    assert.ok(provider.docSelector);
    assert.ok(provider.collection);
  });

  it("Should not validate when disabled", async () => {
    const config = workspace.getConfiguration("drupal.phpstan");
    const original = config.get("enabled");
    // Temporarily disable
    await config.update("enabled", false, true);
    try {
      const workspaceFolder = workspace.workspaceFolders![0];
      const drupalWorkspace = new DrupalWorkspace(workspaceFolder);
      const provider = drupalWorkspace.disposables.find(
        (d) => d instanceof PHPStanProvider,
      ) as PHPStanProvider;

      // Mock document
      const document = {
        uri: Uri.file("/tmp/test.php"),
        getText: () => '<?php echo "hi";',
        languageId: "php",
      } as unknown as TextDocument;

      // This should early return because enabled is false
      await provider.validate(document);
      // If we reach here, no error is fine
    } finally {
      await config.update("enabled", original, true);
    }
  });

  it("Should create diagnostics from phpstan output", async () => {
    const config = workspace.getConfiguration("drupal.phpstan");
    const originalEnabled = config.get("enabled");
    const originalArgs = config.get("args");
    // Enable and set empty args to avoid external dependencies
    await config.update("enabled", true, true);
    await config.update("args", [], true);

    // Mock spawn
    const originalSpawn = spawn;
    let spawned = false;
    let capturedFilePath: string | null = null;
    (spawn as any) = (executablePath: string, args: string[], options: any) => {
      spawned = true;
      // Capture the file path from args (last argument)
      capturedFilePath = args[args.length - 1];
      // Return a mock child process that emits JSON output
      const mockProcess = {
        stdout: {
          on: (event: string, callback: (data: Buffer) => void) => {
            if (event === "data") {
              // Simulate phpstan JSON output
              const output = JSON.stringify({
                files: {
                  [capturedFilePath!]: {
                    messages: [
                      {
                        message: "Call to an undefined method Foo::bar().",
                        ignorable: true,
                        line: 10,
                      },
                      {
                        message: "Access to an undefined property Foo::$baz.",
                        ignorable: false,
                        line: 15,
                      },
                    ],
                  },
                },
              });
              // Simulate async emission
              setImmediate(() => callback(Buffer.from(output)));
            }
          },
        },
        stderr: {
          on: (event: string, callback: (data: Buffer) => void) => {},
        },
      };
      return mockProcess;
    };

    try {
      const workspaceFolder = workspace.workspaceFolders![0];
      const drupalWorkspace = new DrupalWorkspace(workspaceFolder);
      const provider = drupalWorkspace.disposables.find(
        (d) => d instanceof PHPStanProvider,
      ) as PHPStanProvider;

      // Create a mock document with known text inside workspace
      const documentUri = Uri.joinPath(workspaceFolder.uri, "web/test.php");
      const originalText = '<?php echo "hi";';
      // Mock lineAt to return a line with firstNonWhitespaceCharacterIndex
      const document = {
        uri: documentUri,
        getText: () => originalText,
        languageId: "php",
        lineAt: (line: number) => ({
          lineNumber: line,
          firstNonWhitespaceCharacterIndex: 0,
          range: { end: { character: originalText.length } },
        }),
      } as unknown as TextDocument;

      await provider.validate(document);
      // Check that spawn was called
      assert.ok(spawned, "spawn should have been called");
      // Wait a bit for async processing
      await new Promise((resolve) => setTimeout(resolve, 100));
      // Check that diagnostics were added to collection
      const diagnostics = provider.collection.get(document.uri);
      assert.ok(diagnostics, "diagnostics should exist");
      assert.equal(diagnostics!.length, 2);
      // Both diagnostics have severity Error (DiagnosticSeverity.Error = 0)
      assert.equal(diagnostics![0].severity, 0);
      assert.equal(
        diagnostics![0].message,
        "Call to an undefined method Foo::bar().",
      );
      assert.equal(diagnostics![1].severity, 0);
      assert.equal(
        diagnostics![1].message,
        "Access to an undefined property Foo::$baz.",
      );
    } finally {
      // Restore spawn
      (spawn as any) = originalSpawn;
      await config.update("enabled", originalEnabled, true);
      await config.update("args", originalArgs, true);
    }
  });
});
