import { spawn } from 'child_process';
import {
  Diagnostic,
  DiagnosticSeverity,
  DiagnosticCollection,
  ExtensionContext,
  languages,
  window,
  TextDocument,
  workspace,
  Range,
  Position,
} from 'vscode';
import { join } from 'path';
import Provider from './provider';

interface Message {
  message: string;
  ignorable: boolean;
  line: number;
}

export default class PHPStan extends Provider {
  collection: DiagnosticCollection;

  constructor(context: ExtensionContext) {
    super(context);

    this.collection = languages.createDiagnosticCollection();
    this.disposables.push(this.collection);

    if (window.activeTextEditor) {
      this.validate(window.activeTextEditor.document);
    }

    context.subscriptions.push(
      window.onDidChangeActiveTextEditor((editor) => {
        // TODO: add file type checking
        if (editor) {
          this.validate(editor.document);
        }
      }),
      workspace.onDidChangeTextDocument((e) => this.validate(e.document))
    );
  }

  get name() {
    return 'phpstan';
  }

  async validate(document: TextDocument) {
    const config = this.config;

    if (!config.get('enabled')) {
      return;
    }

    const executablePath = config.get('executablePath') as string;

    if (!executablePath) {
      window.showErrorMessage('Setting `executablePath` not found');
      return;
    }

    const workspaceFolder = workspace.getWorkspaceFolder(document.uri);

    if (!workspaceFolder) {
      return;
    }

    const filePath = document.uri.path;
    const spawnOptions = {
      encoding: 'utf8',
      timeout: 1000 * 60 * 1, // 1 minute
    };
    const args = [
      join(workspaceFolder.uri.fsPath, executablePath),
      ...config.get('args', []),
      '--no-progress',
      '--error-format=json',
      'analyse',
      filePath
    ];

    // TODO: add abort signal
    const phpcs = spawn('php', args, spawnOptions);

    phpcs.stdout.on('data', (data) => {
      const json = JSON.parse(data.toString());
      const diagnostics: Diagnostic[] = [];

      if (filePath in json.files) {
        json.files[filePath].messages.forEach((obj: Message) => {
          const line = document.lineAt(obj.line - 1);

          diagnostics.push({
            severity: DiagnosticSeverity.Error,
            message: obj.message,
            source: this.source,
            range: new Range(
              new Position(line.lineNumber, line.firstNonWhitespaceCharacterIndex),
              new Position(line.lineNumber, line.range.end.character)
            ),
          });
        });
      }

      this.collection.set(document.uri, diagnostics);
    });

    phpcs.stderr.on('data', (data) => {
      console.error(`stderr: ${data}`);
    });
  }
}
