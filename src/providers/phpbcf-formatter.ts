import { spawn } from 'child_process';
import {
  TextDocument,
  Range,
  FormattingOptions,
  CancellationToken,
  TextEdit,
  window,
  DocumentFormattingEditProvider,
  languages,
  workspace,
} from 'vscode';
import { extname, join } from 'path';
import DrupalWorkspaceProvider from '../base/drupal-workspace-provider';
import { DrupalWorkspaceProviderConstructorArguments } from '../types';

export default class PHPCBFDocumentFormattingProvider
  extends DrupalWorkspaceProvider
  implements DocumentFormattingEditProvider
{
  static language = 'php';

  constructor(args: DrupalWorkspaceProviderConstructorArguments) {
    super(args);

    this.disposables.push(
      languages.registerDocumentFormattingEditProvider(
        {
          language: PHPCBFDocumentFormattingProvider.language,
          scheme: 'file',
          pattern: this.pattern,
        },
        this
      )
    );
  }

  async provideDocumentFormattingEdits(
    document: TextDocument,
    options: FormattingOptions,
    token: CancellationToken
  ): Promise<TextEdit[]> {
    if (
      this.drupalWorkspace.workspaceFolder !==
      workspace.getWorkspaceFolder(document.uri)
    ) {
      return [];
    }

    const config = this.config;

    if (!config.get('enabled')) {
      return [];
    }

    const executablePath = config.get('executablePath') as string;

    if (!executablePath) {
      window.showErrorMessage('Setting `executablePath` not found');
      return [];
    }

    return new Promise((resolve, reject) => {
      const filePath = document.uri.path;
      const spawnOptions = {
        encoding: 'utf8',
        timeout: 1000 * 60 * 1, // 1 minute
      };
      const args = [
        join(this.drupalWorkspace.workspaceFolder.uri.fsPath, executablePath),
        ...config.get('args', []),
        '-q',
        `--stdin-path=${filePath}`,
        `--extensions=${extname(filePath).slice(1)}/php`,
        '-',
      ];

      // TODO: add abort signal
      const process = spawn('php', args, spawnOptions);
      const originalText = document.getText();

      process.stdin.write(originalText);
      process.stdin.end();

      process.stdout.on('data', (data) => {
        const formattedText = data.toString();

        if (originalText === formattedText) {
          resolve([]);
        } else {
          const range = new Range(
            document.positionAt(0),
            document.positionAt(originalText.length)
          );

          resolve([new TextEdit(range, formattedText)]);
        }
      });

      process.stderr.on('data', (data) => {
        const msg = `stderr: ${data}`;
        console.error(msg);
        reject(new Error(msg));
      });
    });
  }

  get name() {
    return 'phpcbf';
  }
}
