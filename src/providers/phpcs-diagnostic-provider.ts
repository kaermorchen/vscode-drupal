import { spawn } from 'child_process';
import { URI } from 'vscode-uri';
import {
  Connection,
  Diagnostic,
  DiagnosticSeverity,
  DidChangeConfigurationNotification,
  DidChangeConfigurationParams,
  Disposable,
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

interface Config {
  enabled: boolean;
  standard: string;
}

const defaultSettings: Config = {
  enabled: true,
  standard: 'Drupal,DrupalPractice',
};

export default class PHPCSDiagnosticProvider {
  name = 'phpcs';
  connection: Connection;
  documents!: TextDocuments<TextDocument>;
  hasConfigurationCapability = false;
  hasWorkspaceFolderCapability = false;
  subscriptions: Disposable[] = [];
  config!: Config;

  constructor(connection: Connection) {
    this.connection = connection;

    this.connection.onInitialize(this.onInitialize.bind(this));
    this.connection.onInitialized(this.onInitialized.bind(this));
    this.connection.onDidChangeConfiguration(this.updateConfig.bind(this));
  }

  onInitialize(params: InitializeParams) {
    console.log('onInitialize');
    const workspace = params.capabilities?.workspace;

    this.hasConfigurationCapability = workspace?.configuration ?? false;
    this.hasWorkspaceFolderCapability = workspace?.workspaceFolders ?? false;

    const result: InitializeResult = {
      capabilities: {
        textDocumentSync: TextDocumentSyncKind.Full,
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
  }

  onInitialized() {
    console.log('onInitialized');
    if (this.hasConfigurationCapability) {
      this.connection.client.register(DidChangeConfigurationNotification.type);
    }

    this.updateConfig();
  }

  async updateConfig() {
    this.config = await this.connection.workspace.getConfiguration(this.configName);

    console.log('updateConfig', this.config);

    this.toggleProvider();
  }

  toggleProvider() {
    console.log('toggleProvider');
    if (this.config.enabled) {
      this.setup();
    } else {
      this.shutdown();
    }
  }

  setup(): void {
    console.log('setup');
    this.documents = new TextDocuments(TextDocument);

    const changeLister = this.documents.onDidChangeContent((e) =>
      this.validate(e.document)
    );
    const documentsLister = this.documents.listen(this.connection);

    this.subscriptions.push(changeLister, documentsLister);

    this.documents.all().forEach((document) => this.validate(document));
  }

  shutdown(): void {
    console.log('shutdown');
    this.subscriptions.forEach((item) => item.dispose());
    this.subscriptions = [];

    this.documents.all().forEach((document) => {
      this.connection.sendDiagnostics({ uri: document.uri, diagnostics: [] });
    });
  }

  get source() {
    return `Drupal: ${this.name}`;
  }

  get configName() {
    return `vscode-drupal.diagnostic.${this.name}`;
  }

  async validate(document: TextDocument) {
    console.log('validate');

    const uri = document.uri;
    const filePath = URI.parse(uri).path;
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
      `--standard=${this.config.standard}`,
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

  get phpcsPath() {
    return join('vendor', 'bin', this.name);
  }
}
