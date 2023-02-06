import { dirname } from 'path';
import {
  ExtensionContext,
  FileSystemWatcher,
  FileType,
  RelativePattern,
  Uri,
  workspace,
  WorkspaceFolder,
} from 'vscode';
import GlobalVariablesCompletionProvider from '../providers/global-variables';
import HookCompletionProvider from '../providers/hook-completion';
import PHPCBFDocumentFormattingProvider from '../providers/phpbcf-formatter';
import PHPCSDiagnosticProvider from '../providers/phpcs-diagnostic';
import PHPStanDiagnosticProvider from '../providers/phpstan';
import RoutingCompletionProvider from '../providers/routing';
import ServicesCompletionProvider from '../providers/services';
import TwigCompletionProvider from '../providers/twig-completion';
import { Tail } from '../types';
import Context from './context';
import DrupalModule from './drupal-module';

export default class DrupalWorkspace extends Context {
  customModules: DrupalModule[] = [];
  workspaceFolder: WorkspaceFolder;
  globalVariables: GlobalVariablesCompletionProvider;
  routingCompletionProvider: RoutingCompletionProvider;
  hookCompletionProvider: HookCompletionProvider;
  servicesCompletionProvider: ServicesCompletionProvider;
  phpcbf: PHPCBFDocumentFormattingProvider;
  phpcs: PHPCSDiagnosticProvider;
  phpstan: PHPStanDiagnosticProvider;
  twig: TwigCompletionProvider;

  constructor(context: ExtensionContext, workspaceFolder: WorkspaceFolder) {
    super(context);

    this.workspaceFolder = workspaceFolder;

    this.globalVariables = new GlobalVariablesCompletionProvider({
      drupalWorkspace: this,
      pattern: 'web/core/globals.api.php',
    });
    this.routingCompletionProvider = new RoutingCompletionProvider({
      drupalWorkspace: this,
      pattern:
        'web/{core/modules,modules/contrib,modules/custom}/*/*.routing.yml',
    });
    this.hookCompletionProvider = new HookCompletionProvider({
      drupalWorkspace: this,
      pattern:
        'web/{core,core/modules/*,modules/contrib/*,modules/custom/*}/*.api.php',
    });
    this.servicesCompletionProvider = new ServicesCompletionProvider({
      drupalWorkspace: this,
      pattern:
        'web/{core,core/modules/*,modules/contrib/*,modules/custom/*}/*.services.yml',
    });
    this.twig = new TwigCompletionProvider({
      drupalWorkspace: this,
      pattern: '*',
    });
    this.phpcbf = new PHPCBFDocumentFormattingProvider({
      drupalWorkspace: this,
      pattern: '**',
    });
    this.phpcs = new PHPCSDiagnosticProvider({
      drupalWorkspace: this,
      pattern: '*',
    });

    this.phpstan = new PHPStanDiagnosticProvider({
      drupalWorkspace: this,
      pattern: '*',
    });

  }

  hasFile(uri: Uri) {
    return this.workspaceFolder === workspace.getWorkspaceFolder(uri);
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

  // async initDrupalModules() {
  //   const customModulesDir = 'web/modules/custom';
  //   const moduleDirectory = Uri.joinPath(
  //     this.workspaceFolder.uri,
  //     customModulesDir
  //   );
  //   const result = await workspace.fs.readDirectory(moduleDirectory);

  //   for (const [name, fileType] of result) {
  //     if (fileType === FileType.Directory) {
  //       const uri = Uri.joinPath(
  //         this.workspaceFolder.uri,
  //         customModulesDir,
  //         name
  //       );
  //       this.customModules.push(
  //         new DrupalModule({
  //           drupalWorkspace: this,
  //           context: this.context,
  //           uri,
  //         })
  //       );
  //     }
  //   }
  // }
}
