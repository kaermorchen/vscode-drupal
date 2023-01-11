import { ExtensionContext, languages } from 'vscode';
import HookCompletionProvider from './providers/hook-completion';
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
  );
}

export function deactivate() {}
