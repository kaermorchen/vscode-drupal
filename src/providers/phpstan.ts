import { spawn } from "child_process";
import {
  Diagnostic,
  DiagnosticSeverity,
  languages,
  window,
  TextDocument,
  workspace,
  Range,
  Position,
  Uri,
  DocumentSelector,
} from "vscode";
import { DrupalWorkspaceProvider } from "../base/drupal-workspace-provider";
import { logger } from "../utils/logger";

interface PHPStanMessage {
  message: string;
  ignorable: boolean;
  line: number;
}

export class PHPStanProvider extends DrupalWorkspaceProvider {
  collection = languages.createDiagnosticCollection();
  docSelector: DocumentSelector;

  constructor(arg: ConstructorParameters<typeof DrupalWorkspaceProvider>[0]) {
    super(arg);

    this.docSelector = {
      language: "php",
      scheme: "file",
      pattern: this.drupalWorkspace.getRelativePattern("**"),
    };

    this.disposables.push(this.collection);

    if (window.activeTextEditor && process.env.NODE_ENV !== "test") {
      const doc = window.activeTextEditor.document;
      this.validate(doc).catch(() =>
        this.logError(`Document validation failed: ${doc.uri.fsPath}`),
      );
    }

    window.onDidChangeActiveTextEditor(
      (editor) => {
        if (editor && process.env.NODE_ENV !== "test") {
          const doc = editor.document;

          this.validate(doc).catch(() =>
            this.logError(`Document validation failed: ${doc.uri.fsPath}`),
          );
        }
      },
      this,
      this.disposables,
    );

    workspace.onDidSaveTextDocument(
      (doc) => {
        if (process.env.NODE_ENV !== "test") {
          this.validate(doc).catch(() =>
            this.logError(`Document validation failed: ${doc.uri.fsPath}`),
          );
        }
      },
      this,
      this.disposables,
    );

    workspace.onDidCloseTextDocument(
      this.clearDiagnostics,
      this,
      this.disposables,
    );
  }

  clearDiagnostics(doc: TextDocument) {
    if (this.collection.has(doc.uri)) {
      this.collection.set(doc.uri, []);
    }
  }

    /**
     * Validates a document using PHPStan.
     *
     * @param document The text document to validate.
     */
    async validate(document: TextDocument): Promise<void> {
    this.clearDiagnostics(document);

    if (languages.match(this.docSelector, document) === 0) {
      return;
    }

    const config = this.config;

    if (!config.get("enabled")) {
      return;
    }

    let executablePath = config.get<string>("executablePath", "");
    if (executablePath === "") {
      executablePath = Uri.joinPath(
        this.drupalWorkspace.workspaceFolder.uri,
        "vendor/bin/phpstan",
      ).fsPath;
    }

    return new Promise((resolve, reject) => {
      // Use relative path for validation to support containerized environments (ddev, lando, etc.)
      // where the absolute path on the host doesn't match the path in the container.
      const filePath = workspace.asRelativePath(document.uri, false);
      const spawnOptions = {
        cwd: this.drupalWorkspace.workspaceFolder.uri.fsPath,
        encoding: "utf8",
        timeout: 1000 * 60, // 1 minute
      };
      const args = [
        ...config.get("args", []),
        "--no-progress",
        "--error-format=json",
        "analyse",
        filePath,
      ];

      // Support wrapper commands (ddev, lando, docker, etc.) in executablePath.
      // These wrappers often output to stderr (e.g. exit status) which we need to handle gracefully.
      let command = executablePath;
      let commandArgs = args;
      const wrapperMatch = executablePath.match(/^(\S+)\s+(.+)$/);
      if (wrapperMatch) {
        command = wrapperMatch[1];
        commandArgs = [...wrapperMatch[2].split(/\s+/), ...args];
      }

      // TODO: add abort signal

      const process = spawn(command, commandArgs, spawnOptions);
      let result = "";
      let stderr: string | Error = "";

      process.stdout.on("data", (data) => {
        result += data.toString();
      });

      process.stderr.on("data", (data) => {
        if (stderr instanceof String === false) {
          stderr = "";
        }

        stderr += data;
      });

      process.on("error", (err) => {
        stderr = err;
      });

      process.on("close", (code) => {
        if (result) {
          try {
            const json = JSON.parse(result);

            const diagnostics: Diagnostic[] = [];
            const messages: PHPStanMessage[] =
              json?.files?.[filePath]?.messages ?? [];

            for (const obj of messages) {
              const line = document.lineAt(obj.line - 1);
              const severity = DiagnosticSeverity.Error;

              diagnostics.push({
                severity,
                message: obj.message,
                source: this.source,
                range: new Range(
                  new Position(
                    line.lineNumber,
                    line.firstNonWhitespaceCharacterIndex,
                  ),
                  new Position(line.lineNumber, line.range.end.character),
                ),
              });
            }

            this.collection.set(document.uri, diagnostics);

            const relativePath = workspace.asRelativePath(document.uri, false);
            this.logInfo(`Successfully validated ${relativePath}`);

            resolve();
          } catch (error) {
            this.logError(`Exit code ${code}: parsing error ${error}`);
            reject();
            return;
          }
        } else if (stderr) {
          this.logError(`Exit code ${code}: ${stderr}`);
          reject(new Error(`PHPStan process error: ${stderr}`));
        } else {
          this.logError(`Exit code ${code}: Unexpected error`);
          reject(new Error(`PHPStan process exited with code ${code}`));
        }
      });
    });
  }

  get name() {
    return "phpstan";
  }
}
