import {
  createConnection,
  ProposedFeatures,
  TextDocumentSyncKind,
} from 'vscode-languageserver/node';

import PHPCSDiagnosticsProvider from './providers/phpcsDiagnosticsProvider';

function main(): void {
  const connection = createConnection(ProposedFeatures.all);

  connection.onInitialize(() => {
    return {
      capabilities: {
        textDocumentSync: {
          openClose: true,
          save: true,
          change: TextDocumentSyncKind.Full,
        },
        hoverProvider: true,
      },
    };
  });

  new PHPCSDiagnosticsProvider(connection);

  connection.listen();
}

main();
