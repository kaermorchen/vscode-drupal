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
  DocumentFilter,
} from "vscode";
import { DrupalWorkspaceProvider } from "../base/drupal-workspace-provider";
import { getPackage } from "../utils/get-package";

const LINTER_MESSAGE_TYPE = {
  ERROR: DiagnosticSeverity.Error,
  WARNING: DiagnosticSeverity.Warning,
} as const;

type LinterMessageTypeValue = keyof typeof LINTER_MESSAGE_TYPE;

interface LinterMessage {
  message: string;
  source: string;
  severity: number;
  fixable: boolean;
  type: LinterMessageTypeValue;
  line: number;
  column: number;
}

const pack = getPackage();

export class PHPCSProvider extends DrupalWorkspaceProvider {
  extensions: string;
  collection = languages.createDiagnosticCollection();
  documentFilters: DocumentFilter[] = ["php", "twig"].map((language) => ({
    language,
    scheme: "file",
    pattern: this.drupalWorkspace.getRelativePattern("**"),
  }));

  constructor(arg: ConstructorParameters<typeof DrupalWorkspaceProvider>[0]) {
    super(arg);

    this.disposables.push(this.collection);

    this.extensions = pack.contributes.languages
      .map((lang: { id: string; extensions: string[] }) =>
        lang.extensions.map((item) => item.substring(1)).join(","),
      )
      .join(",");

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

    workspace.onDidChangeTextDocument(
      (e) => {
        if (process.env.NODE_ENV !== "test") {
          const doc = e.document;
          this.validate(e.document).catch(() =>
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
     * Validates a document using PHPCS.
     *
     * @param document The text document to validate.
     */
    async validate(document: TextDocument): Promise<void> {
    this.clearDiagnostics(document);

    if (languages.match(this.documentFilters, document) === 0) {
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
        "vendor/bin/phpcs",
      ).fsPath;
    }

    return new Promise((resolve, reject) => {
      // Use relative path for validation to support containerized environments (ddev, lando, etc.)
      // where the absolute path on the host doesn't match the path in the container.
      const filePath = workspace.asRelativePath(document.uri, false);
      const spawnOptions = {
        encoding: "utf8",
        timeout: 1000 * 60 * 1, // 1 minute
        cwd: this.drupalWorkspace.workspaceFolder.uri.fsPath,
      };
      const args = [...config.get("args", []), "-q", "--report=json", filePath];

      // Support wrapper commands (ddev, lando, docker, etc.) in executablePath.
      // These wrappers often output to stderr (e.g. exit status) which we need to handle gracefully.
      const wrapperMatch = executablePath.match(/^(\S+)\s+(.+)$/);
      const isWrapper = wrapperMatch !== null;
      let command = executablePath;
      let commandArgs = args;

      if (wrapperMatch) {
        command = wrapperMatch[1];
        commandArgs = [...wrapperMatch[2].split(/\s+/), ...args];
      }

      // TODO: add abort signal
      const process = spawn(command, commandArgs, spawnOptions);
      let result: string = "";
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
        // If it's a wrapper, we might get stderr messages like "exit code 2" even if stdout has valid JSON.
        // We prioritize parsing the result if available.
        if (stderr && (!isWrapper || !result)) {
          this.logError(`Exit code ${code}: ${stderr}`);
          reject();
        } else if (result) {
          if (/^ERROR/.test(result)) {
            stderr += result;
            reject();
            return;
          }

          try {
            const json = JSON.parse(result);
            const diagnostics: Diagnostic[] = [];
            const messages: LinterMessage[] | undefined =
              json?.files?.[filePath]?.messages ?? json?.files?.STDIN?.messages;

            if (!Array.isArray(messages)) {
              throw new Error("Responce messages is not an array");
            }

            for (const obj of messages) {
              const line = obj.line - 1;
              const character = obj.column;

              diagnostics.push({
                severity: LINTER_MESSAGE_TYPE[obj.type],
                message: obj.message,
                source: this.source,
                range: new Range(
                  new Position(line, character),
                  new Position(line, character),
                ),
              });
            }

            this.collection.set(document.uri, diagnostics);

            const relativePath = workspace.asRelativePath(document.uri, false);
            this.logInfo(`Successfully validated ${relativePath}`);

            resolve();
          } catch (error) {
            stderr += `Parsing error: ${error}`;
            reject();
            return;
          }
        } else {
          this.logError(`Exit code ${code}: Unexpected error`);
          reject(new Error(`PHPCS process exited with code ${code}`));
        }
      });

      process.stdin.write(document.getText());
      process.stdin.end();
    });
  }

  get name() {
    return "phpcs";
  }
}
