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
import Relatively from '../mixins/relatively';
import Disposable from '../providers/disposable';
import GlobalVariablesCompletionProvider from '../providers/global-variables';
import HookCompletionProvider from '../providers/hook-completion';
import PHPCBFDocumentFormattingProvider from '../providers/phpbcf-formatter';
import PHPCSDiagnosticProvider from '../providers/phpcs-diagnostic';
import PHPStanDiagnosticProvider from '../providers/phpstan';
import RoutingCompletionProvider from '../providers/routing';
import ServicesCompletionProvider from '../providers/services';
import TwigCompletionProvider from '../providers/twig-completion';
import { FirstParam } from '../types';
import Context from './context';
import DrupalModule from './drupal-module';

const Mix = Relatively(Disposable);

export default class DrupalWorkspace extends Mix {
  customModules: DrupalModule[] = [];
  workspaceFolder: WorkspaceFolder;
  composerWatcher: FileSystemWatcher;
  globalVariables: GlobalVariablesCompletionProvider;
  // coreRoutingCompletionProvider: RoutingCompletionProvider;
  // contribRoutingCompletionProvider: RoutingCompletionProvider;
  // coreHookCompletionProvider: HookCompletionProvider;
  // contribHookCompletionProvider: HookCompletionProvider;
  // coreServicesCompletionProvider: ServicesCompletionProvider;
  // contribServicesCompletionProvider: ServicesCompletionProvider;
  // phpcbf: PHPCBFDocumentFormattingProvider;
  // phpcs: PHPCSDiagnosticProvider;
  // phpstan: PHPStanDiagnosticProvider;
  // twig: TwigCompletionProvider;

  constructor(
    arg: FirstParam<typeof Mix> & { workspaceFolder: WorkspaceFolder }
  ) {
    super(arg);

    this.workspaceFolder = arg.workspaceFolder;
    this.composerWatcher = workspace.createFileSystemWatcher(
      this.getRelativePattern('composer.json')
    );

    this.globalVariables = new GlobalVariablesCompletionProvider({
      drupalWorkspace: this,
      watcher: this.composerWatcher,
      pattern: 'web/core/globals.api.php',
    });
    // this.coreRoutingCompletionProvider = new RoutingCompletionProvider({
    //   drupalWorkspace: this,
    //   watcher: this.composerWatcher,
    //   pattern: 'web/core/modules/*/*.routing.yml',
    // });
    // this.contribRoutingCompletionProvider = new RoutingCompletionProvider({
    //   drupalWorkspace: this,
    //   watcher: this.composerWatcher,
    //   pattern: 'web/modules/contrib/*/*.routing.yml',
    // });
    // this.coreHookCompletionProvider = new HookCompletionProvider({
    //   drupalWorkspace: this,
    //   watcher: this.composerWatcher,
    //   pattern: 'web/{core,core/modules/*}/*.api.php',
    // });
    // this.contribHookCompletionProvider = new HookCompletionProvider({
    //   drupalWorkspace: this,
    //   watcher: this.composerWatcher,
    //   pattern: 'web/modules/contrib/*/*.api.php',
    // });
    // this.coreServicesCompletionProvider = new ServicesCompletionProvider({
    //   drupalWorkspace: this,
    //   watcher: this.composerWatcher,
    //   pattern: 'web/{core,core/modules/*}/*.services.yml',
    // });
    // this.contribServicesCompletionProvider = new ServicesCompletionProvider({
    //   drupalWorkspace: this,
    //   watcher: this.composerWatcher,
    //   pattern: 'web/modules/contrib/*/*.services.yml',
    // });
    // this.phpcbf = new PHPCBFDocumentFormattingProvider({
    //   drupalWorkspace: this,
    //   pattern: '**',
    // });
    // this.phpcs = new PHPCSDiagnosticProvider({
    //   drupalWorkspace: this,
    //   pattern: '*',
    // });
    // this.phpstan = new PHPStanDiagnosticProvider({
    //   drupalWorkspace: this,
    //   pattern: '*',
    // });
    // this.twig = new TwigCompletionProvider({
    //   drupalWorkspace: this,
    //   pattern: '*',
    // });

    this.initDrupalModules();
  }

  // async findFile(include: string): Promise<Uri | undefined> {
  //   const result = await workspace.findFiles(
  //     new RelativePattern(this.workspaceFolder, include),
  //     undefined,
  //     1
  //   );

  //   return result.length ? result[0] : undefined;
  // }

  // async findFiles(
  //   include: string,
  //   ...args: Tail<Parameters<typeof workspace['findFiles']>>
  // ) {
  //   return workspace.findFiles(
  //     new RelativePattern(this.workspaceFolder, include),
  //     ...args
  //   );
  // }

  async initDrupalModules() {
    const customModulesDir = 'web/modules/custom';
    const moduleDirectory = Uri.joinPath(
      this.workspaceFolder.uri,
      customModulesDir
    );
    const result = await workspace.fs.readDirectory(moduleDirectory);

    for (const [name, fileType] of result) {
      if (fileType === FileType.Directory) {
        const uri = Uri.joinPath(
          this.workspaceFolder.uri,
          customModulesDir,
          name
        );
        // this.customModules.push(
        //   new DrupalModule({
        //     drupalWorkspace: this,
        //     context: this.context,
        //     uri,
        //   })
        // );
      }
    }
  }

  isCurrentWorkspace(uri: Uri) {
    return (
      this.drupalWorkspace.workspaceFolder === workspace.getWorkspaceFolder(uri)
    );
  }
}
