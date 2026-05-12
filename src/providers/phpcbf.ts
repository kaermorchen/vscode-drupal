import { spawn } from "child_process";
import {
  TextDocument,
  Range,
  TextEdit,
  DocumentFormattingEditProvider,
  languages,
  Uri,
  DocumentFilter,
  workspace,
} from "vscode";
import { DrupalWorkspaceProvider } from "../base/drupal-workspace-provider";
import { getPackage } from "../utils/get-package";

const pack = getPackage();

export class PHPCBFProvider
  extends DrupalWorkspaceProvider
  implements DocumentFormattingEditProvider
{
  extensions: string;
  documentFilters: DocumentFilter[] = ["php", "twig"].map((language) => ({
    language,
    scheme: "file",
    pattern: this.drupalWorkspace.getRelativePattern("**"),
  }));

  constructor(arg: ConstructorParameters<typeof DrupalWorkspaceProvider>[0]) {
    super(arg);

    this.disposables.push(
      languages.registerDocumentFormattingEditProvider(
        this.documentFilters,
        this,
      ),
    );

    this.extensions = pack.contributes.languages
      .map((lang: { id: string; extensions: string[] }) =>
        lang.extensions.map((item) => item.substring(1)).join(","),
      )
      .join(",");
  }

    /**
     * Provide formatting edits for a document using PHPCBF.
     *
     * @param document The text document to format.
     * @returns An array of text edits to apply.
     */
    async provideDocumentFormattingEdits(
    document: TextDocument,
  ): Promise<TextEdit[]> {
    const config = this.config;

    if (!config.get("enabled")) {
      return [];
    }

    let executablePath = config.get<string>("executablePath", "");
    if (executablePath === "") {
      executablePath = Uri.joinPath(
        this.drupalWorkspace.workspaceFolder.uri,
        "vendor/bin/phpcbf",
      ).fsPath;
    }

    return new Promise((resolve, reject) => {
      // Use relative path for formatting to support containerized environments (ddev, lando, etc.)
      const filePath = document.uri.path;
      const spawnOptions = {
        encoding: "utf8",
        timeout: 1000 * 60 * 1, // 1 minute
        cwd: this.drupalWorkspace.workspaceFolder.uri.fsPath,
      };
      const args = [...config.get("args", []), "-q", "-"];

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
      const originalText = document.getText();
      let result = "";
      let stderr: string | Error = "";

      process.stdout.on("data", (data) => {
        result += data.toString();
      });

      process.stderr.on("data", (data) => {
        if (typeof stderr !== "string") {
          stderr = "";
        }

        stderr += data;
      });

      process.on("error", (err) => {
        stderr = err;
      });

      process.on("close", (code) => {
        // PHPCBF exit codes:
        // 0: No fixable errors found
        // 1: All fixable errors were fixed
        // 2: Fixable errors were found but some could not be fixed
        // 3: Processing error

        // If it's a wrapper, we might get stderr messages like "exit code 1" even if stdout has valid output.
        // If we have a result and exit code is 0 or 1, we should proceed.
        // Also if exit code is 2, we might still want to apply partial fixes if result is different from original.

        const isSuccessExitCode = code === 0 || code === 1;

        if (stderr && (!isWrapper || !result || !isSuccessExitCode)) {
          this.logError(`Exit code ${code}: ${stderr}`);
          reject(new Error(`PHPCBF process error: ${stderr}`));
        } else if (originalText === result) {
          const relativePath = workspace.asRelativePath(document.uri, false);
          this.logInfo(`Successfully formatted ${relativePath}`);

          resolve([]);
        } else if (originalText !== result) {
          if (/^ERROR/.test(result)) {
            const error = new Error(result);

            this.logError(error);
            reject(error);

            return;
          }

          const relativePath = workspace.asRelativePath(document.uri, false);
          this.logInfo(`Successfully formatted ${relativePath}`);

          const range = new Range(
            document.positionAt(0),
            document.positionAt(originalText.length),
          );

          resolve([new TextEdit(range, result)]);
        } else if (code !== 0 && code !== 1) {
          const error = new Error(`PHPCBF process exited with code ${code}`);

          this.logError(error);
          reject(error);
        } else {
          // This case should be unreachable if result is string and covered by === and !==
          // But technically if code is 0/1 and result === originalText, we already resolved above.
          const error = new Error(`Unexpected error`);

          this.logError(error);
          reject(error);
        }
      });

      process.stdin.write(originalText);
      process.stdin.end();
    });
  }

  get name() {
    return "phpcbf";
  }
}
