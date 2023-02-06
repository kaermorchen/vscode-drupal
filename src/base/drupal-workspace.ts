import {
  GlobPattern,
  RelativePattern,
  Uri,
  workspace,
  WorkspaceFolder,
} from 'vscode';
import Disposable from './disposable';
import GlobalVariablesCompletionProvider from '../providers/global-variables';
import HookCompletionProvider from '../providers/hook-completion';
import PHPCBFDocumentFormattingProvider from '../providers/phpbcf-formatter';
import PHPCSDiagnosticProvider from '../providers/phpcs-diagnostic';
import PHPStanDiagnosticProvider from '../providers/phpstan';
import RoutingCompletionProvider from '../providers/routing';
import ServicesCompletionProvider from '../providers/services';
import TwigCompletionProvider from '../providers/twig-completion';
import { Tail } from '../types';

export default class DrupalWorkspace extends Disposable {
  workspaceFolder: WorkspaceFolder;

  constructor(workspaceFolder: WorkspaceFolder) {
    super();

    this.workspaceFolder = workspaceFolder;

    this.disposables.push(
      new GlobalVariablesCompletionProvider({
        drupalWorkspace: this,
        pattern: this.getRelativePattern('web/core/globals.api.php'),
      }),
      new RoutingCompletionProvider({
        drupalWorkspace: this,
        pattern: this.getRelativePattern(
          'web/{core/modules,modules/contrib,modules/custom}/*/*.routing.yml'
        ),
      }),
      new HookCompletionProvider({
        drupalWorkspace: this,
        pattern: this.getRelativePattern(
          'web/{core,core/modules/*,modules/contrib/*,modules/custom/*}/*.api.php'
        ),
      }),
      new ServicesCompletionProvider({
        drupalWorkspace: this,
        pattern: this.getRelativePattern(
          'web/{core,core/modules/*,modules/contrib/*,modules/custom/*}/*.services.yml'
        ),
      }),
      new TwigCompletionProvider({
        drupalWorkspace: this,
      }),
      new PHPCBFDocumentFormattingProvider({
        drupalWorkspace: this,
      }),
      new PHPCSDiagnosticProvider({
        drupalWorkspace: this,
      }),
      new PHPStanDiagnosticProvider({
        drupalWorkspace: this,
      })
    );
  }

  hasFile(uri: Uri) {
    return this.workspaceFolder === workspace.getWorkspaceFolder(uri);
  }

  getRelativePattern(include: string): RelativePattern {
    return new RelativePattern(this.workspaceFolder, include);
  }

  async findFile(include: GlobPattern): Promise<Uri | undefined> {
    const result = await workspace.findFiles(include, undefined, 1);

    return result.length ? result[0] : undefined;
  }

  async findFiles(
    include: GlobPattern,
    ...args: Tail<Parameters<typeof workspace['findFiles']>>
  ) {
    return workspace.findFiles(include, ...args);
  }
}
