import { ExtensionContext, languages } from 'vscode';
import ShowOutputChannel from './commands/show-output-channel';
import GlobalVariablesCompletionProvider from './providers/global-variables';
import HookCompletionProvider from './providers/hook-completion';
import PHPCBFDocumentFormattingProvider from './providers/phpbcf-formatter';
import PHPCSDiagnosticProvider from './providers/phpcs-diagnostic';
import PHPStan from './providers/phpstan';
import RoutingCompletionProvider from './providers/routing';
import ServicesCompletionProvider from './providers/services';
import TwigCompletionProvider from './providers/twig-completion';
import DrupalStatusBar from './base/drupal-status-bar';
import Main from './base/main';

export function activate(context: ExtensionContext) {
  context.subscriptions.push(
    new Main(context),
    // languages.registerCompletionItemProvider(
    //   TwigCompletionProvider.language,
    //   new TwigCompletionProvider(context)
    // ),
    // languages.registerCompletionItemProvider(
    //   HookCompletionProvider.language,
    //   new HookCompletionProvider(context)
    // ),
    // languages.registerCompletionItemProvider(
    //   GlobalVariablesCompletionProvider.language,
    //   new GlobalVariablesCompletionProvider(context)
    // ),
    // languages.registerCompletionItemProvider(
    //   ServicesCompletionProvider.language,
    //   new ServicesCompletionProvider(context),
    //   '"', "'"
    // ),
    // languages.registerCompletionItemProvider(
    //   RoutingCompletionProvider.language,
    //   new RoutingCompletionProvider(context),
    //   '"', "'"
    // ),
    // languages.registerDocumentFormattingEditProvider(
    //   PHPCBFDocumentFormattingProvider.language,
    //   new PHPCBFDocumentFormattingProvider(context)
    // ),
    // new PHPCSDiagnosticProvider(context),
    // new PHPStan(context),
    // new DrupalStatusBar(context),

    // Commands
    // new ShowOutputChannel(),
  );
}

export function deactivate() {}
