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
} from 'vscode';
import { join } from 'path';
import DrupalWorkspaceProvider from '../base/drupal-workspace-provider';
import { DrupalWorkspaceProviderConstructorArguments } from '../types';

interface Message {
  message: string;
  ignorable: boolean;
  line: number;
}

export default class PHPStanDiagnosticProvider extends DrupalWorkspaceProvider {
  collection = languages.createDiagnosticCollection();

  constructor(args: DrupalWorkspaceProviderConstructorArguments) {
    super(args);

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
  }

  async validate(document: TextDocument) {
    if (
      this.drupalWorkspace.workspaceFolder !==
      workspace.getWorkspaceFolder(document.uri)
    ) {
      return;
    }

    const config = this.config;

    if (!config.get('enabled')) {
      return;
    }

    const executablePath = config.get('executablePath') as string;

    if (!executablePath) {
      window.showErrorMessage('Setting `executablePath` not found');
      return;
    }

    const filePath = document.uri.path;
    const spawnOptions = {
      cwd: this.drupalWorkspace.workspaceFolder.uri.fsPath,
      encoding: 'utf8',
      timeout: 1000 * 60 * 1, // 1 minute
    };
    const args = [
      join(this.drupalWorkspace.workspaceFolder.uri.fsPath, executablePath),
      ...config.get('args', []),
      '--no-progress',
      '--error-format=json',
      'analyse',
      filePath,
    ];

    // TODO: add abort signal
    const process = spawn('php', args, spawnOptions);

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
