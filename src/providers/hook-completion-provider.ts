import {
  CompletionItem,
  CompletionItemKind,
  Connection,
  DidChangeConfigurationNotification,
  Disposable,
  InitializeResult,
} from 'vscode-languageserver';

interface Config {
  enabled: boolean;
}

export default class HookCompletionProvider {
  name = 'hook';
  connection: Connection;
  hasConfigurationCapability = false;
  listeners: Disposable[] = [];

  constructor(connection: Connection) {
    this.connection = connection;
    this.connection.onInitialize(this.onInitialize.bind(this));
    this.connection.onInitialized(this.onInitialized.bind(this));
    this.connection.onDidChangeConfiguration(
      this.onDidChangeConfiguration.bind(this)
    );

    this.connection.onCompletion(this.onCompletion.bind(this));
    this.connection.onCompletionResolve(this.onCompletionResolve.bind(this));
  }

  onInitialize(): InitializeResult {
    return {
      capabilities: {
        completionProvider: {
          resolveProvider: true,
        },
      },
    };
  }

  async onInitialized() {
    if (this.hasConfigurationCapability) {
      this.connection.client.register(DidChangeConfigurationNotification.type);
    }
  }

  onCompletion(): CompletionItem[] {
    // The pass parameter contains the position of the text document in
    // which code complete got requested. For the example we ignore this
    // info and always provide the same completion items.
    return [
      {
        label: 'TypeScript',
        kind: CompletionItemKind.Text,
        data: 1,
      },
      {
        label: 'JavaScript',
        kind: CompletionItemKind.Text,
        data: 2,
      },
    ];
  }

  // This handler resolves additional information for the item selected in
  // the completion list.
  onCompletionResolve(item: CompletionItem): CompletionItem {
    if (item.data === 1) {
      item.detail = 'TypeScript details';
      item.documentation = 'TypeScript documentation';
    } else if (item.data === 2) {
      item.detail = 'JavaScript details';
      item.documentation = 'JavaScript documentation';
    }
    return item;
  }

  async onDidChangeConfiguration() {
    this._config = null;
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
    return `drupal.completions.${this.name}`;
  }
}
