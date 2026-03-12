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
      const filePath = document.uri.path;
      const spawnOptions = {
        encoding: "utf8",
        timeout: 1000 * 60 * 1, // 1 minute
      };
      const args = [
        ...config.get("args", []),
        "-q",
        "--config-set",
        "ignore_warnings_on_exit",
        "1",
        // "--config-set ignore_errors_on_exit 1",
        // "ignore_warnings_on_exit 1",
        // `--stdin-path=${filePath}`,
        // `--extensions=${this.extensions}`,
        // "-",
        filePath,
      ];

      // TODO: add abort signal
      const process = spawn(executablePath, args, spawnOptions);
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
        console.log("close");
        console.log("code", code);
        console.log("stderr", stderr);
        console.log("result", result.substring(0, 100));

        if (stderr) {
          this.logError(`Exit code ${code}: ${stderr}`);
          reject(new Error(`PHPCBF process error: ${stderr}`));
        } else if (originalText === result) {
          const relativePath = workspace.asRelativePath(document.uri, false);
          this.logInfo(`Successfully formatted ${relativePath}`);

          resolve([]);
        } else if (originalText !== result) {
          const relativePath = workspace.asRelativePath(document.uri, false);
          this.logInfo(`Successfully formatted ${relativePath}`);

          const range = new Range(
            document.positionAt(0),
            document.positionAt(originalText.length),
          );

          resolve([new TextEdit(range, result)]);
        } else if (code !== 0) {
          const error = new Error(`PHPCBF process exited with code ${code}`);

          this.logError(error);
          reject(error);
        } else {
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
