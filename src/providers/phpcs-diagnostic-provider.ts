import { spawn } from 'child_process';
import { URI } from 'vscode-uri';
import {
  Diagnostic,
  DiagnosticSeverity,
  DidChangeConfigurationNotification,
  InitializeParams,
  InitializeResult,
  TextDocumentChangeEvent,
  TextDocuments,
  TextDocumentSyncKind,
} from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { join } from 'path';
import Provider from './provider';

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
  arguments: string;
}

export default class PHPCSDiagnosticProvider extends Provider {
  name = 'phpcs';
  documents: TextDocuments<TextDocument>;
  hasConfigurationCapability = false;
  hasWorkspaceFolderCapability = false;

  constructor() {
    super();

    this.documents = new TextDocuments(TextDocument);

    this.disposables.push(
      this.connection.onInitialize(this.onInitialize.bind(this)),
      this.connection.onInitialized(this.onInitialized.bind(this)),
      this.connection.onDidChangeConfiguration(
        this.onDidChangeConfiguration.bind(this)
      ),

      this.documents.listen(this.connection),
      this.documents.onDidChangeContent(this.onDidChangeContent.bind(this))
    );
  }

  onInitialize(params: InitializeParams) {
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

  async onInitialized() {
    if (this.hasConfigurationCapability) {
      this.connection.client.register(DidChangeConfigurationNotification.type).then(disposable => {
        this.disposables.push(disposable);
      });
    }
  }

  onDidChangeContent(e: TextDocumentChangeEvent<TextDocument>) {
    this.validate(e.document);
  }

  async onDidChangeConfiguration() {
    this._config = null;

    const config = await this.config;

    if (config.enabled) {
      this.documents.all().forEach(this.validate, this);
    } else {
      this.clearDiagnostics();
    }
  }

  clearDiagnostics() {
    this.documents.all().forEach(({ uri }) => {
      this.connection.sendDiagnostics({ uri, diagnostics: [] });
    });
  }

  private _config: Config | null = null; //Cache for getter config
  get config(): Promise<Config> {
    if (this._config) {
      return Promise.resolve(this._config);
    }

    return this.connection.workspace
      .getConfiguration(this.configName)
      .then((config) => {
        this._config = config;

        return config;
      });
  }

  get source() {
    return `Drupal: ${this.name}`;
  }

  get configName() {
    return `drupal.diagnostics.${this.name}`;
  }

  async validate(document: TextDocument) {
    const config = await this.config;

    if (!config.enabled) {
      return;
    }

    const uri = document.uri;
    const filePath = URI.parse(uri).path;
    const spawnOptions = {
      encoding: 'utf8',
      timeout: 1000 * 60 * 1, // 1 minute
    };
    const args = [
      this.phpcsPath,
      '-q',
      '--report=json',
      `--stdin-path=${filePath}`,
      '--standard=Drupal,DrupalPractice',
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
