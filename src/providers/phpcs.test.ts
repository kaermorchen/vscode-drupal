import assert from "assert/strict";
import { describe, it } from "mocha";
import { workspace, Uri, TextDocument } from "vscode";
import { spawn } from "child_process";
import { PHPCSProvider } from "./phpcs";
import { DrupalWorkspace } from "../base/drupal-workspace";

describe("src/providers/phpcs", () => {
  it("Should be instantiated by DrupalWorkspace", () => {
    const workspaceFolder = workspace.workspaceFolders![0];
    assert.equal(workspaceFolder.name, "drupal-10");
    const drupalWorkspace = new DrupalWorkspace(workspaceFolder);

    const provider: PHPCSProvider | undefined =
      drupalWorkspace.disposables.find((d) => d instanceof PHPCSProvider);

    if (!provider) {
      throw new Error("PHPCSProvider not found");
    }

    assert.equal(provider.name, "phpcs");
    assert.ok(provider.extensions);
    assert.ok(provider.documentFilters.length > 0);
  });

  it("Should not validate when disabled", async () => {
    const config = workspace.getConfiguration("drupal.phpcs");
    const original = config.get("enabled");
    // Temporarily disable
    await config.update("enabled", false, true);
    try {
      const workspaceFolder = workspace.workspaceFolders![0];
      const drupalWorkspace = new DrupalWorkspace(workspaceFolder);
      const provider = drupalWorkspace.disposables.find(
        (d) => d instanceof PHPCSProvider,
      ) as PHPCSProvider;

      if (provider === undefined) {
        throw new Error("PHPCSProvider not found");
      }

      // Mock document
      const document = {
        uri: Uri.file("/tmp/test.php"),
        getText: () => '<?php echo "hi";',
        languageId: "php",
      } as unknown as TextDocument;

      await provider.validate(document);

      const diagnostics = provider.collection.get(document.uri);

      assert.ok(Array.isArray(diagnostics));
      assert.strictEqual(diagnostics.length, 0);
    } finally {
      await config.update("enabled", original, true);
    }
  });

  it("Should create diagnostics from phpcs output", async () => {
    const config = workspace.getConfiguration("drupal.phpcs");
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
      const listeners: { [event: string]: Function[] } = {
        close: [],
        error: [],
      };
      const mockProcess = {
        stdin: {
          write: (data: string) => {},
          end: () => {
            // After stdin ends, simulate stdout data and then close
            setImmediate(() => {
              // Simulate phpcs JSON output
              const output = JSON.stringify({
                files: {
                  [capturedFilePath!]: {
                    messages: [
                      {
                        message: "Missing file doc comment",
                        source: "Drupal.Commenting.FileComment",
                        severity: 5,
                        fixable: false,
                        type: "ERROR",
                        line: 1,
                        column: 1,
                      },
                      {
                        message: "Line indented incorrectly",
                        source: "Drupal.WhiteSpace.ScopeIndent",
                        severity: 3,
                        fixable: true,
                        type: "WARNING",
                        line: 2,
                        column: 5,
                      },
                    ],
                  },
                },
              });
              // Emit data event on stdout
              if (mockProcess.stdout.listeners.data) {
                mockProcess.stdout.listeners.data.forEach((cb) =>
                  cb(Buffer.from(output)),
                );
              }
              // Emit close event with code 0
              listeners.close.forEach((cb) => cb(0));
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
          on: (event: string, callback: (data: Buffer) => void) => {},
        },
        on: (event: string, callback: (code?: number) => void) => {
          if (listeners[event]) {
            listeners[event].push(callback);
          }
        },
      };
      return mockProcess;
    };

    try {
      const workspaceFolder = workspace.workspaceFolders![0];
      const drupalWorkspace = new DrupalWorkspace(workspaceFolder);
      const provider = drupalWorkspace.disposables.find(
        (d) => d instanceof PHPCSProvider,
      ) as PHPCSProvider;

      if (provider === undefined) {
        throw new Error("PHPCSProvider not found");
      }

      // Use a real file within the workspace to pass language match
      const fileUri = Uri.joinPath(workspaceFolder.uri, "web/autoload.php");
      const document = await workspace.openTextDocument(fileUri);

      await provider.validate(document);
      // Check that spawn was called
      assert.ok(spawned, "spawn should have been called");
      // Wait a bit for async processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Check that diagnostics were added to collection
      const diagnostics = provider.collection.get(document.uri);

      assert.ok(diagnostics, "diagnostics should exist");
      assert.equal(diagnostics!.length, 2);
      assert.equal(diagnostics![0].severity, 0); // ERROR severity mapping? In phpcs.ts LINTER_MESSAGE_TYPE.ERROR = DiagnosticSeverity.Error which is 0
      assert.equal(diagnostics![0].message, "Missing file doc comment");
      assert.equal(diagnostics![1].severity, 1); // WARNING severity mapping
    } finally {
      // Restore spawn
      (spawn as any) = originalSpawn;
      await config.update("enabled", originalEnabled, true);
      await config.update("args", originalArgs, true);
    }
  });

  it("Should handle containerized executable path (ddev, lando, docker)", async () => {
    const config = workspace.getConfiguration("drupal.phpcs");
    const originalExec = config.get("executablePath");
    const originalEnabled = config.get("enabled");
    await config.update("enabled", true, true);

    const originalSpawn = spawn;
    let spawnCalledWith: any = null;
    const handledCommands = ["ddev", "lando", "docker", "mytool"];
    (spawn as any) = (command: string, args: string[], options: any) => {
      if (handledCommands.includes(command)) {
        spawnCalledWith = { command, args, options };
      }
      // Return a minimal mock that allows the provider to "finish"
      return {
        stdout: { on: () => {} },
        stderr: { on: () => {} },
        on: (event: string, cb: any) => { if (event === "close") setImmediate(() => cb(0)); },
      };
    };

    try {
      const workspaceFolder = workspace.workspaceFolders![0];
      const drupalWorkspace = new DrupalWorkspace(workspaceFolder);
      const provider = new PHPCSProvider({ drupalWorkspace });
      const document = await workspace.openTextDocument(Uri.joinPath(workspaceFolder.uri, "web/autoload.php"));

      // Test DDEV
      await config.update("executablePath", "ddev exec vendor/bin/phpcs", true);
      spawnCalledWith = null;
      await provider.validate(document).catch(() => {});
      assert.strictEqual(spawnCalledWith?.command, "ddev");
      assert.strictEqual(
        spawnCalledWith?.options?.cwd,
        workspaceFolder.uri.fsPath,
      );
      assert.ok(
        spawnCalledWith?.args.includes("web/autoload.php"),
        "Args should include relative file path",
      );

      // Test Lando
      await config.update("executablePath", "lando phpcs", true);
      spawnCalledWith = null;
      await provider.validate(document).catch(() => {});
      assert.strictEqual(spawnCalledWith?.command, "lando");
      assert.strictEqual(
        spawnCalledWith?.options?.cwd,
        workspaceFolder.uri.fsPath,
      );
      assert.ok(
        spawnCalledWith?.args.includes("web/autoload.php"),
        "Args should include relative file path",
      );

      // Test a generic wrapper
      await config.update("executablePath", "mytool exec phpcs", true);
      spawnCalledWith = null;
      await provider.validate(document).catch(() => {});
      assert.strictEqual(spawnCalledWith?.command, "mytool");
      assert.strictEqual(
        spawnCalledWith?.options?.cwd,
        workspaceFolder.uri.fsPath,
      );
      assert.ok(
        spawnCalledWith?.args.includes("web/autoload.php"),
        "Args should include relative file path",
      );
    } finally {
      (spawn as any) = originalSpawn;
      await config.update("executablePath", originalExec, true);
      await config.update("enabled", originalEnabled, true);
    }
  });
});
