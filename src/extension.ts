import { ExtensionContext, languages } from 'vscode';
import HookCompletionProvider from './providers/hook-completion';
import PHPCBFDocumentFormattingProvider from './providers/phpbcf-formatter';
import PHPCSDiagnosticProvider from './providers/phpcs-diagnostic';
import PHPStan from './providers/phpstan';
import TwigCompletionProvider from './providers/twig-completion';

export function activate(context: ExtensionContext) {
  context.subscriptions.push(
    languages.registerCompletionItemProvider(
      TwigCompletionProvider.language,
      new TwigCompletionProvider(context)
    ),
    languages.registerCompletionItemProvider(
      HookCompletionProvider.language,
      new HookCompletionProvider(context)
    ),
    languages.registerDocumentFormattingEditProvider(
      PHPCBFDocumentFormattingProvider.language,
      new PHPCBFDocumentFormattingProvider(context)
    ),
    new PHPCSDiagnosticProvider(context),
    new PHPStan(context)
  );
}

export function deactivate() {}
