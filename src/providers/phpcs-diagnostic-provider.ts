import { spawn } from 'child_process';
import { URI } from 'vscode-uri';
import {
  Connection,
  Diagnostic,
  DiagnosticSeverity,
  DidChangeConfigurationNotification,
  InitializeParams,
  InitializeResult,
  TextDocuments,
  TextDocumentSyncKind,
} from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { join } from 'path';

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
  documents = new TextDocuments(TextDocument);
  connection: Connection;
  hasConfigurationCapability = false;
  hasWorkspaceFolderCapability = false;

  constructor(connection: Connection) {
    this.connection = connection;

    this.init();
  }

  init(): void {
    this.connection.onInitialize((params: InitializeParams) => {
      const capabilities = params.capabilities;

      this.hasConfigurationCapability =
        capabilities?.workspace?.configuration ?? false;
      this.hasWorkspaceFolderCapability =
        capabilities?.workspace?.workspaceFolders ?? false;

      const result: InitializeResult = {
        capabilities: {
          textDocumentSync: {
            openClose: true,
            save: true,
            change: TextDocumentSyncKind.Full,
          },
        },
      };

      if (this.hasWorkspaceFolderCapability) {
        result.capabilities.workspace = {
          workspaceFolders: {
            supported: true,
          },
        };
      }

      return result;
    });

    this.connection.onInitialized(() => {
      if (this.hasConfigurationCapability) {
        this.connection.client.register(
          DidChangeConfigurationNotification.type
        );
      }
      // if (this.hasWorkspaceFolderCapability) {
      //   this.connection.workspace.onDidChangeWorkspaceFolders((_event) => {
      //     this.connection.console.log(
      //       'Workspace folder change event received.'
      //     );
      //   });
      // }
    });

    this.connection.onDidChangeConfiguration(() => {
      this.documents.all().forEach(this.validate, this);
    });

    this.documents.onDidChangeContent((event) => {
      this.validate(event.document);
    });

    this.documents.listen(this.connection);
  }

  get source() {
    return `Drupal: ${this.name}`;
  }

  get phpcsPath() {
    return join('vendor', 'bin', this.name);
  }

  get settings() {
    return this.connection.workspace.getConfiguration(
      `vscode-drupal.diagnostic.${this.name}`
    );
  }

  async validate(document: TextDocument) {
    const uri = document.uri;
    const filePath = URI.parse(uri).path;
    const config = await this.settings;
    const spawnOptions = {
      encoding: 'utf8',
      timeout: 1000 * 60 * 1, // 1 minute
    };
    const args = [
      this.phpcsPath,
      '--report=json',
      '-q',
      `--encoding=UTF-8`,
      `--stdin-path=${filePath}`,
      `--standard=${config.standard}`,
      '-',
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
      this.connection.console.error(`stderr: ${data}`);
    });
  }
}
