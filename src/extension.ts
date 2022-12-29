import { join } from 'path';
import { ExtensionContext } from 'vscode';
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
} from 'vscode-languageclient/node';

let client: LanguageClient;

export function activate(context: ExtensionContext) {
  const serverModule = context.asAbsolutePath(join('out', 'server.js'));
  const debugOptions = { execArgv: ['--nolazy', '--inspect=6009'] };
  const serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
      options: debugOptions,
    },
  };

  const clientOptions: LanguageClientOptions = {
    documentSelector: [
      { language: 'php', scheme: 'file' },
      { language: 'twig', scheme: 'file' },
    ],
  };

  client = new LanguageClient('drupal', 'Drupal', serverOptions, clientOptions);
  client.start();
}

export function deactivate(): Thenable<void> | undefined {
  return client?.stop();
}
