import { dirname } from 'path';
import {
  ExtensionContext,
  RelativePattern,
  Uri,
  workspace,
  WorkspaceFolder,
} from 'vscode';
import GlobalVariablesCompletionProvider from '../providers/global-variables';
import Context from './context';
import DrupalCoreModule from './drupal-core-module';

type Tail<T extends any[]> = T extends [head: any, ...tail: infer Tail_]
  ? Tail_
  : never;

export default class DrupalWorkspace extends Context {
  coreModules: DrupalCoreModule[] = [];
  workspaceFolder: WorkspaceFolder;
  globalVariables: GlobalVariablesCompletionProvider;

  constructor(context: ExtensionContext, workspaceFolder: WorkspaceFolder) {
    super(context);

    this.workspaceFolder = workspaceFolder;
    this.globalVariables = new GlobalVariablesCompletionProvider(this);

    this.initDrupalModules();
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
