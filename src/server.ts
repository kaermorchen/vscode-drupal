import { createConnection, ProposedFeatures } from 'vscode-languageserver/node';
import TwigCompletionProvider from './providers/twig-completion-provider';
// import HookCompletionProvider from './providers/hook-completion-provider';
// import PHPCSDiagnosticProvider from './providers/phpcs-diagnostic-provider';

const connection = createConnection(ProposedFeatures.all);

// new PHPCSDiagnosticProvider(connection);
// new HookCompletionProvider(connection);
new TwigCompletionProvider(connection);

connection.listen();
