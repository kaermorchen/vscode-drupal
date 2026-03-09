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
import { logger } from "../utils/logger";

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

    if (window.activeTextEditor) {
      const doc = window.activeTextEditor.document;
      this.validate(doc).catch(() =>
        this.logError(`Document validation failed: ${doc.uri.fsPath}`),
      );
    }

    window.onDidChangeActiveTextEditor(
      (editor) => {
        if (editor) {
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
        const doc = e.document;
        this.validate(e.document).catch(() =>
          this.logError(`Document validation failed: ${doc.uri.fsPath}`),
        );
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
      const filePath = document.uri.path;
      const spawnOptions = {
        encoding: "utf8",
        timeout: 1000 * 60 * 1, // 1 minute
      };
      const args = [
        ...config.get("args", []),
        "-q",
        "--report=json",
        `--stdin-path=${filePath}`,
        `--extensions=${this.extensions}`,
        "-",
      ];
      const diagnostics: Diagnostic[] = [];

      // TODO: add abort signal
      const process = spawn(executablePath, args, spawnOptions);
      let stderr: string | Error = "";

      process.stdout.on("data", (data) => {
        const stringifiedData = data.toString();
        let json;

        if (/^ERROR/.test(stringifiedData)) {
          stderr += stringifiedData;
          reject();
          return;
        }

        try {
          json = JSON.parse(stringifiedData);

          if (filePath in json.files) {
            json.files[filePath].messages.forEach((obj: LinterMessage) => {
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
            });
          }

          this.collection.set(document.uri, diagnostics);
        } catch (error) {
          stderr += `Parsing error: ${error}`;
          reject();
          return;
        }
      });

      process.stderr.on("data", (data) => {
        this.logError(`process.stderr data ${data}`);

        if (stderr instanceof String === false) {
          stderr = "";
        }

        stderr += data;
      });

      process.on("error", (err) => {
        this.logError(`process error ${err}`);

        stderr = err;
      });

      process.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else if (diagnostics.length === 0) {
          this.logError(`Exit code ${code}: ${stderr}`);
          reject();
        }
      });

      process.stdin.write(document.getText());
      process.stdin.end();
    });
  }

  get name() {
    return "phpcs";
  }

  logError(message: string | Error) {
    logger.error(`${this.name}: ${message}`);
  }
}
