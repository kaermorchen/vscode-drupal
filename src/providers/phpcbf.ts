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

export default class PHPCBFProvider
  extends DrupalWorkspaceProvider
  implements DocumentFormattingEditProvider
{
  documentFilters: DocumentFilter[] = [
    {
      language: 'php',
      scheme: 'file',
      pattern: this.drupalWorkspace.getRelativePattern('**'),
    },
    {
      language: 'twig',
      scheme: 'file',
      pattern: this.drupalWorkspace.getRelativePattern('**'),
    },
  ];

  constructor(arg: ConstructorParameters<typeof DrupalWorkspaceProvider>[0]) {
    super(arg);

    this.disposables.push(
      languages.registerDocumentFormattingEditProvider(
        this.documentFilters,
        this
      )
    );
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

    const pack = await getPackage();
    const extensions = pack.contributes.languages
      .map((lang: { id: string; extensions: string[] }) =>
        lang.extensions.map((item) => item.substring(1)).join(',')
      )
      .join(',');

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
        `--extensions=${extensions}`,
        '-',
      ];

      // TODO: add abort signal
      const process = spawn(executablePath, args, spawnOptions);
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
