import TwigCompletionProvider from './providers/twig-completion-provider';
import HookCompletionProvider from './providers/hook-completion-provider';
import PHPCSDiagnosticProvider from './providers/phpcs-diagnostic-provider';

new PHPCSDiagnosticProvider();
new HookCompletionProvider();
new TwigCompletionProvider();
