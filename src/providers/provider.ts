import Disposable from './disposable';

import { ExtensionContext, workspace, WorkspaceConfiguration } from 'vscode';

export default class Provider extends Disposable {
  readonly context: ExtensionContext;

  constructor(context: ExtensionContext) {
    super();

    this.context = context;
  }

  get name(): string {
    throw new Error('Getter name not implemented.');
  }

  get config(): WorkspaceConfiguration {
    return workspace.getConfiguration(this.configName);
  }

  get configName(): string {
    return `drupal.${this.name}`;
  }

  get source() {
    return `Drupal: ${this.name}`;
  }

  async getWorkspacePath(): Promise<string | undefined> {
    const workspaceFolders = workspace.workspaceFolders;

    if (typeof workspaceFolders === 'undefined') {
      return;
    }

    // TODO: which workspaces is current?
    return workspaceFolders[0].uri.path;
  }
}
