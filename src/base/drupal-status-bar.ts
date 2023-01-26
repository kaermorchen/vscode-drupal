import {
  ExtensionContext,
  StatusBarAlignment,
  StatusBarItem,
  window,
  workspace,
} from 'vscode';
import ShowOutputChannel from '../commands/show-output-channel';
import getWorkspaceFolders from '../utils/get-workspace-folders';
import Context from './context';

export default class DrupalStatusBar extends Context {
  statusBarItem: StatusBarItem;

  constructor(context: ExtensionContext) {
    super(context);

    this.statusBarItem = window.createStatusBarItem(
      'drupal',
      StatusBarAlignment.Right,
      100
    );
    this.statusBarItem.name = 'Drupal';
    this.statusBarItem.command = ShowOutputChannel.id;
    this.statusBarItem.text = `$(drupal-logo) Drupal`;
    this.disposables.push(this.statusBarItem);

    this.checkDrupalWorkspace();

    return this;
  }

  async checkDrupalWorkspace() {
    const workspaceFolders = getWorkspaceFolders();

    for (const workspaceFolder of workspaceFolders) {
      const composerUri = await workspace.findFiles('composer.json', null, 1);

      if (composerUri.length === 0) {
        continue;
      }

      const composer = await workspace.fs
        .readFile(composerUri[0])
        .then((value) => value.toString())
        .then((value) => JSON.parse(value));

      if ('drupal/core-recommended' in composer.require) {
        await this.context.workspaceState.update('drupal', true);
        break;
      }
    }

    if (this.context.workspaceState.get('drupal')) {
      this.statusBarItem.show();
    }
  }
}
