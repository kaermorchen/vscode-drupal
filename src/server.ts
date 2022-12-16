import {
  createConnection,
  ProposedFeatures,
} from 'vscode-languageserver/node';
import PHPCSDiagnosticProvider from './providers/phpcs-diagnostic-provider';

const connection = createConnection(ProposedFeatures.all);

new PHPCSDiagnosticProvider(connection);

connection.listen();
