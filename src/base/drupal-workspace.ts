import { dirname } from 'path';
import {
  ExtensionContext,
  RelativePattern,
  Uri,
  workspace,
  WorkspaceFolder,
} from 'vscode';
import Context from './context';
import DrupalCoreModule from './drupal-core-module';

type Tail<T extends any[]> = T extends [head: any, ...tail: infer Tail_]
  ? Tail_
  : never;

export default class DrupalWorkspace extends Context {
  coreModules: DrupalCoreModule[] = [];
  workspaceFolder: WorkspaceFolder;

  constructor(context: ExtensionContext, workspaceFolder: WorkspaceFolder) {
    super(context);

    this.workspaceFolder = workspaceFolder;

    this.initDrupalModules();
  }

  findFiles(
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
