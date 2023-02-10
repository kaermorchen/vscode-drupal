import {
  FileSystemWatcher,
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
import getComposerLock from '../utils/get-composer-lock';
import TranslationProvider from '../providers/translation';

export default class DrupalWorkspace extends Disposable {
  workspaceFolder: WorkspaceFolder;
  private drupalVersion?: number;
  private composerLockWatcher: FileSystemWatcher;

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
          'web/{core,core/modules/*,core/lib/Drupal/Core,modules/contrib/*,modules/custom/*}/*.api.php'
        ),
      }),
      new ServicesCompletionProvider({
        drupalWorkspace: this,
        pattern: this.getRelativePattern(
          'web/{core,core/modules/*,modules/contrib/*,modules/custom/*}/*.services.yml'
        ),
      }),
      new TranslationProvider({
        drupalWorkspace: this,
        pattern: this.getRelativePattern(
          'web/modules/custom/**/*.po'
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

    this.composerLockWatcher = workspace.createFileSystemWatcher(
      this.getRelativePattern('composer.lock')
    );
    this.disposables.push(this.composerLockWatcher);
    this.composerLockWatcher.onDidChange(
      () => {
        this.drupalVersion = undefined;
      },
      this,
      this.disposables
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

  async getDrupalVersion(): Promise<number | undefined> {
    if (this.drupalVersion) {
      return this.drupalVersion;
    }

    const lock = await getComposerLock(this.workspaceFolder);

    if (!lock) {
      return;
    }

    for (const item of lock.packages) {
      if (item.name === 'drupal/core') {
        this.drupalVersion = parseInt(item.version);
        break;
      }
    }

    return this.drupalVersion;
  }
}
