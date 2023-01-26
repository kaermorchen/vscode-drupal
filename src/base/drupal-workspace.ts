import { dirname } from 'path';
import {
  ExtensionContext,
  FileSystemWatcher,
  RelativePattern,
  Uri,
  workspace,
  WorkspaceFolder,
} from 'vscode';
import GlobalVariablesCompletionProvider from '../providers/global-variables';
import PHPCBFDocumentFormattingProvider from '../providers/phpbcf-formatter';
import PHPCSDiagnosticProvider from '../providers/phpcs-diagnostic';
import RoutingCompletionProvider from '../providers/routing';
import Context from './context';
import DrupalCoreModule from './drupal-core-module';

type Tail<T extends any[]> = T extends [head: any, ...tail: infer Tail_]
  ? Tail_
  : never;

export default class DrupalWorkspace extends Context {
  coreModules: DrupalCoreModule[] = [];
  workspaceFolder: WorkspaceFolder;
  composerWatcher: FileSystemWatcher;
  globalVariables: GlobalVariablesCompletionProvider;
  coreRoutingCompletionProvider: RoutingCompletionProvider;
  contribRoutingCompletionProvider: RoutingCompletionProvider;
  phpcbf: PHPCBFDocumentFormattingProvider;
  phpcs: PHPCSDiagnosticProvider;

  constructor(context: ExtensionContext, workspaceFolder: WorkspaceFolder) {
    super(context);

    this.workspaceFolder = workspaceFolder;
    this.composerWatcher = workspace.createFileSystemWatcher(
      this.getRelativePattern('composer.json')
    );
    this.globalVariables = new GlobalVariablesCompletionProvider(this);
    this.coreRoutingCompletionProvider = new RoutingCompletionProvider(
      this,
      'web/core/modules/*/*.routing.yml'
    );
    this.contribRoutingCompletionProvider = new RoutingCompletionProvider(
      this,
      'web/modules/contrib/*/*.routing.yml'
    );
    this.phpcbf = new PHPCBFDocumentFormattingProvider(this);
    this.phpcs = new PHPCSDiagnosticProvider(this);

    this.disposables.push(
      this.composerWatcher,
      this.globalVariables,
      this.coreRoutingCompletionProvider,
      this.contribRoutingCompletionProvider,
      this.phpcbf,
      this.phpcs
    );

    this.initDrupalModules();
  }

  getRelativePattern(include: string): RelativePattern {
    return new RelativePattern(this.workspaceFolder, include);
  }

  async findFile(include: string): Promise<Uri | undefined> {
    const result = await workspace.findFiles(
      new RelativePattern(this.workspaceFolder, include),
      undefined,
      1
    );

    return result.length ? result[0] : undefined;
  }

  async findFiles(
    include: string,
    ...args: Tail<Parameters<typeof workspace['findFiles']>>
  ) {
    return workspace.findFiles(
      new RelativePattern(this.workspaceFolder, include),
      ...args
    );
  }

  async initDrupalModules() {
    const coreUris = await this.findFiles('web/core/modules/*/*.info.yml');

    for (const uri of coreUris) {
      const dirUri = Uri.parse(dirname(uri.toString()));

      this.coreModules.push(
        new DrupalCoreModule({ context: this.context, uri: dirUri })
      );
    }
  }
}
