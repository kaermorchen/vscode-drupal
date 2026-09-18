import assert from "assert/strict";
import { describe, it } from "mocha";
import { workspace, Uri, TextDocument, CancellationToken } from "vscode";
import { spawn } from "child_process";
import { PHPCBFProvider } from "./phpcbf";
import { DrupalWorkspace } from "../base/drupal-workspace";

describe("src/providers/phpcbf", () => {
  it("Should be instantiated by DrupalWorkspace", () => {
    const workspaceFolder = workspace.workspaceFolders![0];
    assert.equal(workspaceFolder.name, "drupal-10");
    const drupalWorkspace = new DrupalWorkspace(workspaceFolder);

    const provider: PHPCBFProvider | undefined =
      drupalWorkspace.disposables.find((d) => d instanceof PHPCBFProvider);

    if (!provider) {
      throw new Error("PHPCBFProvider not found");
    }

    assert.equal(provider.name, "phpcbf");
    assert.ok(provider.extensions);
    assert.ok(provider.documentFilters.length > 0);
  });

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

  it("Should reject when phpcbf outputs to stderr", async () => {
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
          end: () => {
            // After stdin ends, simulate stderr data and then close
            setImmediate(() => {
              // Emit stderr data
              if (mockProcess.stderr.listeners.data) {
                mockProcess.stderr.listeners.data.forEach((cb) =>
                  cb(Buffer.from("Some error message")),
                );
              }
              // Emit close event with code 0
              mockProcess.listeners.close.forEach((cb) => cb(0));
            });
          },
        },
        stdout: {
          listeners: { data: [] as Function[] },
          on: (event: string, callback: (data: Buffer) => void) => {
            if (event === "data") {
              mockProcess.stdout.listeners.data.push(callback);
            }
          },
        },
        stderr: {
          listeners: { data: [] as Function[] },
          on: (event: string, callback: (data: Buffer) => void) => {
            if (event === "data") {
              mockProcess.stderr.listeners.data.push(callback);
            }
          },
        },
        listeners: { close: [] as Function[] },
        on: (event: string, callback: (code?: number) => void) => {
          if (event === "close") {
            mockProcess.listeners.close.push(callback);
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

      await assert.rejects(
        () => provider.provideDocumentFormattingEdits(document),
        /PHPCBF process error/,
        "Should reject with stderr error",
      );
      assert.ok(spawned, "spawn should have been called");
    } finally {
      (spawn as any) = originalSpawn;
      await config.update("enabled", originalEnabled, true);
      await config.update("args", originalArgs, true);
    }
  });

  it("Should handle containerized executable path (ddev, lando, docker)", async () => {
    const config = workspace.getConfiguration("drupal.phpcbf");
    const originalExec = config.get("executablePath");
    const originalEnabled = config.get("enabled");
    await config.update("enabled", true, true);

    const originalSpawn = spawn;
    let spawnCalledWith: any = null;
    const handledCommands = ["ddev", "lando", "docker"];
    (spawn as any) = (command: string, args: string[], options: any) => {
      if (handledCommands.includes(command)) {
        spawnCalledWith = { command, args, options };
      }
      return {
        stdin: { write: () => {}, end: () => {} },
        stdout: { on: () => {} },
        stderr: { on: () => {} },
        on: (event: string, cb: any) => { if (event === "close") setImmediate(() => cb(0)); },
      };
    };

    try {
      const workspaceFolder = workspace.workspaceFolders![0];
      const drupalWorkspace = new DrupalWorkspace(workspaceFolder);
      const provider = new PHPCBFProvider({ drupalWorkspace });
      const documentUri = Uri.joinPath(workspaceFolder.uri, "web/autoload.php");
      const document = await workspace.openTextDocument(documentUri);

      // Test DDEV
      await config.update("executablePath", "ddev exec vendor/bin/phpcbf", true);
      spawnCalledWith = null;
      await provider.provideDocumentFormattingEdits(document).catch(() => {});
      assert.strictEqual(spawnCalledWith?.command, "ddev");
      assert.strictEqual(
        spawnCalledWith?.options?.cwd,
        workspaceFolder.uri.fsPath,
      );

      // Test Lando
      await config.update("executablePath", "lando phpcbf", true);
      spawnCalledWith = null;
      await provider.provideDocumentFormattingEdits(document).catch(() => {});
      assert.strictEqual(spawnCalledWith?.command, "lando");
      assert.strictEqual(
        spawnCalledWith?.options?.cwd,
        workspaceFolder.uri.fsPath,
      );

      // Test Docker
      await config.update("executablePath", "docker exec -it my_container vendor/bin/phpcbf", true);
      spawnCalledWith = null;
      await provider.provideDocumentFormattingEdits(document).catch(() => {});
      assert.strictEqual(spawnCalledWith?.command, "docker");
      assert.strictEqual(
        spawnCalledWith?.options?.cwd,
        workspaceFolder.uri.fsPath,
      );
    } finally {
      (spawn as any) = originalSpawn;
      await config.update("executablePath", originalExec, true);
      await config.update("enabled", originalEnabled, true);
    }
  });

  it("Should accept exit code 1 when using wrapper with stderr output", async () => {
    const config = workspace.getConfiguration("drupal.phpcbf");
    const originalExec = config.get("executablePath");
    const originalEnabled = config.get("enabled");
    await config.update("enabled", true, true);
    await config.update("executablePath", "ddev exec vendor/bin/phpcbf", true);

    const originalSpawn = spawn;
    (spawn as any) = (command: string, args: string[], options: any) => {
      // Better mock implementation to support emitting
      const handlers: any = { stdout: [], stderr: [], close: [] };
      const proc: any = {
        stdin: { write: () => {}, end: () => {} },
        stdout: { on: (e: string, cb: any) => handlers.stdout.push(cb) },
        stderr: { on: (e: string, cb: any) => handlers.stderr.push(cb) },
        on: (e: string, cb: any) => { if (e === "close") handlers.close.push(cb) },
      };

      setImmediate(() => {
        // Emit formatted code
        handlers.stdout.forEach((cb: any) => cb(Buffer.from('<?php echo "fixed";')));
        // Emit stderr noise
        handlers.stderr.forEach((cb: any) => cb(Buffer.from("Failed to execute command: exit status 1")));
        // Emit exit code 1
        handlers.close.forEach((cb: any) => cb(1));
      });
      return proc;
    };

    try {
      const workspaceFolder = workspace.workspaceFolders![0];
      const drupalWorkspace = new DrupalWorkspace(workspaceFolder);
      const provider = new PHPCBFProvider({ drupalWorkspace });
      const documentUri = Uri.joinPath(workspaceFolder.uri, "web/test.php");
      const originalText = '<?php echo "broken";';
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
      assert.strictEqual(edits.length, 1);
      assert.strictEqual(edits[0].newText, '<?php echo "fixed";');
    } finally {
      (spawn as any) = originalSpawn;
      await config.update("executablePath", originalExec, true);
      await config.update("enabled", originalEnabled, true);
    }
  });
});
