import { ExtensionContext, languages } from 'vscode';
import TwigCompletionProvider from './providers/twig-completion';

export function activate(context: ExtensionContext) {
  context.subscriptions.push(
    languages.registerCompletionItemProvider(
      TwigCompletionProvider.language,
      new TwigCompletionProvider(context)
    )
  );
}

export function deactivate() {}
