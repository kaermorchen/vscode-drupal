import { ExtensionContext, languages } from 'vscode';
import GlobalVariablesCompletionProvider from './providers/global-variables';
import HookCompletionProvider from './providers/hook-completion';
import PHPCBFDocumentFormattingProvider from './providers/phpbcf-formatter';
import PHPCSDiagnosticProvider from './providers/phpcs-diagnostic';
import PHPStan from './providers/phpstan';
import ServicesCompletionProvider from './providers/services';
import TwigCompletionProvider from './providers/twig-completion';
import DrupalStatusBarItem from './status-bar';

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
    languages.registerCompletionItemProvider(
      GlobalVariablesCompletionProvider.language,
      new GlobalVariablesCompletionProvider(context)
    ),
    languages.registerCompletionItemProvider(
      ServicesCompletionProvider.language,
      new ServicesCompletionProvider(context),
      '"', "'"
    ),
    languages.registerDocumentFormattingEditProvider(
      PHPCBFDocumentFormattingProvider.language,
      new PHPCBFDocumentFormattingProvider(context)
    ),
    new PHPCSDiagnosticProvider(context),
    new PHPStan(context),
    new DrupalStatusBarItem(context),
  );
}

export function deactivate() {}
