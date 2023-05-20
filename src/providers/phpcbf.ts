import { spawn } from 'child_process';
import {
  TextDocument,
  Range,
  FormattingOptions,
  CancellationToken,
  TextEdit,
  DocumentFormattingEditProvider,
  languages,
  Uri,
  DocumentFilter,
} from 'vscode';
import DrupalWorkspaceProvider from '../base/drupal-workspace-provider';
import getPackage from '../utils/get-package';

const pack = getPackage();

export default class PHPCBFProvider
  extends DrupalWorkspaceProvider
  implements DocumentFormattingEditProvider
{
  extensions: string;
  documentFilters: DocumentFilter[] = ['php', 'twig'].map((language) => ({
    language,
    scheme: 'file',
    pattern: this.drupalWorkspace.getRelativePattern('**'),
  }));

  constructor(arg: ConstructorParameters<typeof DrupalWorkspaceProvider>[0]) {
    super(arg);

    this.disposables.push(
      languages.registerDocumentFormattingEditProvider(
        this.documentFilters,
        this
      )
    );

    this.extensions = pack.contributes.languages
      .map((lang: { id: string; extensions: string[] }) =>
        lang.extensions.map((item) => item.substring(1)).join(',')
      )
      .join(',');
  }

  async provideDocumentFormattingEdits(
    document: TextDocument,
    options: FormattingOptions,
    token: CancellationToken
  ): Promise<TextEdit[]> {
    const config = this.config;

    if (!config.get('enabled')) {
      return [];
    }

    let executablePath = config.get<string>('executablePath', '');

    if (executablePath === '') {
      executablePath = Uri.joinPath(
        this.drupalWorkspace.workspaceFolder.uri,
        'vendor/bin/phpcbf'
      ).fsPath;
    }

    return new Promise((resolve, reject) => {
      const filePath = document.uri.path;
      const spawnOptions = {
        encoding: 'utf8',
        timeout: 1000 * 60 * 1, // 1 minute
      };
      const args = [
        ...config.get('args', []),
        '-q',
        `--stdin-path=${filePath}`,
        `--extensions=${this.extensions}`,
        '-',
      ];

      // TODO: add abort signal
      const process = spawn(executablePath, args, spawnOptions);
      const originalText = document.getText();
      let formattedText = '';

      process.stdin.write(originalText);
      process.stdin.end();

      process.stdout.on('data', (data) => {
        formattedText += data.toString();
      });

      process.on('close', () => {
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
