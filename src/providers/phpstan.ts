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
  DocumentSelector,
} from 'vscode';
import DrupalWorkspaceProvider from '../base/drupal-workspace-provider';

interface Message {
  message: string;
  ignorable: boolean;
  line: number;
}

export default class PHPStanDiagnosticProvider extends DrupalWorkspaceProvider {
  collection = languages.createDiagnosticCollection();
  docSelector: DocumentSelector;

  constructor(arg: ConstructorParameters<typeof DrupalWorkspaceProvider>[0]) {
    super(arg);

    this.docSelector = {
      language: 'php',
      scheme: 'file',
      pattern: this.drupalWorkspace.getRelativePattern('**'),
    };

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

    workspace.onDidSaveTextDocument(this.validate, this, this.disposables);

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
    if (languages.match(this.docSelector, document) === 0) {
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
        'vendor/bin/phpstan'
      ).fsPath;
    }

    const filePath = document.uri.path;
    const spawnOptions = {
      cwd: this.drupalWorkspace.workspaceFolder.uri.fsPath,
      encoding: 'utf8',
      timeout: 1000 * 60 * 1, // 1 minute
    };
    const args = [
      ...config.get('args', []),
      '--no-progress',
      '--error-format=json',
      'analyse',
      filePath,
    ];

    // TODO: add abort signal
    const process = spawn(
      executablePath,
      args,
      spawnOptions
    );

    process.stdout.on('data', (data) => {
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
              new Position(
                line.lineNumber,
                line.firstNonWhitespaceCharacterIndex
              ),
              new Position(line.lineNumber, line.range.end.character)
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
    return 'phpstan';
  }
}
