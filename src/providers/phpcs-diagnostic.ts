import { spawn } from 'child_process';
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
} from 'vscode';
import { extname, join } from 'path';
import DrupalWorkspaceProvider from '../base/drupal-workspace-provider';

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

export default class PHPCSDiagnosticProvider extends DrupalWorkspaceProvider {
  collection = languages.createDiagnosticCollection();

  constructor(arg: ConstructorParameters<typeof DrupalWorkspaceProvider>[0]) {
    super(arg);

    this.disposables.push(this.collection);

    if (window.activeTextEditor) {
      this.validate(window.activeTextEditor.document);
    }

    window.onDidChangeActiveTextEditor(
      (editor) => {
        if (editor) {
          this.validate(editor.document);
        }
      },
      this,
      this.disposables
    );

    workspace.onDidChangeTextDocument(
      (e) => this.validate(e.document),
      this,
      this.disposables
    );

    workspace.onDidCloseTextDocument(
      this.clearDiagnostics,
      this,
      this.disposables
    );
  }

  clearDiagnostics(doc: TextDocument) {
    if (this.collection.has(doc.uri)) {
      this.collection.set(doc.uri, []);
    }
  }

  async validate(document: TextDocument) {
    if (!this.drupalWorkspace.hasFile(document.uri)) {
      return;
    }

    const config = this.config;

    if (!config.get('enabled')) {
      return;
    }

    let executablePath = config.get<string>('executablePath', '');

    if (executablePath === '') {
      executablePath = Uri.joinPath(
        this.drupalWorkspace.workspaceFolder.uri,
        'vendor/bin/phpcs'
      ).fsPath;
    }

    const filePath = document.uri.path;
    const spawnOptions = {
      encoding: 'utf8',
      timeout: 1000 * 60 * 1, // 1 minute
    };
    const args = [
      ...config.get('args', []),
      '-q',
      '--report=json',
      `--stdin-path=${filePath}`,
      `--extensions=${extname(filePath).slice(1)}/php`,
      '-',
    ];

    // TODO: add abort signal
    const process = spawn(executablePath, args, spawnOptions);

    process.stdin.write(document.getText());
    process.stdin.end();

    process.stdout.on('data', (data) => {
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

    process.stderr.on('data', (data) => {
      console.error(`stderr: ${data}`);
    });
  }

  get name() {
    return 'phpcs';
  }
}
