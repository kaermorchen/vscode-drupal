import {
  createConnection,
  ProposedFeatures,
  TextDocumentSyncKind,
} from 'vscode-languageserver/node';
import PHPCSDiagnosticProvider from './providers/PHPCSDiagnosticProvider';

const connection = createConnection(ProposedFeatures.all);

connection.onInitialize(() => {
  return {
    capabilities: {
      textDocumentSync: {
        openClose: true,
        save: true,
        change: TextDocumentSyncKind.Full,
      },
      // hoverProvider: true,
    },
  };
});

new PHPCSDiagnosticProvider(connection);

connection.listen();
