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
import { extname, join } from 'path';
import Provider from './provider';

const LINTER_MESSAGE_TYPE = <const>{
  ERROR: DiagnosticSeverity.Error,
  WARNING: DiagnosticSeverity.Warning,
};

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

export default class PHPCSDiagnosticProvider extends Provider {
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
        if (editor) {
          this.validate(editor.document);
        }
      }),
      workspace.onDidChangeTextDocument((e) => this.validate(e.document))
    );
  }

  get name() {
    return 'phpcs';
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
      '-q',
      '--report=json',
      `--stdin-path=${filePath}`,
      `--extensions=${extname(filePath).slice(1)}/php`,
      '-',
    ];

    // TODO: add abort signal
    const phpcs = spawn('php', args, spawnOptions);

    phpcs.stdin.write(document.getText());
    phpcs.stdin.end();

    phpcs.stdout.on('data', (data) => {
      const json = JSON.parse(data.toString());
      const diagnostics: Diagnostic[] = [];

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
              new Position(line, character)
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
