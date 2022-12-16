import { spawn } from 'child_process';
import { URI } from 'vscode-uri';
import {
  Connection,
  Diagnostic,
  DiagnosticSeverity,
  TextDocuments,
} from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';

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

export default class PHPCSDiagnosticProvider {
  name = 'phpcs';
  documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);
  connection: Connection;

  constructor(connection: Connection) {
    this.connection = connection;

    this.documents.listen(this.connection);
    this.documents.onDidChangeContent((event) => {
      this.validate(event.document);
    });
  }

  get source() {
    return `Drupal: ${this.name}`;
  }

  private validate(document: TextDocument): void {
    const uri = document.uri;
    const filePath = URI.parse(uri).path;
    // TODO: read arguments from settings and environment
    const phpcsPath = 'vendor/bin/phpcs';
    const spawnOptions = {
      encoding: 'utf8',
      timeout: 1000 * 60 * 1, // 1 minute
    };
    const args = [
      phpcsPath,
      '--report=json',
      '-q',
      `--encoding=UTF-8`,
      `--stdin-path=${filePath}`,
      `--standard=Drupal,DrupalPractice`,
      '-'
    ];
    // TODO: add abort signal
    const phpcs = spawn('php', args, spawnOptions);

    phpcs.stdin.write(document.getText());
    phpcs.stdin.end();

    phpcs.stdout.on('data', (data) => {
      const json = JSON.parse(data);
      const diagnostics: Diagnostic[] = [];

      if (filePath in json.files) {
        json.files[filePath].messages.forEach((obj: LinterMessage) => {
          const severity: DiagnosticSeverity = LINTER_MESSAGE_TYPE[obj.type];
          const line = obj.line - 1;
          const character = obj.column;
          const { message } = obj;
          const { source } = this;
          const range = {
            start: { line, character },
            end: { line, character },
          };

          diagnostics.push({ severity, message, source, range });
        });
      }

      if (diagnostics.length) {
        this.connection.sendDiagnostics({ uri, diagnostics });
      }
    });

    phpcs.stderr.on('data', (data) => {
      console.error(`stderr: ${data}`);
    });

    // phpcs.on('close', (code) => {
    //   console.log(`child process exited with code ${code}`);
    // });
  }
}
