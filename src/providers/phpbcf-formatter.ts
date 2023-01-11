import { spawn } from 'child_process';
import {
  TextDocument,
  workspace,
  Range,
  FormattingOptions,
  CancellationToken,
  TextEdit,
} from 'vscode';
import { join } from 'path';
import Provider from './provider';

export default class PHPCBFDocumentFormattingProvider extends Provider {
  static language = 'php';
  name = 'phpcbf';

  async provideDocumentFormattingEdits(
    document: TextDocument,
    options: FormattingOptions,
    token: CancellationToken
  ): Promise<TextEdit[]> {
    const config = this.config;

    // if (!config.get('enabled')) {
    //   return [];
    // }

    const workspacePath = await this.getWorkspacePath();

    if (!workspacePath) {
      return [];
    }

    return new Promise((resolve, reject) => {
      const filePath = document.uri.path;
      const spawnOptions = {
        encoding: 'utf8',
        timeout: 1000 * 60 * 1, // 1 minute
      };
      const args = [
        join(workspacePath, 'vendor', 'bin', 'phpcbf'),
        '-q',
        `--stdin-path=${filePath}`,
        '--standard=Drupal,DrupalPractice',
        '-',
      ];
      // TODO: add abort signal
      const phpcbf = spawn('php', args, spawnOptions);
      const originalText = document.getText();

      phpcbf.stdin.write(originalText);
      phpcbf.stdin.end();

      phpcbf.stdout.on('data', (data) => {
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

      phpcbf.stderr.on('data', (data) => {
        console.error(`stderr: ${data}`);
      });
    });
  }

  get config() {
    return workspace.getConfiguration(this.configName);
  }

  get configName() {
    return `drupal.formatters.${this.name}`;
  }

  async getWorkspacePath(): Promise<string | undefined> {
    const workspaceFolders = workspace.workspaceFolders;

    if (typeof workspaceFolders === 'undefined') {
      return;
    }

    // TODO: which workspaces is current?
    return workspaceFolders[0].uri.path;
  }
}
