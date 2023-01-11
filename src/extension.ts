import { ExtensionContext, languages } from 'vscode';
import HookCompletionProvider from './providers/hook-completion';
import PHPCSDiagnosticProvider from './providers/phpcs-diagnostic';
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
    new PHPCSDiagnosticProvider(context)
  );
}

export function deactivate() {}
